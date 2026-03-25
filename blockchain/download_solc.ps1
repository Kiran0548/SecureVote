$cacheDir = "$env:LOCALAPPDATA\hardhat-nodejs\Cache\compilers\windows-amd64"
New-Item -ItemType Directory -Force -Path $cacheDir
Invoke-WebRequest -Uri "https://binaries.soliditylang.org/windows-amd64/list.json" -OutFile "$cacheDir\list.json" -UseBasicParsing
Invoke-WebRequest -Uri "https://binaries.soliditylang.org/windows-amd64/solc-windows-amd64-v0.8.24+commit.e11b9ed9.exe" -OutFile "$cacheDir\solc-windows-amd64-v0.8.24+commit.e11b9ed9.exe" -UseBasicParsing
Write-Host "Download complete"
