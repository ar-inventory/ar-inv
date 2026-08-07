@echo off
title Inventory App — Preview Build
color 0B

echo.
echo  ==========================================
echo   Inventory App — Preview Production Build
echo  ==========================================
echo.
echo  Mode ini mensimulasikan build production
echo  (sama seperti yang akan jalan di Cloudflare).
echo.

:: Build dulu
echo  [1/2] Building...
call npx vite build
if %errorlevel% neq 0 (
    echo.
    echo  Build GAGAL. Periksa error di atas.
    pause
    exit /b 1
)

echo.
echo  [2/2] Menjalankan preview server...
echo  Header COOP/COEP aktif untuk WASM.
echo  Tekan Ctrl+C untuk menghentikan.
echo.

:: Buka browser setelah 2 detik
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4173"

:: Jalankan custom server dengan header yang benar
node serve.mjs

echo.
echo  Preview server dihentikan.
pause
