cd /home/nstein/deploy/phat-beatz;
git pull;
node cron-generate-api.js;
forever stopall;
forever start app.js;
echo $(date) > last_updated;