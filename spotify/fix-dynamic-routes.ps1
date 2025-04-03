# Fix dynamic route naming conflicts for Next.js
# This script ensures all dynamic routes use consistent naming patterns

# Rename user/[id] to user/[userId]
if (Test-Path -Path "src/app/user/`[id`]") {
    $contents = Get-ChildItem -Path "src/app/user/`[id`]" -Recurse
    foreach ($item in $contents) {
        $destPath = $item.FullName.Replace("src/app/user/`[id`]", "src/app/user/`[userId`]")
        if (!(Test-Path -Path (Split-Path -Path $destPath -Parent))) {
            New-Item -ItemType Directory -Path (Split-Path -Path $destPath -Parent) -Force
        }
        Copy-Item -Path $item.FullName -Destination $destPath -Force -Recurse
    }
    Remove-Item -Path "src/app/user/`[id`]" -Recurse -Force
    Write-Host "Transformed user/[id] to user/[userId]"
}

# Update file content to replace params.id with params.userId in user pages
$userPagePath = "src/app/user/`[userId`]/page.tsx"
if (Test-Path -Path $userPagePath) {
    $content = Get-Content -Path $userPagePath -Raw
    $newContent = $content -replace "params\.id", "params.userId"
    $newContent | Set-Content -Path $userPagePath
    Write-Host "Updated reference from params.id to params.userId in user page"
}

Write-Host "Dynamic route naming conflicts have been resolved!" 