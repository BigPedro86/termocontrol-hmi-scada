# Script para empacotar o projeto TermoControl HMI/SCADA, ignorando arquivos sensíveis e de build

Write-Host "Empacotando projeto TermoControl..." -ForegroundColor Cyan

$DateStr = Get-Date -Format "yyyyMMdd"
$ZipName = "termocontrol_hmi_scada_$DateStr.zip"

# Remove zip anterior se existir
if (Test-Path $ZipName) {
    Remove-Item $ZipName -Force
}

$ExcludeList = @(
    "node_modules", "dist", "dist-ssr", ".env", ".env.*", "data",
    "server\data", "firmware\.pio", "*.db", "*.db-shm", "*.db-wal", "*.bak",
    ".git", ".vscode", ".idea", "*.zip"
)

# Precisamos do exclude complexo no powershell Compress-Archive ou via Get-ChildItem
$FilesToZip = Get-ChildItem -Path . -Recurse -Force | Where-Object {
    $item = $_
    $exclude = $false
    foreach ($pattern in $ExcludeList) {
        # Se contiver a pasta ou bater o nome do arquivo
        if ($item.FullName -match "\\$pattern\\" -or $item.FullName -match "\\$pattern$" -or $item.Name -like $pattern) {
            # não exclui .env.example
            if ($item.Name -eq ".env.example") {
                $exclude = $false
            } else {
                $exclude = $true
                break
            }
        }
    }
    -not $exclude
}

Compress-Archive -Path $FilesToZip.FullName -DestinationPath $ZipName -Force

Write-Host "Pacote criado: $ZipName" -ForegroundColor Green
