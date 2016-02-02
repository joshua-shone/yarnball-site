scp yarnball_nginx.conf root@185.14.185.12:/etc/nginx/conf.d/yarnball.conf
ssh root@185.14.185.12 "nginx -s reload"
