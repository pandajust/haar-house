#Requires -Version 5.1
<#
  理发店项目本地开发环境一键启动脚本
  作用: 在仓库根执行 docker compose up -d，并打印自检信息
  用法:
    .\scripts\dev-up.ps1
#>

$ErrorActionPreference = 'Stop'

# 切到仓库根（脚本位于 scripts/ 下）
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

Write-Host '[dev-up] 启动 PostgreSQL 16 + Redis 7 (docker compose up -d)...' -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host '[dev-up] 启动失败，请确认 Docker Desktop 已运行。' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host '[dev-up] 等待服务健康（最多 60 秒）...' -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(60)
$healthy = $false
while ((Get-Date) -lt $deadline) {
    $ps = docker compose ps --status healthy --format json 2>$null | Out-String
    $pgReady = $false
    $redisReady = $false
    try {
        $json = $ps -split "`n" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json }
        foreach ($svc in $json) {
            if ($svc.Service -eq 'postgres' -and $svc.Health -eq 'healthy') { $pgReady = $true }
            if ($svc.Service -eq 'redis' -and $svc.Health -eq 'healthy') { $redisReady = $true }
        }
    } catch {
        # 老版本 compose 没有 json 输出，忽略解析错误，直接用 ps 文本兜底
        $txt = docker compose ps 2>$null | Out-String
        if ($txt -match 'postgres.*healthy' -or $txt -match 'hair-postgres.*healthy') { $pgReady = $true }
        if ($txt -match 'redis.*healthy' -or $txt -match 'hair-redis.*healthy') { $redisReady = $true }
    }
    if ($pgReady -and $redisReady) { $healthy = $true; break }
    Start-Sleep -Seconds 2
}

Write-Host ''
Write-Host '===== docker compose ps =====' -ForegroundColor Green
docker compose ps

if ($healthy) {
    Write-Host ''
    Write-Host '[dev-up] 完成: PG 与 Redis 均已 healthy。' -ForegroundColor Green
} else {
    Write-Host ''
    Write-Host '[dev-up] 警告: 60 秒内未检测到全部 healthy，请用 "docker compose ps" 自行确认。' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '连接信息:' -ForegroundColor Cyan
Write-Host '  DATABASE_URL = postgresql://hair:hair_pass@localhost:5432/hair'
Write-Host '  REDIS_URL    = redis://localhost:6379/0'
Write-Host '  关闭环境:     .\scripts\dev-down.ps1'
