# Run once as Administrator to make http://localhost:9119 always reach WSL dashboard
$wslIp = (wsl -- ip addr show eth0 2>$null | Select-String 'inet ').ToString().Trim().Split()[1].Split('/')[0]
netsh interface portproxy delete v4tov4 listenport=9119 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=9119 listenaddress=0.0.0.0 connectport=9119 connectaddress=$wslIp
Write-Host "Port proxy set: localhost:9119 -> $wslIp:9119"
