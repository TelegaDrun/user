$p = Start-Process -FilePath "python" -ArgumentList "C:\games\telega-clone\server.py" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
if (!$p.HasExited) {
    Write-Host "Server started PID: $($p.Id)"
} else {
    Write-Host "Server failed to start"
}