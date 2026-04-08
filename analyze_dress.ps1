param([string]$filename)
$dressDir = "c:\MirrorAI\virtual-tryon\public\dresses"
$path = Join-Path $dressDir $filename
$bytes = [System.IO.File]::ReadAllBytes($path)
$b64 = [Convert]::ToBase64String($bytes)
$prompt = 'Analyze this dress image and provide: 1) dress name (descriptive, 3-5 words), 2) category (one of: Bridal, Formal, Evening, Cocktail, Summer, Casual, Party, Traditional), 3) primary color, 4) style (Gown, Maxi, Mini, Midi, Jumpsuit, Saree, Lehenga, Kurta), 5) one sentence description. Reply ONLY in JSON format: {"name": "", "category": "", "color": "", "style": "", "description": ""}'
$body = @{
    interface = "puter-chat-completion"
    driver = "claude-sonnet-4-5"
    method = "complete"
    args = @{
        messages = @(
            @{
                role = "user"
                content = @(
                    @{ type = "image_url"; image_url = @{ url = "data:image/jpeg;base64,$b64" } },
                    @{ type = "text"; text = $prompt }
                )
            }
        )
    }
} | ConvertTo-Json -Depth 10
try {
    $response = Invoke-RestMethod -Uri "https://api.puter.com/drivers/call" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
    Write-Output "SUCCESS: $filename"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Output "ERROR: $filename - $_"
}
