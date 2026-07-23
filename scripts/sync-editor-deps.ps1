$ErrorActionPreference = 'Stop'

$playerSrc = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $playerSrc '..\..\..')).Path
$lumiRoot = Join-Path $repoRoot 'nuevas-librerias-h5p'
$colorSelectorSrc = Join-Path $playerSrc 'editor\H5PEditor.ColorSelector-1.3'
$colorSelectorLumiH5p = Join-Path $lumiRoot 'H5PEditor.ColorSelector-1.3'
$colorSelectorAppData = Join-Path $env:APPDATA 'lumi\libraries\H5PEditor.ColorSelector-1.3'

function Reset-Directory {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
    }

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Copy-DirectoryContents {
    param(
        [string]$SourceDir,
        [string]$DestinationDir
    )

    Get-ChildItem -Path $SourceDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($SourceDir.Length).TrimStart('\')
        $destination = Join-Path $DestinationDir $relativePath
        $destDir = Split-Path $destination -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $destination -Force
    }
}

if (-not (Test-Path $colorSelectorSrc)) {
    Write-Warning "Missing ColorSelector source: $colorSelectorSrc"
    exit 0
}

Write-Host "Sync ColorSelector 1.3.2 -> $colorSelectorLumiH5p"
Reset-Directory $colorSelectorLumiH5p
Copy-DirectoryContents $colorSelectorSrc $colorSelectorLumiH5p

if (Test-Path (Split-Path $colorSelectorAppData -Parent)) {
    Write-Host "Sync ColorSelector 1.3.2 -> $colorSelectorAppData"
    Reset-Directory $colorSelectorAppData
    Copy-DirectoryContents $colorSelectorSrc $colorSelectorAppData
}
else {
    Write-Warning "Lumi AppData libraries folder not found; skipped AppData ColorSelector sync."
}

Write-Host "Done."
