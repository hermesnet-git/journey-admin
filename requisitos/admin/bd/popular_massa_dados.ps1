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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir 'massa_de_dados_journeys.sql'

$Psql = $null
$cmd = Get-Command psql -ErrorAction SilentlyContinue
if ($cmd) { $Psql = $cmd.Source }
if (-not $Psql) {
  $found = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Select-Object -Last 1
  if ($found) { $Psql = $found.FullName }
}
if (-not $Psql) {
  Write-Error 'psql nao encontrado no PATH nem em C:\Program Files\PostgreSQL\*\bin. Instale o cliente PostgreSQL ou ajuste este script.'
  exit 1
}

Write-Host "Limpando e populando `"$PGDATABASE`" ($PGHOST`:$PGPORT) com `"$SqlFile`" ..."
& $Psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -v ON_ERROR_STOP=1 -f $SqlFile
if ($LASTEXITCODE -ne 0) {
  Write-Error 'Falha ao executar o script SQL.'
  exit 1
}
Write-Host 'Massa de dados populada.'

Write-Host ''
Write-Host "Autenticando em $ApiBase ..."
try {
  $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -ContentType 'application/json' `
    -Body (@{ username = $ApiUser; password = $ApiPass } | ConvertTo-Json)
} catch {
  Write-Error "Nao foi possivel autenticar no admin/back ($ApiBase) - ele esta rodando? $($_.Exception.Message)"
  exit 1
}
$headers = @{ Authorization = "Bearer $($login.token)" }

Write-Host 'Publicando todas as jornadas via API...'
$ids = & $Psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -A -c 'SELECT journey_id FROM journey;'
$ids = $ids | Where-Object { $_.Trim() -ne '' }

$ok = 0
$fail = 0
foreach ($id in $ids) {
  $id = $id.Trim()
  try {
    Invoke-RestMethod -Method Post -Uri "$ApiBase/journeys/$id/publish" -Headers $headers | Out-Null
    $ok++
  } catch {
    $fail++
    Write-Host "  Falha ao publicar $id`: $($_.Exception.Message)"
  }
}

Write-Host ''
Write-Host "Publicadas: $ok   Falharam: $fail   Total: $($ids.Count)"
if ($fail -gt 0) { exit 1 }
