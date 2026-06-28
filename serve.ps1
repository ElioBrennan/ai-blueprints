Write-Host "Iniciando servidor en http://localhost:8080" -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
python -m http.server 8080
