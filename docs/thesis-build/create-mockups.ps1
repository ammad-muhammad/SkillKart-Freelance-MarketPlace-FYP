Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path $PSScriptRoot -Parent
$webDir = Join-Path $rootDir "screenshots\web"
$mobDir = Join-Path $rootDir "screenshots\mobile"
$outDir = Join-Path $rootDir "thesis-figures\screens"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Write-Host "Creating mockups into: $outDir"

# Function to create a sleek desktop browser mockup
function Create-BrowserMockup($srcPath, $dstPath, $urlText, $maxHeight = 900) {
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Source not found: $srcPath"
        return
    }
    
    $srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
    try {
        $srcW = $srcImg.Width
        $srcH = $srcImg.Height
        $cropH = [Math]::Min($srcH, $maxHeight)
        
        $headerH = 40
        $border = 1
        $totalW = $srcW + ($border * 2)
        $totalH = $cropH + $headerH + ($border * 2)
        
        $bmp = New-Object System.Drawing.Bitmap($totalW, $totalH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        # Outer background / border
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 241, 245, 249))
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 203, 213, 225), 1)
        $g.FillRectangle($bgBrush, 0, 0, $totalW, $totalH)
        
        # Header background
        $headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
        $g.FillRectangle($headerBrush, $border, $border, $srcW, $headerH)
        
        # 3 macOS-style dots
        $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
        $yellowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
        $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
        
        $dotY = $border + 14
        $dotR = 10
        $g.FillEllipse($redBrush, $border + 14, $dotY, $dotR, $dotR)
        $g.FillEllipse($yellowBrush, $border + 30, $dotY, $dotR, $dotR)
        $g.FillEllipse($greenBrush, $border + 46, $dotY, $dotR, $dotR)
        
        # URL pill
        $pillW = [Math]::Min(380, $srcW - 140)
        $pillH = 24
        $pillX = $border + [Math]::Round(($srcW - $pillW) / 2)
        $pillY = $border + 8
        $pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
        $pillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 226, 232, 240), 1)
        
        $g.FillRectangle($pillBrush, $pillX, $pillY, $pillW, $pillH)
        $g.DrawRectangle($pillPen, $pillX, $pillY, $pillW, $pillH)
        
        # URL Text
        $font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 100, 116, 139))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString($urlText, $font, $textBrush, [System.Drawing.RectangleF]::new($pillX, $pillY, $pillW, $pillH), $sf)
        
        # Header bottom line
        $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 226, 232, 240), 1)
        $g.DrawLine($linePen, $border, $headerH + $border, $srcW + $border, $headerH + $border)
        
        # Screenshot content (cropped if tall)
        $dstTop = $headerH + $border
        $srcRect = New-Object System.Drawing.Rectangle(0, 0, $srcW, $cropH)
        $dstRect = New-Object System.Drawing.Rectangle($border, $dstTop, $srcW, $cropH)
        $g.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        # Outer border
        $g.DrawRectangle($borderPen, 0, 0, ($totalW - 1), ($totalH - 1))
        
        $g.Dispose()
        $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Created browser mockup: $([System.IO.Path]::GetFileName($dstPath))"
    } finally {
        $srcImg.Dispose()
    }
}

# Function to create a sleek phone mockup
function Create-PhoneMockup($srcPath, $dstPath) {
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Source not found: $srcPath"
        return
    }
    
    $srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
    try {
        $srcW = $srcImg.Width
        $srcH = $srcImg.Height
        
        $bezelH = 12
        $bezelTop = 24
        $bezelBottom = 20
        $totalW = $srcW + ($bezelH * 2)
        $totalH = $srcH + $bezelTop + $bezelBottom
        
        $bmp = New-Object System.Drawing.Bitmap($totalW, $totalH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        
        # Dark Titanium Phone Frame
        $frameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
        $g.FillRectangle($frameBrush, 0, 0, $totalW, $totalH)
        
        # Dynamic Island / Speaker notch
        $notchW = 100
        $notchH = 16
        $notchX = [Math]::Round(($totalW - $notchW) / 2)
        $notchBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 41, 59))
        $g.FillRectangle($notchBrush, $notchX, 4, $notchW, $notchH)
        
        # Screen content
        $dstRect = New-Object System.Drawing.Rectangle($bezelH, $bezelTop, $srcW, $srcH)
        $srcRect = New-Object System.Drawing.Rectangle(0, 0, $srcW, $srcH)
        $g.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        # Frame outer border
        $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 51, 65, 85), 2)
        $g.DrawRectangle($outerPen, 1, 1, ($totalW - 2), ($totalH - 2))
        
        $g.Dispose()
        $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Created phone mockup: $([System.IO.Path]::GetFileName($dstPath))"
    } finally {
        $srcImg.Dispose()
    }
}

# Function to create multi-phone composite montage
function Create-MultiPhoneMontage($srcPaths, $dstPath, $targetH = 750) {
    $images = @()
    foreach ($p in $srcPaths) {
        if (Test-Path $p) {
            $images += [System.Drawing.Bitmap]::FromFile($p)
        }
    }
    if ($images.Count -eq 0) {
        Write-Warning "No valid images for montage: $dstPath"
        return
    }
    
    try {
        $scaledTiles = @()
        $sumWidth = 0
        foreach ($img in $images) {
            $scale = $targetH / $img.Height
            $tileW = [Math]::Round($img.Width * $scale)
            $scaledTiles += [PSCustomObject]@{ Img = $img; Width = $tileW; Height = $targetH }
            $sumWidth += $tileW
        }
        
        $gap = 24
        $padding = 16
        $totalW = [int]($sumWidth + ($gap * ($images.Count - 1)) + ($padding * 2))
        $totalH = [int]($targetH + ($padding * 2))
        
        $bmp = New-Object System.Drawing.Bitmap($totalW, $totalH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        
        # Clean white background
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($bgBrush, 0, 0, $totalW, $totalH)
        
        $curX = $padding
        foreach ($tile in $scaledTiles) {
            $curW = $tile.Width
            $curH = $tile.Height
            
            # Phone frame around tile
            $bezel = 6
            $frameW = $curW + ($bezel * 2)
            $frameH = $curH + ($bezel * 2)
            $frameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 41, 59))
            $g.FillRectangle($frameBrush, $curX - $bezel, $padding - $bezel, $frameW, $frameH)
            
            # Screen content
            $dstRect = New-Object System.Drawing.Rectangle($curX, $padding, $curW, $curH)
            $srcRect = New-Object System.Drawing.Rectangle(0, 0, $tile.Img.Width, $tile.Img.Height)
            $g.DrawImage($tile.Img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
            
            # Outer border
            $framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 71, 85, 105), 1)
            $g.DrawRectangle($framePen, $curX - $bezel, $padding - $bezel, $frameW, $frameH)
            
            $curX += $curW + $gap
        }
        
        $g.Dispose()
        $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Created multi-phone montage: $([System.IO.Path]::GetFileName($dstPath))"
    } finally {
        foreach ($img in $images) { $img.Dispose() }
    }
}

# ── 1. Generate Web Browser Mockups ──
$webMappings = @{
    "01-public-home.png" = @{ out = "public-home.png"; url = "https://skillkart.com/"; h = 1000 };
    "02-public-browse-gigs.png" = @{ out = "public-browse-gigs.png"; url = "https://skillkart.com/gigs"; h = 950 };
    "03-public-gig-detail.png" = @{ out = "public-gig-detail.png"; url = "https://skillkart.com/gigs/web-development-fullstack"; h = 900 };
    "04-public-browse-projects.png" = @{ out = "public-browse-projects.png"; url = "https://skillkart.com/jobs"; h = 950 };
    "05-public-job-detail.png" = @{ out = "public-job-detail.png"; url = "https://skillkart.com/jobs/react-node-marketplace"; h = 873 };
    "06-public-freelancer-profile.png" = @{ out = "public-freelancer-profile.png"; url = "https://skillkart.com/freelancer/muhammad-hassan"; h = 950 };
    "07-public-category-page.png" = @{ out = "public-categories.png"; url = "https://skillkart.com/categories/web-development"; h = 950 };
    "08-public-login.png" = @{ out = "public-login.png"; url = "https://skillkart.com/login"; h = 538 };
    "09-public-register.png" = @{ out = "public-register.png"; url = "https://skillkart.com/register"; h = 538 };
    "10-public-about.png" = @{ out = "public-about.png"; url = "https://skillkart.com/about"; h = 1000 };
    "11-public-ai-buddy.png" = @{ out = "public-ai-buddy.png"; url = "https://skillkart.com/ai-buddy"; h = 950 };
    "12-public-cost-estimator.png" = @{ out = "public-cost-estimator.png"; url = "https://skillkart.com/ai-cost-estimator"; h = 950 };
    "13-client-dashboard.png" = @{ out = "client-dashboard.png"; url = "https://skillkart.com/client/dashboard"; h = 665 };
    "14-client-post-job-form.png" = @{ out = "client-post-job.png"; url = "https://skillkart.com/client/jobs/new"; h = 681 };
    "15-client-projects-list.png" = @{ out = "client-my-projects.png"; url = "https://skillkart.com/client/projects"; h = 950 };
    "16-client-review-proposals.png" = @{ out = "client-review-proposals.png"; url = "https://skillkart.com/client/jobs/proposals"; h = 538 };
    "17-client-messages.png" = @{ out = "client-messages.png"; url = "https://skillkart.com/client/messages"; h = 538 };
    "18-client-wallet.png" = @{ out = "client-wallet.png"; url = "https://skillkart.com/client/wallet"; h = 950 };
    "19-client-profile.png" = @{ out = "client-profile.png"; url = "https://skillkart.com/client/settings"; h = 950 };
    "20-freelancer-dashboard.png" = @{ out = "freelancer-dashboard.png"; url = "https://skillkart.com/freelancer/dashboard"; h = 950 };
    "21-freelancer-browse-jobs.png" = @{ out = "freelancer-browse-jobs.png"; url = "https://skillkart.com/freelancer/browse-jobs"; h = 950 };
    "22-freelancer-submit-proposal-form.png" = @{ out = "freelancer-proposals.png"; url = "https://skillkart.com/freelancer/jobs/submit-proposal"; h = 873 };
    "23-freelancer-gigs-list.png" = @{ out = "freelancer-gigs.png"; url = "https://skillkart.com/freelancer/my-gigs"; h = 538 };
    "24-freelancer-create-gig-form.png" = @{ out = "freelancer-create-gig.png"; url = "https://skillkart.com/freelancer/gigs/create"; h = 597 };
    "25-freelancer-contracts-work.png" = @{ out = "freelancer-my-work.png"; url = "https://skillkart.com/freelancer/contracts"; h = 950 };
    "26-freelancer-messages.png" = @{ out = "freelancer-messages.png"; url = "https://skillkart.com/freelancer/messages"; h = 538 };
    "27-freelancer-wallet.png" = @{ out = "freelancer-wallet.png"; url = "https://skillkart.com/freelancer/wallet"; h = 950 };
    "28-freelancer-profile.png" = @{ out = "freelancer-profile.png"; url = "https://skillkart.com/freelancer/profile"; h = 950 };
    "29-freelancer-portfolio.png" = @{ out = "freelancer-portfolio.png"; url = "https://skillkart.com/freelancer/portfolio"; h = 667 };
    "30-admin-login.png" = @{ out = "admin-login.png"; url = "https://skillkart.com/admin-panel/login"; h = 538 };
    "31-admin-login-otp-step.png" = @{ out = "admin-login-otp.png"; url = "https://skillkart.com/admin-panel/login-otp"; h = 538 };
    "32-swagger-api-docs.png" = @{ out = "swagger-docs.png"; url = "https://skillkart.com/api/v1/docs"; h = 538 };
}

foreach ($kv in $webMappings.GetEnumerator()) {
    $src = Join-Path $webDir $kv.Key
    $dst = Join-Path $outDir $kv.Value.out
    Create-BrowserMockup $src $dst $kv.Value.url $kv.Value.h
}

# ── 2. Generate Single Phone Mockups ──
$mobMappings = @{
    "01-login.png" = "mobile-login.png";
    "02-registration.png" = "mobile-registration.png";
    "03-forgot-password.png" = "mobile-forgot-password.png";
    "04-client-dashboard.png" = "mobile-dashboard.png";
    "05-client-browse-projects.png" = "mobile-client-browse.png";
    "06-client-job-detail.png" = "mobile-job.png";
    "07-client-browse-gigs.png" = "mobile-gigs.png";
    "08-client-gig-detail.png" = "mobile-gig-detail.png";
    "09-client-browse-freelancers.png" = "mobile-browse-freelancers.png";
    "10-client-my-projects.png" = "mobile-client-my-projects.png";
    "11-client-wallet.png" = "mobile-client-wallet.png";
    "12-client-messages.png" = "mobile-messages.png";
    "13-client-profile.png" = "mobile-client-profile.png";
    "14-client-saved-freelancers.png" = "mobile-saved.png";
    "15-client-notifications.png" = "mobile-notifications.png";
    "16-client-nav-drawer.png" = "mobile-drawer.png";
    "17-freelancer-dashboard.png" = "mobile-freelancer-dashboard.png";
    "18-freelancer-browse-projects.png" = "mobile-freelancer-browse.png";
    "19-freelancer-job-detail.png" = "mobile-freelancer-job.png";
    "21-freelancer-my-gigs.png" = "mobile-my-gigs.png";
    "22-freelancer-active-work.png" = "mobile-active-work.png";
    "23-freelancer-wallet.png" = "mobile-freelancer-wallet.png";
    "24-freelancer-messages.png" = "mobile-freelancer-messages.png";
    "25-freelancer-profile.png" = "mobile-freelancer-profile.png";
    "26-freelancer-nav-drawer.png" = "mobile-freelancer-drawer.png";
}

foreach ($kv in $mobMappings.GetEnumerator()) {
    $src = Join-Path $mobDir $kv.Key
    $dst = Join-Path $outDir $kv.Value
    Create-PhoneMockup $src $dst
}

# ── 3. Multi-Phone Montages for Chapter 15 & Results ──
# Figure 15.4 / Native Android Showcase (Sign-in, Dashboard, Job, Drawer)
$fig15_4_src = @(
    (Join-Path $mobDir "01-login.png"),
    (Join-Path $mobDir "04-client-dashboard.png"),
    (Join-Path $mobDir "06-client-job-detail.png"),
    (Join-Path $mobDir "16-client-nav-drawer.png")
)
Create-MultiPhoneMontage $fig15_4_src (Join-Path $outDir "fig-15-04-android-showcase.png") 650

# Client Journey Montage (Dashboard, Browse Gigs, Wallet, Messages)
$clientJourneySrc = @(
    (Join-Path $mobDir "04-client-dashboard.png"),
    (Join-Path $mobDir "07-client-browse-gigs.png"),
    (Join-Path $mobDir "11-client-wallet.png"),
    (Join-Path $mobDir "12-client-messages.png")
)
Create-MultiPhoneMontage $clientJourneySrc (Join-Path $outDir "mobile-client-journey.png") 650

# Freelancer Journey Montage (Dashboard, Browse Jobs, Active Work, Wallet)
$freelancerJourneySrc = @(
    (Join-Path $mobDir "17-freelancer-dashboard.png"),
    (Join-Path $mobDir "18-freelancer-browse-projects.png"),
    (Join-Path $mobDir "22-freelancer-active-work.png"),
    (Join-Path $mobDir "23-freelancer-wallet.png")
)
Create-MultiPhoneMontage $freelancerJourneySrc (Join-Path $outDir "mobile-freelancer-journey.png") 650

# Mobile Admin / Auth Montage
$mobAuthSrc = @(
    (Join-Path $mobDir "01-login.png"),
    (Join-Path $mobDir "02-registration.png"),
    (Join-Path $mobDir "03-forgot-password.png"),
    (Join-Path $mobDir "15-client-notifications.png")
)
Create-MultiPhoneMontage $mobAuthSrc (Join-Path $outDir "mobile-auth-flow.png") 650

Write-Host "All mockups generated successfully!"
