# CI/CD

This repository uses GitHub Actions for CI and production deployment.

## CI

The CI workflow runs on pull requests and pushes to `main`, `develop`, and `feature/**` branches.

It performs:

- `npm ci`
- `npm run ci:lint`
- `npm run ci:build`
- Uploads `dist/apps` as a short-lived artifact

## Deployment

The deploy workflow runs on pushes to `main` and can also be started manually from GitHub Actions.

The workflow builds all three Angular apps and prepares this static bundle:

- `beverage-r-d`
- `document`
- `inventory-management`

Deployment builds use folder-specific base paths, so the apps are expected to be served from `/beverage-r-d/`, `/document/`, and `/inventory-management/`.

To enable automatic SSH deployment, configure these repository or environment secrets:

- `SSH_HOST`: deployment server hostname or IP address
- `SSH_USER`: SSH username
- `SSH_PORT`: SSH port, optional and defaults to `22`
- `SSH_PRIVATE_KEY`: private key with write access to the deployment path
- `DEPLOY_PATH`: absolute folder on the server where the static files should be synced

If the secrets are not configured, the deployment job still leaves a `giavico-web-deploy` artifact that can be downloaded and deployed manually.

## Server routing

Each app is a single-page application. The web server should route unknown paths under each app folder back to that app's `index.html`.

Example Nginx routing:

```nginx
location /beverage-r-d/ {
  alias /var/www/giavico-web/beverage-r-d/;
  try_files $uri $uri/ /beverage-r-d/index.html;
}

location /document/ {
  alias /var/www/giavico-web/document/;
  try_files $uri $uri/ /document/index.html;
}

location /inventory-management/ {
  alias /var/www/giavico-web/inventory-management/;
  try_files $uri $uri/ /inventory-management/index.html;
}
```
