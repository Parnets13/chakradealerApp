Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Chakra Industries Dealer App - Fix & Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear corrupt Gradle transforms cache
Write-Host "[1/4] Clearing corrupt Gradle transforms cache..." -ForegroundColor Yellow
$transformsPath = "$env:USERPROFILE\.gradle\caches\9.3.1\transforms"
if (Test-Path $transformsPath) {
    Remove-Item -Recurse -Force $transformsPath
    Write-Host "      Done - transforms cache cleared" -ForegroundColor Green
} else {
    Write-Host "      Skipped - transforms cache not found (already clean)" -ForegroundColor Gray
}

# Also clear the broader modules cache that can cause issues
$modulesPath = "$env:USERPROFILE\.gradle\caches\modules-*"
$modulePaths = Get-Item $modulesPath -ErrorAction SilentlyContinue
if ($modulePaths) {
    Write-Host "      Clearing modules cache too..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $modulePaths
    Write-Host "      Done - modules cache cleared" -ForegroundColor Green
}

# Step 2: Clean Android build
Write-Host ""
Write-Host "[2/4] Cleaning Android build output..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\android"
& .\gradlew.bat clean 2>&1 | Where-Object { $_ -match "BUILD|FAILED|ERROR|warning" }
if ($LASTEXITCODE -eq 0) {
    Write-Host "      Done - Android build cleaned" -ForegroundColor Green
} else {
    Write-Host "      Warning: gradlew clean had issues, continuing anyway..." -ForegroundColor Yellow
}

# Step 3: Go back to project root
Set-Location $PSScriptRoot

# Step 4: Instructions
Write-Host ""
Write-Host "[3/4] Cache cleared and build cleaned successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[4/4] Now run this command to start the app:" -ForegroundColor White
Write-Host ""
Write-Host "   npx react-native run-android" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "TIP: To prevent this error permanently, add these folders" -ForegroundColor Gray
Write-Host "     to Windows Defender exclusions:" -ForegroundColor Gray
Write-Host "     - $env:USERPROFILE\.gradle" -ForegroundColor Gray
Write-Host "     - $PSScriptRoot\android\.gradle" -ForegroundColor Gray
