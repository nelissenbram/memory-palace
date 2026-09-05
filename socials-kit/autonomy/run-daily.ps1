# MP Autonomy — dagelijkse driver (Task Scheduler: "MP Social Autonomy")
# Keten sinds 2026-09-05 (owner-beslissing): Aurelia (social), Livia (ops) en
# Ottavia (legal) draaien parallel headless; daarna bundelt Julia (cos) alles en
# gaat er ÉÉN dagmail uit, van Julia. Aurelia mailt niet meer rechtstreeks; haar
# EXEC-SUMMARY blijft in runs/<datum>/ en zit integraal in Julia's dagmail.
# Valt Julia uit, dan gaat Aurelia's summary als fallback-mail (owner krijgt nooit niets).
$ErrorActionPreference = "Continue"
$autonomy = "C:\Users\nelis\memory-palace\socials-kit\autonomy"
$opsDir   = "C:\Users\nelis\memory-palace\ops-autonomy"
$legalDir = "C:\Users\nelis\memory-palace\legal-autonomy"
$cosDir   = "C:\Users\nelis\memory-palace\cos-autonomy"
$staging  = "C:\Users\nelis\memory-palace-staging"
$today    = Get-Date -Format "yyyy-MM-dd"
$runDir   = Join-Path $autonomy "runs\$today"
$opsRun   = Join-Path $opsDir   "runs\$today"
$legalRun = Join-Path $legalDir "runs\$today"
$cosRun   = Join-Path $cosDir   "runs\$today"
foreach ($d in @($runDir, $opsRun, $legalRun, $cosRun)) { New-Item -ItemType Directory -Force $d | Out-Null }
$log = Join-Path $runDir "run.log"
"[$(Get-Date -Format o)] driver start" | Add-Content $log

# Dev-server op :3000 (alleen starten als hij nog niet draait) — social + ops gebruiken hem
$devStarted = $false
$portOpen = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $portOpen) {
    "starting dev server" | Add-Content $log
    $dev = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $staging -PassThru -WindowStyle Hidden
    $devStarted = $true
    $tries = 0
    while ($tries -lt 60) {
        Start-Sleep -Seconds 2
        try { $r = Invoke-WebRequest -Uri "http://localhost:3000/flythrough" -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { break } } catch {}
        $tries++
    }
    "dev server ready after $tries tries" | Add-Content $log
}

# Domein-chiefs parallel headless (elk eigen proces + eigen log; budget zit in hun prompt)
$runner = Join-Path $autonomy "run-chief.ps1"
$chiefProcs = @()
$chiefDefs = @(
    @{ id = "social"; dir = $autonomy; log = (Join-Path $runDir   "chief-social.log") },
    @{ id = "ops";    dir = $opsDir;   log = (Join-Path $opsRun   "chief-ops.log") },
    @{ id = "legal";  dir = $legalDir; log = (Join-Path $legalRun "chief-legal.log") }
)
foreach ($c in $chiefDefs) {
    "launching chief $($c.id)" | Add-Content $log
    $p = Start-Process powershell.exe -PassThru -WindowStyle Hidden -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
        "-Dir", $c.dir, "-PromptFile", (Join-Path $c.dir "chief-prompt.md"), "-Log", $c.log)
    $chiefProcs += @{ id = $c.id; proc = $p }
}
# Wachten tot alle chiefs klaar zijn; harde kap 5u (social heeft zelf maxRunHours 4)
foreach ($c in $chiefProcs) {
    try { $c.proc | Wait-Process -Timeout 18000 -ErrorAction Stop }
    catch {
        "chief $($c.id) (pid $($c.proc.Id)) over tijd - afgebroken" | Add-Content $log
        & taskkill /PID $c.proc.Id /T /F 2>&1 | Add-Content $log
    }
}
"all domain chiefs finished" | Add-Content $log

# Dev-server alleen sluiten als wij hem gestart hebben (kill process tree)
if ($devStarted -and $dev -and -not $dev.HasExited) {
    "stopping dev server (pid $($dev.Id))" | Add-Content $log
    & taskkill /PID $dev.Id /T /F 2>&1 | Add-Content $log
}

# Word-versies van de social-rapporten voor lokaal lezen (owner leest Word, geen MD)
foreach ($rep in @("EXEC-SUMMARY", "POSTING-PLAN", "CLIP-REVIEW", "HUMAN-TASKS")) {
    $md = Join-Path $runDir "$rep.md"
    if (Test-Path $md) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $autonomy "md2docx.ps1") -Md $md -Docx (Join-Path $runDir "$rep.docx") 2>&1 | Add-Content $log
    }
}

# Productcijfers (PostHog) ophalen zodat Julia ze in de dagmail kan verwerken.
# Faalt stil (schrijft een unavailable-bestand); de dagmail mag hier nooit op breken.
"fetching product metrics (PostHog)" | Add-Content $log
& node (Join-Path $cosDir "fetch-product-metrics.mjs") $today 2>&1 | Add-Content $log

# Chief of Staff (Julia) — serieel, na de domein-chiefs; bundelt hun summaries
"launching chief of staff (Julia)" | Add-Content $log
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -Dir $cosDir -PromptFile (Join-Path $cosDir "chief-prompt.md") -Log (Join-Path $cosRun "chief-cos.log")

# Dagmail renderen + versturen (Julia is de ENIGE afzender van de dagelijkse mail)
$mailed = $false
$daily     = Join-Path $cosRun "daily.json"
$dagmailMd = Join-Path $cosRun "DAGMAIL.md"
if ((Test-Path $daily) -and (Test-Path $dagmailMd)) {
    "rendering + mailing dagmail (Julia)" | Add-Content $log
    $dagmailHtml = Join-Path $cosRun "DAGMAIL.html"
    $briefDir    = Join-Path $cosRun "briefings"
    & node (Join-Path $cosDir "build-daily-mail.mjs") $daily $dagmailHtml $briefDir 2>&1 | Add-Content $log
    $atts = @()
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $autonomy "md2docx.ps1") -Md $dagmailMd -Docx (Join-Path $cosRun "DAGMAIL.docx") 2>&1 | Add-Content $log
    if (Test-Path (Join-Path $cosRun "DAGMAIL.docx")) { $atts += (Join-Path $cosRun "DAGMAIL.docx") }
    foreach ($bmd in @(Get-ChildItem -Path $briefDir -Filter "BRIEFING-*.md" -ErrorAction SilentlyContinue)) {
        $bdocx = Join-Path $briefDir ($bmd.BaseName + ".docx")
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $autonomy "md2docx.ps1") -Md $bmd.FullName -Docx $bdocx 2>&1 | Add-Content $log
        if (Test-Path $bdocx) { $atts += $bdocx }
    }
    $htmlArg = if (Test-Path $dagmailHtml) { $dagmailHtml } else { "" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $autonomy "send-mail.ps1") `
        -Body $dagmailMd -Html $htmlArg -InlineImage (Join-Path $autonomy "assets\julia-avatar.png") `
        -Attachments ($atts -join ";") -Subject "MP Dagmail - $today (Julia)" 2>&1 | Add-Content $log
    if ($LASTEXITCODE -eq 0) { $mailed = $true }
    "dagmail sent: $mailed" | Add-Content $log
} else {
    "geen daily.json/DAGMAIL.md van Julia gevonden" | Add-Content $log
}

# Fallback: Julia faalde -> Aurelia's exec summary rechtstreeks mailen (zoals vroeger)
if (-not $mailed) {
    $summary = Join-Path $runDir "EXEC-SUMMARY.md"
    if (Test-Path $summary) {
        "FALLBACK: mailing Aurelia's exec summary" | Add-Content $log
        $htmlOut = Join-Path $runDir "EXEC-SUMMARY.html"
        & node (Join-Path $autonomy "render-report.mjs") "social" $summary $htmlOut $today 2>&1 | Add-Content $log
        $htmlArg = if (Test-Path $htmlOut) { $htmlOut } else { "" }
        $docx = Join-Path $runDir "EXEC-SUMMARY.docx"
        $attArg = if (Test-Path $docx) { $docx } else { "" }
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $autonomy "send-mail.ps1") `
            -Body $summary -Html $htmlArg -InlineImage (Join-Path $autonomy "assets\aurelia-avatar.png") `
            -Attachments $attArg -Subject "MP Social - dagrapport $today (fallback: dagmail Julia faalde)" 2>&1 | Add-Content $log
    } else {
        "geen EXEC-SUMMARY.md gevonden - fallback-mail overgeslagen" | Add-Content $log
    }
}
"[$(Get-Date -Format o)] driver done" | Add-Content $log
