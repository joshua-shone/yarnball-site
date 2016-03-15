echo "Doing git pull.."
git pull

echo "Installing npm modules.."
npm install

echo "Installing bower components.."
bower install

echo "Building static assets.."
gulp static

echo "Restarting server.."
sudo systemctl restart yarnball

echo "Done."