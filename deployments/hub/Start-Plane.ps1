param([string]$Distribution = 'Ubuntu-24.04')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$scratch = Join-Path $projectRoot '_tmp'
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
$pidPath = Join-Path $scratch 'plane-wsl-keeper.pid'
$running = $false
if (Test-Path -LiteralPath $pidPath) {
    $keeperId = [int](Get-Content -LiteralPath $pidPath)
    $keeper = Get-CimInstance Win32_Process -Filter "ProcessId=$keeperId" -ErrorAction SilentlyContinue
    $running = $keeper -and $keeper.Name -eq 'wsl.exe' -and $keeper.CommandLine.Contains('sleep infinity')
}
if (-not $running) {
    $keeper = Start-Process -FilePath 'wsl.exe' -ArgumentList @('-d',$Distribution,'-u','root','--exec','sleep','infinity') -WindowStyle Hidden -PassThru
    $keeper.Id | Set-Content -LiteralPath $pidPath
}
& wsl.exe -d $Distribution -u root --exec systemctl start docker
& wsl.exe -d $Distribution -u root --cd /opt/plane-hub --exec docker compose --project-name plane-hub --env-file plane.env -f compose.yml -f compose.local.yml up -d
if ($LASTEXITCODE -ne 0) { throw 'Plane startup failed; inspect the container logs.' }
& wsl.exe -d $Distribution -u root --exec grep '^WEB_URL=' /opt/plane-hub/plane.env
