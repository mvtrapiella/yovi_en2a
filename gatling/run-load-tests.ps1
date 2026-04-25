# Run Gatling load tests via Docker.
# The users service must already be running on port 3000.
#
# Usage:
#   .\run-load-tests.ps1                          # run all simulations
#   .\run-load-tests.ps1 BaselineSimulation       # run one simulation
#   .\run-load-tests.ps1 AuthSimulation http://localhost:3000
#
param(
    [string]$Simulation = "",
    [string]$BaseUrl    = "http://host.docker.internal:3000"
)

$ResultsDir = Join-Path $PSScriptRoot "results"
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

$SimArg = if ($Simulation) { "-Dgatling.simulationClass=simulations.$Simulation" } else { "" }

docker build -t yovi-gatling $PSScriptRoot

docker run --rm `
    -v "${ResultsDir}:/gatling/target/gatling" `
    yovi-gatling `
    $SimArg "-DbaseUrl=$BaseUrl"

Write-Host ""
Write-Host "Results saved to: $ResultsDir"
