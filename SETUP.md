# Setup & Installation Guide

This document describes the step-by-step setup procedure for running the **UAE Restaurant Enterprise Management System** in local development and test environments.

---

## 1. System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **Node.js**: Version 18.18.0 or newer (tested on Node 20.x and Node 24.x)
- **Package Manager**: `npm` (v9 or v10)
- **Container Engine**: Docker Desktop or Docker Engine with Docker Compose

---

## 2. Step-by-Step Installation

### Step 2.1: Clone & Navigate to Workspace
```bash
cd c:/Users/pc/Desktop/pro
```

### Step 2.2: Install NPM Dependencies
```bash
npm install
```
*Note for Windows PowerShell environments: If running `npm` commands via PowerShell, ensure you invoke `npm.cmd` or execute through CMD.*

### Step 2.3: Launch PostgreSQL 16 via Docker
The repository includes a dedicated `docker-compose.yml` service configured on port `5435` (to avoid collision with default PostgreSQL installations on 5432-5434).

```bash
docker compose up -d
```

Verify that the container is healthy:
```bash
docker ps --filter "name=restaurant_postgres"
```

### Step 2.4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Verify that your `.env` contains:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/restaurant_uae_db?schema=public"
JWT_SECRET="uae_restaurant_enterprise_jwt_secret_key_2026_super_secure"
AUDIT_CHAIN_SECRET="uae_restaurant_audit_hmac_secret_key_2026_super_secure"
STORAGE_PATH="./uploads"
PORT=3000
NODE_ENV="development"
```

### Step 2.5: Synchronize Database Schema
Push the Prisma relational schema to PostgreSQL:
```bash
npx prisma db push
```

### Step 2.6: Seed the Database
Populate the database with complete Abu Dhabi compliance records, departments, roles, permissions, users, documents, employees, inventory, recipes, expenses, and HMAC-chained audit records:
```bash
npm run db:seed
```

---

## 3. Running Automated Tests

Run the full automated test suite (unit tests + live HTTP end-to-end integration tests):
```bash
npm test
```

This verifies:
1. Two-Level Password Security (Authorization password vs Login password separation).
2. Role-Based Access Control and IDOR branch scoping defenses.
3. PDF magic-bytes validation (`%PDF-`).
4. Non-destructive legal document versioning.
5. UAE Labor Law (Federal Decree-Law No. 33 of 2021) End-of-Service gratuity calculations.
6. Mathematical HMAC-SHA256 audit chain verification from genesis.
7. Recipe food cost percentage and gross profit calculations.
8. Live session authentication, metric streaming, and in-browser PDF retrieval.

---

## 4. Running the Application

### Development Mode (with Hot Reloading)
```bash
npm run dev
```
Access the application at [http://localhost:3000](http://localhost:3000).

### Production Build & Run
To compile and test the optimized production build:
```bash
npm run build
npm run start
```
