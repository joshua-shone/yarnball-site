echo "Doing git pull.."
git pull

echo "Updating yarnball npm module.."
npm update yarnball

echo "Updating yarnball bower component.."
bower update yarnball

echo "Building static assets.."
gulp static

echo "Restarting server.."
systemctl restart yarnball

echo "Done."