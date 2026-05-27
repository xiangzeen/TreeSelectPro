$logFile = "E:\ws\TreeSelectPro\demo\vite.log"
$process = Start-Process -NoNewWindow -FilePath "node_modules/.bin/vite.cmd" -ArgumentList "--host" -WorkingDirectory "E:\ws\TreeSelectPro\demo" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru
Write-Output "Vite PID: $($process.Id)"
Write-Output "Log: $logFile"
