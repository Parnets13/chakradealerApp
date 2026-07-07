@echo off
echo ========================================
echo   Chakra Dealer App - Gradle Fix Script
echo   Run this as ADMINISTRATOR
echo ========================================
echo.

echo [1/3] Enabling Windows Long Path Support...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
if %errorlevel% == 0 (
    echo       Long paths ENABLED!
) else (
    echo       Failed - please run as Administrator
)

echo.
echo [2/3] Clearing Gradle caches...
if exist "%USERPROFILE%\.gradle\caches" (
    rmdir /s /q "%USERPROFILE%\.gradle\caches"
    echo       Global Gradle cache cleared
)
if exist "%USERPROFILE%\.gradle\wrapper\dists\gradle-9.3.1-bin" (
    rmdir /s /q "%USERPROFILE%\.gradle\wrapper\dists\gradle-9.3.1-bin"
    echo       Gradle 9.3.1 distribution removed
)
if exist "android\.gradle" (
    rmdir /s /q "android\.gradle"
    echo       Local .gradle cleared
)
if exist "android\app\build" (
    rmdir /s /q "android\app\build"
    echo       app\build cleared
)
if exist "android\build" (
    rmdir /s /q "android\build"
    echo       android\build cleared
)

echo.
echo [3/3] Done! Now run:
echo       npx react-native run-android
echo.
echo ========================================
pause
