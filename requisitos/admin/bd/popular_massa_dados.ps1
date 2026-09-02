# Reset completo pra reproduzir o estado "duas jornadas publicadas" em qualquer ambiente:
# 1) checa se admin/back, ms-transform-publication e ms-runtime-camunda estao todos no ar —
#    para com erro claro se algum nao estiver (nao tenta subir nada por conta propria alem do
#    ms-runtime-camunda no passo 2, que este script derruba de proposito);
# 2) zera o Camunda: mata o ms-runtime-camunda, apaga o H2 dele, sobe ele de novo (mvnw
#    spring-boot:run em background) e espera a porta voltar — sem isso o BPMN de uma jornada
#    antiga fica "fantasma" no engine, publicada no admin mas ausente do Camunda ou vice-versa
#    (foi exatamente o que aconteceu depois da massa anterior: o restore so recriava o
#    Postgres, nunca o Camunda, entao cada jornada tinha que ser republicada manualmente —
#    ver REQ/ajuste 2026-09-01);
# 3) repopula o Postgres com massa_de_dados_journeys.sql (so a versao PUBLICADA de cada
#    jornada, nao o historico de rascunhos);
# 4) publica cada jornada de verdade via API real do admin/back (POST /journeys/{id}/publish),
#    o que gera o BPMN e implanta no Camunda ja zerado.
$ErrorActionPreference = 'Stop'

$PGHOST = 'localhost'
$PGPORT = '5432'
$PGUSER = 'postgres'
$env:PGPASSWORD = 'postgres'
# Sem isso o psql, quando chamado de dentro do PowerShell 5.1, negocia um client_encoding errado
# com o Postgres (o console do PowerShell nao forca UTF-8 por padrao) e corrompe acentos (ex.:
# "Ativacao" vira "AtivaÃ§Ã£o") mesmo o arquivo .sql sendo UTF-8 de verdade.
$env:PGCLIENTENCODING = 'UTF8'
$PGDATABASE = 'journey_admin'

$ApiBase = 'http://localhost:8081/api/v1'
$ApiUser = 'admin'
$ApiPass = 'admin'
$CamundaPort = 8080
$TransformPort = 8082
$CamundaRestartTimeoutSeconds = 180

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir 'massa_de_dados_journeys.sql'
$CamundaDir = Join-Path $ScriptDir '..\..\..\simulacoes\ms-runtime-camunda'
$CamundaH2Dir = Join-Path $CamundaDir 'camunda-h2-default'

function Find-PgTool([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$Name.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1
  if ($found) { return $found.FullName }
  Write-Error "$Name nao encontrado no PATH nem em C:\Program Files\PostgreSQL\*\bin. Instale o cliente PostgreSQL ou ajuste este script."
  exit 1
}
$Psql = Find-PgTool 'psql'

function Test-Port([int]$Port) {
  return (Test-NetConnection -ComputerName 'localhost' -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
}

Write-Host "Este script vai, nesta ordem:"
Write-Host "  1. Checar se admin/back (8081), ms-transform-publication ($TransformPort) e"
Write-Host "     ms-runtime-camunda ($CamundaPort) estao no ar - para com erro se algum nao estiver."
Write-Host "  2. Derrubar o ms-runtime-camunda, apagar o H2 dele (zerando o Camunda), subi-lo de novo"
Write-Host "     e criar o usuario padrao do Camunda (demo/demo)."
Write-Host "  3. Apagar e repopular o banco Postgres `"$PGDATABASE`" com massa_de_dados_journeys.sql."
Write-Host "  4. Publicar, via API do admin/back, cada jornada que ficar com status PUBLISHED nesse SQL."
Write-Host ""
$confirm = Read-Host "Confirma? [y/N]"
if ($confirm -notmatch '^[yY]') {
  Write-Host "Cancelado."
  exit 0
}
Write-Host ""

Write-Host "1/4 Checando se a stack necessaria esta no ar ..."
$missing = @()
if (-not (Test-Port $TransformPort)) { $missing += "ms-transform-publication(porta $TransformPort)" }
if (-not (Test-Port $CamundaPort)) { $missing += "ms-runtime-camunda(porta $CamundaPort)" }
if (-not (Test-Port 8081)) { $missing += "admin/back(porta 8081)" }
if ($missing.Count -gt 0) {
  Write-Error "Os seguintes servicos nao estao no ar: $($missing -join ', '). Suba a stack (ex.: start-all.bat) e rode este script de novo."
  exit 1
}
Write-Host "Stack no ar."

Write-Host ''
Write-Host "2/4 Zerando o Camunda (porta $CamundaPort) ..."
$conn = Get-NetTCPConnection -LocalPort $CamundaPort -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $procId = ($conn | Select-Object -First 1 -ExpandProperty OwningProcess)
  Write-Host "  Encerrando processo $procId (ms-runtime-camunda) ..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
if (Test-Path $CamundaH2Dir) {
  Remove-Item (Join-Path $CamundaH2Dir 'process-engine.*') -Force -ErrorAction SilentlyContinue
  Write-Host "  H2 do Camunda apagado ($CamundaH2Dir)."
}
Write-Host "  Subindo o ms-runtime-camunda de novo (H2 novo) ..."
Start-Process -FilePath (Join-Path $CamundaDir 'mvnw.cmd') -ArgumentList 'spring-boot:run' -WorkingDirectory $CamundaDir -WindowStyle Hidden
# A partir daqui o script e quem esta segurando o ms-runtime-camunda no ar — os outros servicos
# (admin/back, ms-transform-publication) ja estavam de pe antes do script e continuam sendo
# responsabilidade de quem os subiu, nao deste script.
$ScriptStartedCamunda = $true
function Stop-CamundaStartedByScript {
  if (-not $ScriptStartedCamunda) { return }
  $conn = Get-NetTCPConnection -LocalPort $CamundaPort -State Listen -ErrorAction SilentlyContinue
  if (-not $conn) { return }
  $procId = ($conn | Select-Object -First 1 -ExpandProperty OwningProcess)
  Write-Host ''
  Write-Host "Encerrando o ms-runtime-camunda que este script subiu (porta $CamundaPort) ..."
  # taskkill sem /F falha nesse processo ("finalizacao so pode ser forcada, use /F") porque o
  # java.exe spawnado pelo mvnw.cmd nao tem uma janela pra fechar graciosamente — entao a saida e
  # dar folga ANTES do kill forcado: o H2 do Camunda tem ate 500ms de write-delay por padrao, e
  # sem essa espera a ultima escrita commitada (o publish que acabou de rodar) some do H2 no
  # proximo restart, mesmo o kill em si sendo inevitavel aqui.
  Start-Sleep -Seconds 2
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}
function Exit-WithCleanup([int]$Code) {
  Stop-CamundaStartedByScript
  exit $Code
}
$waited = 0
while (-not (Test-Port $CamundaPort)) {
  $waited += 2
  if ($waited -ge $CamundaRestartTimeoutSeconds) {
    Write-Error "ms-runtime-camunda nao voltou na porta $CamundaPort apos $CamundaRestartTimeoutSeconds`s."
    Exit-WithCleanup 1
  }
  Start-Sleep -Seconds 2
}
Write-Host "  ms-runtime-camunda no ar de novo."

Write-Host "  Criando usuario padrao do Camunda (demo/demo) ..."
$CamundaRest = "http://localhost:$CamundaPort/engine-rest"
try {
  Invoke-RestMethod -Method Get -Uri "$CamundaRest/user/demo/profile" | Out-Null
  Write-Host "  Usuario demo ja existe, seguindo."
} catch {
  try {
    $userBody = @{
      profile = @{ id = 'demo'; firstName = 'Demo'; lastName = 'Demo'; email = 'demo@localhost' }
      credentials = @{ password = 'demo' }
    } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$CamundaRest/user/create" -ContentType 'application/json' -Body $userBody | Out-Null
    $groupBody = @{ id = 'camunda-admin'; name = 'camunda-admin'; type = 'WORKFLOW' } | ConvertTo-Json
    try { Invoke-RestMethod -Method Post -Uri "$CamundaRest/group/create" -ContentType 'application/json' -Body $groupBody | Out-Null } catch {}
    Invoke-RestMethod -Method Put -Uri "$CamundaRest/group/camunda-admin/members/demo" | Out-Null
    Write-Host "  Usuario demo/demo criado (grupo camunda-admin)."
  } catch {
    Write-Error "Falha ao criar o usuario demo no Camunda: $_"
    Exit-WithCleanup 1
  }
}

Write-Host ''
Write-Host "3/4 Limpando e populando `"$PGDATABASE`" ($PGHOST`:$PGPORT) com `"$SqlFile`" ..."
& $Psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -v ON_ERROR_STOP=1 -f $SqlFile
if ($LASTEXITCODE -ne 0) { Write-Error 'Falha ao executar o script SQL.'; Exit-WithCleanup 1 }
Write-Host 'Massa de dados populada.'

Write-Host ''
Write-Host "4/4 Publicando as jornadas via API real do admin/back ..."
Write-Host "Autenticando em $ApiBase ..."
try {
  $loginBody = @{ username = $ApiUser; password = $ApiPass } | ConvertTo-Json
  $loginResponse = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -ContentType 'application/json' -Body $loginBody
} catch {
  Write-Error "Nao foi possivel autenticar no admin/back ($ApiBase): $_"
  Exit-WithCleanup 1
}
$Token = $loginResponse.token
if (-not $Token) {
  Write-Error "Nao foi possivel extrair o token de autenticacao da resposta."
  Exit-WithCleanup 1
}

# POST /journeys/{id}/publish (o atalho generico) SEMPRE cria uma versao DRAFT nova a partir do
# "flow" atual e publica ela — reusar isso aqui faria version_number subir a cada execucao deste
# script (foi o que aconteceu: v1 virava v2, v3...). O endpoint de versao usado abaixo
# (/versions/{versionId}/republish) exige a versao em UNPUBLISHED (e por isso o SQL semeia assim)
# e republica o MESMO version_id/version_number, sem criar nada novo.
$rowsRaw = & $Psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -A -c "SELECT journey_id || ' ' || version_id FROM journey_version WHERE version_status = 'UNPUBLISHED';"
$Rows = $rowsRaw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$Ok = 0
$Fail = 0
foreach ($Row in $Rows) {
  $parts = $Row -split '\s+'
  $JourneyId = $parts[0]
  $VersionId = $parts[1]
  try {
    Invoke-RestMethod -Method Post -Uri "$ApiBase/journeys/$JourneyId/versions/$VersionId/republish" -Headers @{ Authorization = "Bearer $Token" } | Out-Null
    $Ok++
    Write-Host "  Publicada $JourneyId (versao $VersionId)"
  } catch {
    $Fail++
    Write-Host "  Falha ao publicar $JourneyId`: $_"
  }
}

Write-Host ''
Write-Host "Publicadas: $Ok   Falharam: $Fail   Total: $($Ok + $Fail)"
if ($Fail -gt 0) { Exit-WithCleanup 1 }
Exit-WithCleanup 0
