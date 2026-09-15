param([switch]$CreateKey)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$signingDir = Join-Path $projectRoot '.android-signing'
$storePath = Join-Path $signingDir 'upload.jks'
$secretPath = Join-Path $signingDir 'password.dpapi'
$envNames = @('WORKOUT_UPLOAD_STORE_FILE', 'WORKOUT_UPLOAD_STORE_PASSWORD', 'WORKOUT_UPLOAD_KEY_ALIAS', 'WORKOUT_UPLOAD_KEY_PASSWORD')
$previous = @{}
foreach ($name in $envNames) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    if ($CreateKey) {
        if ((Test-Path -LiteralPath $storePath) -or (Test-Path -LiteralPath $secretPath)) {
            throw 'Signing material already exists. Never replace an existing upload key.'
        }
        New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
        $random = New-Object byte[] 32
        [Security.Cryptography.RandomNumberGenerator]::Fill($random)
        $env:WORKOUT_UPLOAD_STORE_PASSWORD = [Convert]::ToBase64String($random)
        $env:WORKOUT_UPLOAD_KEY_PASSWORD = $env:WORKOUT_UPLOAD_STORE_PASSWORD
        $secure = ConvertTo-SecureString $env:WORKOUT_UPLOAD_STORE_PASSWORD -AsPlainText -Force
        ConvertFrom-SecureString $secure | Set-Content -LiteralPath $secretPath
        & keytool -genkeypair -keystore $storePath -storetype JKS -alias upload -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Steady Sets Upload, O=Mamkkeot, C=KR' -storepass:env WORKOUT_UPLOAD_STORE_PASSWORD -keypass:env WORKOUT_UPLOAD_KEY_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Key generation failed. Preserve and inspect any partially created signing files.' }
    }
    if (!(Test-Path -LiteralPath $storePath) -or !(Test-Path -LiteralPath $secretPath)) {
        throw 'No upload key. Run with -CreateKey once, or restore the original signing material.'
    }
    $secure = (Get-Content -LiteralPath $secretPath -Raw).Trim() | ConvertTo-SecureString
    $env:WORKOUT_UPLOAD_STORE_PASSWORD = [Net.NetworkCredential]::new('', $secure).Password
    $env:WORKOUT_UPLOAD_KEY_PASSWORD = $env:WORKOUT_UPLOAD_STORE_PASSWORD
    $env:WORKOUT_UPLOAD_STORE_FILE = $storePath
    $env:WORKOUT_UPLOAD_KEY_ALIAS = 'upload'
    Push-Location $projectRoot
    try {
        & npm.cmd run android:sync
        if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
        Push-Location (Join-Path $projectRoot 'android')
        try {
            & .\gradlew.bat :app:bundleRelease :app:assembleRelease -PrequireUploadSigning
            if ($LASTEXITCODE -ne 0) { throw 'Signed Android build failed.' }
        } finally { Pop-Location }
        $verification = & jarsigner '-J-Duser.language=en' -verify 'android/app/build/outputs/bundle/release/app-release.aab' 2>&1
        if ($LASTEXITCODE -ne 0 -or ($verification -join "`n") -notmatch 'jar verified\.') { throw 'AAB signature verification failed.' }
        Write-Output 'AAB cryptographic signature verified (self-signed upload certificate).'
        & keytool -exportcert -rfc -keystore $storePath -alias upload -storepass:env WORKOUT_UPLOAD_STORE_PASSWORD -file (Join-Path $signingDir 'upload-certificate.pem')
        if ($LASTEXITCODE -ne 0) { throw 'Certificate export failed.' }
        Write-Output 'Signed AAB and APK ready. The DPAPI password file works only with this Windows user profile. Back up the key and password securely before Play upload.'
    } finally { Pop-Location }
} finally {
    foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
