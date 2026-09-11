# P4 proof-only probe runner. One job: issue a single unauthenticated HTTPS GET
# with an explicit per-command DNS override (host resolver filters bitget.com;
# machine config is NOT changed) and save body + timing metadata.
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$Url,
  [string]$Resolve = "api.bitget.com:443:104.18.14.166",
  [string]$Method = "GET",
  [string]$Body = "",
  [string]$SessionId = ""
)
$out = "proof/p4/$Name.json"
$err = "proof/p4/$Name.err"
$meta = "proof/p4/$Name.meta.json"
$hdr = "proof/p4/$Name.hdr.txt"
Remove-Item $out, $err, $hdr -ErrorAction SilentlyContinue
$extra = @()
if ($SessionId -ne "") { $extra += "-H"; $extra += "Mcp-Session-Id: $SessionId" }
$sw = [System.Diagnostics.Stopwatch]::StartNew()
if ($Method -eq "POST") {
  curl.exe --resolve $Resolve -sS -m 30 -D $hdr -X POST $Url -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" @extra -d $Body --output $out 2> $err
} else {
  curl.exe --resolve $Resolve -sS -m 30 $Url --output $out 2> $err
}
$sw.Stop()
@{ name = $Name; url = $Url; elapsedMs = $sw.ElapsedMilliseconds; bytes = ((Get-Item $out -ErrorAction SilentlyContinue).Length); at = ((Get-Date).ToUniversalTime().ToString("o")) } | ConvertTo-Json -Compress | Set-Content $meta
Write-Output "$Name elapsed_ms=$($sw.ElapsedMilliseconds) bytes=$((Get-Item $out -ErrorAction SilentlyContinue).Length)"
Get-Content $err | Select-Object -First 3
