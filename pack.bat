@echo off
chcp 65001 >nul
echo ========================================
echo  打包 vscode-proxy-relay VSIX
echo ========================================
echo.

REM 创建输出目录
if not exist "dist" mkdir dist

REM 确保依赖已安装
if not exist "node_modules" (
    echo [1/2] 安装依赖...
    call npm install
) else (
    echo [1/2] 依赖已就绪
)

echo [2/2] 打包扩展...
npx vsce package --out dist/

if %errorlevel% equ 0 (
    echo.
    echo ✓ 打包成功！
    for %%f in (dist\*.vsix) do echo   输出: %%f
) else (
    echo.
    echo ✗ 打包失败，请检查错误信息
)

pause
