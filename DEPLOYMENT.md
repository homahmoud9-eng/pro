# Production Deployment Guide (DEPLOYMENT.md)

This document provides production deployment procedures, containerization guidelines, reverse proxy configurations, and disaster recovery policies for the **UAE Restaurant Enterprise System**.

---

## 1. Production Architecture Overview

```
[Internet / HTTPS Client]
         |
         v
+-------------------------------+
|  Nginx / Cloudflare (TLS 1.3) | ---> Handles SSL termination, gzip, rate limiting
+-------------------------------+
         |
         | HTTP Proxy (Port 3000)
         v
+-------------------------------+
|  Next.js Production Service   | ---> Runs `next start` via PM2 or Docker
+-------------------------------+
         |
         +--------------------------------+
         |                                |
         v                                v
+-------------------------------+  +-------------------------------+
|  PostgreSQL 16 Database       |  |  Persistent Document Vault    |
|  (Dedicated Container / RDS)  |  |  (/var/data/restaurant/uploads)|
+-------------------------------+  +-------------------------------+
```

---

## 2. Docker Deployment

### 2.1 Multi-Stage Dockerfile (`Dockerfile.production`)
A production-ready Dockerfile for packaging the Next.js enterprise application:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
```

---

## 3. Production Environment Checklist

Before going live:
- [ ] Set `NODE_ENV="production"`
- [ ] Replace `JWT_SECRET` with a high-entropy string ($\ge 32$ characters) generated via `openssl rand -hex 32`.
- [ ] Set `AUDIT_CHAIN_SECRET` with an independent high-entropy key and securely back it up.
- [ ] Ensure database migrations are executed via `npx prisma db push` or `npx prisma migrate deploy`.
- [ ] Ensure `STORAGE_PATH` points to a persistent volume with appropriate read/write permissions.

---

## 4. Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name portal.tasha.ae;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portal.tasha.ae;

    ssl_certificate /etc/letsencrypt/live/portal.tasha.ae/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.tasha.ae/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 25M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Backup & Disaster Recovery

### Database Backup (PostgreSQL)
Run nightly automated cron jobs using `pg_dump`:
```bash
docker exec -t restaurant_postgres pg_dump -U postgres restaurant_uae_db > /backup/postgres/db_$(date +\%F).sql
```

### Document Vault Backup
Synchronize the persistent PDF storage volume to an offsite or encrypted S3 backup bucket:
```bash
aws s3 sync ./uploads s3://tasha-uae-backup/uploads/ --sse AES256
```
