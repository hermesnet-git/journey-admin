$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$OutputEncoding = [Text.UTF8Encoding]::new()

$pgHostFactory = 'localhost'
$pgPortFactory = '5432'
$pgUserFactory = 'postgres'
$adminDatabase = 'journey_admin'
$strapiDatabase = 'strapi_sdui_registry'
$env:PGPASSWORD = 'postgres'
$env:PGCLIENTENCODING = 'UTF8'
$adminApi = 'http://localhost:8081/api/v1'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$factorySql = Join-Path $scriptDirectory 'massa_de_dados_journeys.sql'
$runtimeDirectory = Join-Path $scriptDirectory '..\..\..\simulacoes\ms-runtime-camunda'
$runtimeDataDirectory = Join-Path $runtimeDirectory 'camunda-h2-default'

function Find-Psql {
  $command = Get-Command psql -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $found = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName | Select-Object -Last 1
  if ($found) { return $found.FullName }
  throw 'psql não foi encontrado. Instale o cliente PostgreSQL ou inclua-o no PATH.'
}

function Test-ServicePort([int]$port) {
  Test-NetConnection localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
}

function Invoke-FactoryPsql([string]$database, [string[]]$arguments) {
  & $psql -h $pgHostFactory -p $pgPortFactory -U $pgUserFactory -d $database @arguments
  if ($LASTEXITCODE -ne 0) { throw "Falha ao executar psql no banco $database." }
}

if (-not (Test-Path $factorySql)) { throw "Massa não encontrada: $factorySql" }
$psql = Find-Psql

Write-Host 'MARCO ZERO — instalação de fábrica do Elastic Journey'
Write-Host 'O processo substituirá os dados atuais do Admin, Strapi e runtime-engine.'
$confirmation = Read-Host 'Confirma? [s/N]'
if ($confirmation -notmatch '^[sS]') { Write-Host 'Operação cancelada.'; exit 0 }

Write-Host '1/5 Validando serviços...'
$missing = @()
@(
  @{ Name = 'runtime-engine'; Port = 8080 },
  @{ Name = 'admin/back'; Port = 8081 },
  @{ Name = 'ms-transform-publication'; Port = 8082 },
  @{ Name = 'ms-spec-registry'; Port = 8083 }
) | ForEach-Object {
  if (-not (Test-ServicePort $_.Port)) { $missing += "$($_.Name) (porta $($_.Port))" }
}
if ($missing.Count -gt 0) { throw "Serviços indisponíveis: $($missing -join ', ')." }

Write-Host '2/5 Reinicializando o runtime-engine...'
$connection = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force; Start-Sleep -Seconds 2 }
if (Test-Path $runtimeDataDirectory) {
  Get-ChildItem $runtimeDataDirectory -Filter 'process-engine.*' -File -ErrorAction SilentlyContinue | Remove-Item -Force
}
Start-Process -FilePath (Join-Path $runtimeDirectory 'mvnw.cmd') -ArgumentList '-q','spring-boot:run' `
  -WorkingDirectory $runtimeDirectory -WindowStyle Hidden
$elapsed = 0
while (-not (Test-ServicePort 8080)) {
  if ($elapsed -ge 180) { throw 'O runtime-engine não iniciou após 180 segundos.' }
  Start-Sleep -Seconds 2
  $elapsed += 2
}

Write-Host '3/5 Verificando snapshots do Strapi...'
if (Test-ServicePort 1337) {
  Invoke-FactoryPsql $strapiDatabase @('-v','ON_ERROR_STOP=1','-c','TRUNCATE TABLE sdui_snapshots RESTART IDENTITY CASCADE;')
  Write-Host 'Snapshots do Strapi removidos.'
} else {
  Write-Host 'Strapi não configurado ou indisponível; limpeza ignorada.'
}

Write-Host '4/5 Restaurando a massa funcional do Admin...'
Invoke-FactoryPsql $adminDatabase @('-v','ON_ERROR_STOP=1','-f',$factorySql)

Write-Host '5/5 Republicando versões pelas APIs oficiais...'
$loginBody = @{ username = 'admin'; password = 'admin' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$adminApi/auth/login" -ContentType 'application/json' -Body $loginBody
if (-not $login.token) { throw 'O Admin não retornou o token de autenticação.' }
$headers = @{ Authorization = "Bearer $($login.token)" }
$rows = & $psql -h $pgHostFactory -p $pgPortFactory -U $pgUserFactory -d $adminDatabase -t -A -F '|' `
  -c "SELECT journey_id,version_id FROM journey_version WHERE version_status='UNPUBLISHED' ORDER BY journey_id,version_number;"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar as versões.' }
$published = 0
foreach ($row in $rows) {
  if ([string]::IsNullOrWhiteSpace($row)) { continue }
  $journeyId, $versionId = $row.Trim() -split '\|', 2
  Invoke-RestMethod -Method Post -Uri "$adminApi/journeys/$journeyId/versions/$versionId/republish" -Headers $headers | Out-Null
  $published++
}
$pending = & $psql -h $pgHostFactory -p $pgPortFactory -U $pgUserFactory -d $adminDatabase -t -A `
  -c "SELECT count(*) FROM journey_version WHERE version_status<>'PUBLISHED';"
if ($LASTEXITCODE -ne 0 -or [int]$pending -ne 0) { throw 'Há versões que não foram publicadas.' }

Write-Host "Marco zero instalado com sucesso. Versões publicadas: $published."
Write-Host 'O runtime-engine permanece em execução.'
