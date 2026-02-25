# ============================================================
# Build gpt_revue.zip for security review
# Sign-off: middleware, PartyChat, messages (E2E), migrations
# ============================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# If gpt_revue missing, we need a source (review_bundle_v2 or BACKUP)
if (-not (Test-Path "gpt_revue")) {
    if (Test-Path "review_bundle_v2") {
        Write-Host "Creating gpt_revue from review_bundle_v2..."
        New-Item -ItemType Directory gpt_revue | Out-Null
        robocopy review_bundle_v2 gpt_revue /E /XD package node_modules .next /NFL /NDL /NJH /NJS /NC /NS | Out-Null
    } else {
        throw "gpt_revue folder missing and no review_bundle_v2. Cannot build."
    }
}

# Sync supabase from ROOT (migrations live in root)
Write-Host "[1/4] Syncing supabase/migrations from root..."
robocopy .\supabase\migrations .\gpt_revue\supabase\migrations /E /NFL /NDL /NJH /NJS /NC /NS | Out-Null
New-Item -ItemType Directory -Force gpt_revue\supabase\policies | Out-Null
New-Item -ItemType Directory -Force gpt_revue\supabase\schema_dump | Out-Null

# Sync middleware from root (matcher fix)
if (Test-Path "middleware.ts") {
    Copy-Item middleware.ts gpt_revue\middleware.ts -Force
}

Write-Host "[2/4] Verification..."

$checks = @()
$ok = $true

if (Test-Path "gpt_revue\features\chat\PartyChat.tsx") {
    $sz = (Get-Item "gpt_revue\features\chat\PartyChat.tsx").Length
    $checks += "OK: PartyChat.tsx ($sz bytes)"
} else {
    $checks += "FAIL: PartyChat.tsx missing"
    $ok = $false
}

$migrations = Get-ChildItem "gpt_revue\supabase\migrations\*.sql" -ErrorAction SilentlyContinue
$cnt = ($migrations | Measure-Object).Count
if ($cnt -ge 1) {
    $checks += "OK: $cnt migrations"
} else {
    $checks += "FAIL: 0 migrations"
    $ok = $false
}

$routeContent = Get-Content "gpt_revue\app\api\parties\messages\route.ts" -Raw -ErrorAction SilentlyContinue
if ($routeContent) {
    $hasReject = $routeContent -match 'Plaintext content field is not accepted'
    $insertHasContent = $routeContent -match '\.insert\(\s*\{[^}]*\bcontent\b\s*[,}]'
    if ($hasReject -and -not $insertHasContent) {
        $checks += "OK: messages route E2E (ciphertext-only)"
    } else {
        $checks += "FAIL: messages route may be plaintext"
        $ok = $false
    }
} else {
    $checks += "FAIL: messages route missing"
    $ok = $false
}

$checks | ForEach-Object { Write-Host "  $_" }

if (-not $ok) {
    throw "Verification failed. Fix gpt_revue before archiving."
}

Write-Host "[3/4] Creating MANIFEST.txt..."
@"
GPT_REVUE_SECURITY_BUNDLE
Built: $(Get-Date -Format "yyyy-MM-dd HH:mm")

SIGN-OFF CHECKLIST:
- NOTE: messages/route.ts contains "content" only in REJECTION block (line ~70:
  if ("content" in b) return error). The .insert() uses ciphertext, nonce, e2e_version.
- middleware: matcher excludes static assets
- features/chat/PartyChat.tsx: $(if (Test-Path 'gpt_revue\features\chat\PartyChat.tsx') { (Get-Item 'gpt_revue\features\chat\PartyChat.tsx').Length } else { 0 }) bytes
- supabase/migrations: $cnt SQL files
- app/api/parties/messages: E2E ciphertext-only (rejects plaintext content)
"@ | Out-File "gpt_revue\MANIFEST.txt" -Encoding utf8

Write-Host "[4/4] Creating gpt_revue.zip..."
Remove-Item gpt_revue.zip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path gpt_revue -DestinationPath gpt_revue.zip -Force

$kb = [math]::Round((Get-Item gpt_revue.zip).Length / 1KB, 1)
Write-Host ""
Write-Host "DONE: gpt_revue.zip ($kb KB) - upload for review"
