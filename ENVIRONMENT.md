# Environment Variables Specification (ENVIRONMENT.md)

This document provides a reference for all environment variables utilized by the **UAE Restaurant Enterprise System**.

---

## 1. Environment Variables Overview

| Variable | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:postgres@localhost:5435/restaurant_uae_db?schema=public` | PostgreSQL database connection string. |
| `JWT_SECRET` | **Yes** | `uae_restaurant_enterprise_jwt_secret_key_2026_super_secure` | Cryptographic secret for signing and verifying session JSON Web Tokens (min 32 characters). |
| `AUDIT_CHAIN_SECRET` | **Yes** | `uae_restaurant_audit_hmac_secret_key_2026_super_secure` | Cryptographic key used to compute HMAC-SHA256 signatures for the immutable audit trail. |
| `STORAGE_PATH` | No | `./uploads` | Filesystem root directory for storing encrypted/isolated legal PDF document versions. |
| `PORT` | No | `3000` | Port on which the HTTP server listens. |
| `NODE_ENV` | No | `development` (`production` in deployment) | Runtime environment mode. Controls error verbosity, caching, and Next.js optimizations. |

---

## 2. Security Best Practices for Secrets

1. **Never Commit Secrets**: The `.env` file is excluded from Git tracking via `.gitignore`.
2. **Production Rotation**: In cloud production deployments, populate `JWT_SECRET` and `AUDIT_CHAIN_SECRET` from a managed secrets manager (e.g. AWS Secrets Manager, Google Secret Manager, or HashiCorp Vault).
3. **Audit Chain Secret Immutability**: If `AUDIT_CHAIN_SECRET` is changed after audit logs have been written, historical signature verification will detect a mismatch. Always retain and back up the audit secret securely.
