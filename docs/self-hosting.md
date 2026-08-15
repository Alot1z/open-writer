# Self-Hosting Open Writer

Open Writer is a static application. Self-hosting means serving one
directory of files — there is no server component to run.

## 1. Build

```bash
bun install
NEXT_PUBLIC_BASE_PATH=<your-path> bun run build
```

- `<your-path>` is the URL prefix where the app will live:
  - GitHub Pages project page → `/open-writer`
  - domain root → `` (empty) or `/`
  - subfolder `/apps/writer` → `/apps/writer`

The deployable artifact is `out/`.

## 2. Serve

Any static file server works. Examples:

**nginx**

```nginx
server {
  listen 80;
  root /var/www/open-writer;
  location /open-writer/ {
    try_files $uri $uri/ /open-writer/404.html;
  }
}
```

**docker (simple)**

```dockerfile
FROM nginx:alpine
COPY out/ /usr/share/nginx/html/
```

or with the provided Caddyfile (see repo root):

```
:8080 {
  root * /path/to/out
  file_server
}
```

**GitHub Pages**

The repo includes `.github/workflows/deploy-pages.yml`; enable Pages with
"GitHub Actions" as the source and every push to `main` deploys
`out/` to `https://<owner>.github.io/open-writer/`.

## 3. Optional server features

Features that genuinely require a server (sync, collaboration, accounts,
remote agent execution) are **not part of the static build**. They would
be added as an optional external service; the local-first core never
depends on them. The application remains fully functional offline.
