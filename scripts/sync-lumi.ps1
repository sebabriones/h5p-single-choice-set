$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$lumiRoot = Join-Path $repoRoot 'nuevas-librerias-h5p'
$playerSrc = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$playerDst = Join-Path $lumiRoot 'H5P.SingleChoiceSetCFRD-1.0'

function Reset-Directory {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
    }

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Copy-IfExists {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "Missing source: $Source"
        return
    }

    $destDir = Split-Path $Destination -Parent
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    Copy-Item -Path $Source -Destination $Destination -Force
}

function Copy-DirectoryContents {
    param(
        [string]$SourceDir,
        [string]$DestinationDir
    )

    if (-not (Test-Path $SourceDir)) {
        Write-Warning "Missing source directory: $SourceDir"
        return
    }

    Get-ChildItem -Path $SourceDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($SourceDir.Length).TrimStart('\')
        Copy-IfExists $_.FullName (Join-Path $DestinationDir $relativePath)
    }
}

Write-Host "Sync SingleChoiceSetCFRD 1.0 -> $playerDst"
Reset-Directory $playerDst

@(
    'library.json',
    'semantics.json',
    'upgrades.js',
    'presave.js',
    'icon.svg'
) | ForEach-Object {
    Copy-IfExists (Join-Path $playerSrc $_) (Join-Path $playerDst $_)
}

Copy-DirectoryContents (Join-Path $playerSrc 'scripts') (Join-Path $playerDst 'scripts')
Copy-DirectoryContents (Join-Path $playerSrc 'styles') (Join-Path $playerDst 'styles')
Copy-DirectoryContents (Join-Path $playerSrc 'language') (Join-Path $playerDst 'language')

Write-Host "Done."
