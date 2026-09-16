#Requires -Version 5.1
<#
  理发店项目本地开发环境一键关闭脚本
  作用: 在仓库根执行 docker compose down（保留卷数据）
  用法:
    .\scripts\dev-down.ps1            # 仅停止并删除容器
    .\scripts\dev-down.ps1 -Clean     # 同时删除 ./docker-data 卷数据（重新初始化 DB）
#>

param(
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

Write-Host '[dev-down] 停止并清理容器 (docker compose down)...' -ForegroundColor Cyan

if ($Clean) {
    Write-Host '[dev-down] -Clean 已启用: 将删除 ./docker-data 目录，下次启动会重新初始化 DB。' -ForegroundColor Yellow
    docker compose down -v --rmi local
    $dataPath = Join-Path $repoRoot 'docker-data'
    if (Test-Path $dataPath) {
        Write-Host "[dev-down] 删除本地数据目录 $dataPath ..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $dataPath
    }
} else {
    docker compose down
}

if ($LASTEXITCODE -ne 0) {
    Write-Host '[dev-down] 关闭失败，请查看上方日志。' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host '[dev-down] 完成。卷数据保留在 ./docker-data（除非使用 -Clean）。' -ForegroundColor Green
