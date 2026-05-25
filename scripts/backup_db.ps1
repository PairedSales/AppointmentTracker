$source = "C:\Users\jeffh\Coding Projects\AppraisalTracker\appraisals.db"
$destDir = "C:\Users\jeffh\Documents\App Backups"
$dateStr = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dest = Join-Path $destDir "appraisals_$dateStr.db"

Copy-Item -Path $source -Destination $dest -Force

# Keep only the last 7 days of backups to save space
Get-ChildItem -Path $destDir -Filter "appraisals_*.db" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
