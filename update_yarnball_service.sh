scp yarnball_systemd.service root@185.14.185.12:/etc/systemd/system/yarnball.service
ssh root@185.14.185.12 "systemctl daemon-reload; systemctl restart yarnball;"