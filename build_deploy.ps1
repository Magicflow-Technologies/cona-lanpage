# Script de empaquetado para despliegue en VPS
$ErrorActionPreference = "Stop"

$baseDir = $PSScriptRoot
$zipPath = Join-Path $baseDir "cona-version3-deploy.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$tempDeploy = Join-Path $env:TEMP ("cona_deploy_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDeploy | Out-Null

Write-Host "Copiando dist..."
Copy-Item (Join-Path $baseDir "dist") -Destination (Join-Path $tempDeploy "dist") -Recurse

Write-Host "Copiando frontend..."
$feDest = Join-Path $tempDeploy "frontend"
New-Item -ItemType Directory -Path $feDest | Out-Null
Copy-Item (Join-Path $baseDir "frontend\index.html") -Destination $feDest
Copy-Item (Join-Path $baseDir "frontend\admin.html") -Destination $feDest
Copy-Item (Join-Path $baseDir "frontend\styles.css") -Destination $feDest
Copy-Item (Join-Path $baseDir "frontend\dist") -Destination (Join-Path $feDest "dist") -Recurse

if (Test-Path (Join-Path $baseDir "frontend\assets")) {
    Copy-Item (Join-Path $baseDir "frontend\assets") -Destination (Join-Path $feDest "assets") -Recurse
}

Write-Host "Copiando configuraciones de produccion..."
Copy-Item (Join-Path $baseDir "package.json") -Destination $tempDeploy
Copy-Item (Join-Path $baseDir "package-lock.json") -Destination $tempDeploy
Copy-Item (Join-Path $baseDir "ecosystem.config.js") -Destination $tempDeploy
Copy-Item (Join-Path $baseDir ".env.production") -Destination $tempDeploy
Copy-Item (Join-Path $baseDir ".env.production") -Destination (Join-Path $tempDeploy ".env")

$deployGuide = @"
==============================================================
CONA - GUIA RAPIDA DE DESPLIEGUE EN VPS
==============================================================

1. Subir cona-version3-deploy.zip a la carpeta de la app en tu VPS.

2. Descomprimir:
   unzip -o cona-version3-deploy.zip

3. Instalar dependencias de produccion:
   npm ci --omit=dev
   (o: npm install --omit=dev)

4. En Linux, reconstruir el modulo nativo better-sqlite3:
   npm rebuild better-sqlite3

5. Iniciar o recargar con PM2:
   pm2 start ecosystem.config.js
   (o si ya estaba corriendo: pm2 reload cona-campana)

6. Guardar estado de PM2:
   pm2 save

7. Verificar el estado y logs:
   pm2 status
   pm2 logs cona-campana
==============================================================
"@

$deployGuide | Out-File -FilePath (Join-Path $tempDeploy "README_DEPLOY.txt") -Encoding utf8

Write-Host "Generando archivo zip..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDeploy, $zipPath)

Remove-Item $tempDeploy -Recurse -Force

$item = Get-Item $zipPath
$mb = [math]::Round($item.Length / 1MB, 2)
Write-Host "=========================================================="
Write-Host "PAQUETE CREADO EXITOSAMENTE:"
Write-Host "Ruta: $zipPath"
Write-Host "Tamano: $mb MB ($($item.Length) bytes)"
Write-Host "=========================================================="
