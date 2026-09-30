# Tasha Restaurant Group &mdash; UAE Enterprise Operations & Compliance System

A production-grade, multi-branch Enterprise Resource Planning (ERP) and Regulatory Compliance Management System tailored specifically for the United Arab Emirates (Abu Dhabi / Dubai) food & beverage industry.

Developed in strict adherence to **UAE Federal Decree-Law No. 33 of 2021 (Labor Law)**, **Abu Dhabi Agriculture and Food Safety Authority (ADAFSA)** regulatory frameworks, **UAE Federal Tax Authority (FTA) 5% VAT Regulations**, and the **Wages Protection System (WPS)**.

---

## 🌟 Core Highlights & Architectural Distinctions

1. **Two-Level Security Credentials Model (Strict Server-Side Enforcement)**:
   - **Login Password**: Used strictly for session authentication into the account.
   - **Level-2 Authorization Password**: Required on *every single mutation* (approving expenses, salary adjustments, inter-branch stock transfers, document replacement/deletion, user provisioning, etc.). Never cached, never substituted with the login password.
2. **Cryptographic HMAC-SHA256 Chained Audit Trail**:
   - Every state change is recorded in an immutable append-only ledger.
   - Hash chain computed via `HMAC-SHA256(previousHash + canonicalJson(eventData), AUDIT_SECRET)`.
   - Built-in live integrity auditor capable of recalculating the mathematical chain from Genesis to current sequence and alerting on any database tampering.
3. **Legal Document Archive & In-Browser PDF Streaming**:
   - Magic bytes (`%PDF-`) verification rejecting masqueraded file uploads.
   - SHA-256 calculation for non-repudiation.
   - Historical version preservation (never silently overwriting older legal documents).
   - In-browser PDF modal preview without forced file downloads.
   - Permission segregation: View permission decoupled from Download permission.
4. **Abu Dhabi Food Safety (ADAFSA) & EFST Compliance**:
   - Inspection scoring, corrective action tracking, finding rectification dialogs, and 100% staff EFST training monitoring.
5. **Bilingual Arabic & English UI with Native RTL Layout**:
   - Instant toggle between English LTR and Arabic RTL with tailored typography and culture-specific terminology.
6. **UAE Statutory Calculations**:
   - End-of-Service Gratuity (EOS) computed according to UAE Federal Decree-Law No. 33 of 2021.
   - UAE 5% Value Added Tax (VAT 201) output/input tax ledger.
   - Wages Protection System (WPS) export format readiness.

---

## 🏗️ System Architecture & Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide React, Bilingual Context Provider (English / Arabic RTL).
- **Backend**: Next.js Server Components & Route Handlers, TypeScript, Two-Level `mutation-guard` security interceptor.
- **Database**: PostgreSQL 16 (Dockerized), Prisma ORM 6.4.1 with 26+ relational models, foreign keys, indexes, and transactional boundaries.
- **Cryptography & Security**: `bcryptjs` (salt rounds 10), `crypto` (HMAC-SHA256 chaining, SHA-256 file hashing, UUIDv4 tokens).
- **Storage**: Local filesystem storage with isolated organization/document version pathing and authenticated streaming.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node 20 & Node 24)
- Docker Desktop (for PostgreSQL container)

### 1. Start Database Container
```bash
docker compose up -d
```
*PostgreSQL 16 will start and listen on port `5435` with persistent volume storage.*

### 2. Environment Setup
```bash
cp .env.example .env
```
*(The defaults in `.env` are preconfigured to connect to the dockerized PostgreSQL container at `localhost:5435`).*

### 3. Initialize Schema & Seed Data
```bash
npx prisma db push
npm run db:seed
```

### 4. Run Automated Test Suite
```bash
npm test
```
*Executes all unit, security, and live end-to-end HTTP integration tests.*

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 👥 Default Seed Accounts (Two-Level Passwords)

| Role | Username / Email | Login Password | Level-2 Authorization Password | Branch Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `owner@tasha.ae` (`owner`) | `OwnerLogin@2026!` | `OwnerAuth@2026!` | All Branches (Consolidated) |
| **HR Manager** | `hrmanager@tasha.ae` (`hrmanager`) | `HrManager@2026!` | `HrAuth@2026!` | All Branches |
| **Branch Manager** | `bm.bateen@tasha.ae` (`bmbateen`) | `BranchMgr@2026!` | `BranchAuth@2026!` | Al Bateen (BR-01) Only |
| **Finance Manager** | `finance@tasha.ae` (`finance`) | `FinanceMgr@2026!` | `FinanceAuth@2026!` | All Branches |
| **Compliance Officer**| `compliance@tasha.ae` (`compliance`) | `Compliance@2026!`| `ComplianceAuth@2026!`| All Branches |

---

## 📁 Repository Structure

```
├── prisma/
│   ├── schema.prisma       # 26+ production models (PostgreSQL)
│   └── seed.ts             # Complete idempotent UAE seed data
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/login/   # Login page with test profile cards
│   │   ├── (dashboard)/    # Enterprise dashboard shell & modules:
│   │   │   ├── dashboard/  # 8 KPI cards, ADAFSA score, audit stream
│   │   │   ├── business/   # Org profile, branches, licenses
│   │   │   ├── employees/  # Staff profiles, EOS calculator, documents
│   │   │   ├── documents/  # Legal archive, versioning, PDF preview
│   │   │   ├── procedures/ # PRO government procedure step tracker
│   │   │   ├── operations/ # Inventory, recipes, food cost, waste
│   │   │   ├── finance/    # Treasury wallets, expenses, payments, VAT 201
│   │   │   ├── compliance/ # ADAFSA inspections, checklists, EFST training
│   │   │   ├── audit/      # Chained ledger, JSON diffs, HMAC verifier
│   │   │   ├── notifications/ # Dynamic 30/60/90-day expiry tracking
│   │   │   ├── reports/    # Regulatory exports (MOHRE, FTA, ADAFSA)
│   │   │   └── settings/   # User accounts, dual passwords, branch scopes
│   │   └── api/            # 20+ secure REST API routes
│   ├── components/         # Shared UI components
│   │   ├── layout/         # Responsive Sidebar & Header
│   │   ├── pdf/            # In-browser PDF Viewer Modal
│   │   └── security/       # Level-2 Authorization Password Dialog
│   ├── i18n/               # Bilingual English & Arabic RTL provider
│   └── lib/                # Core enterprise libraries
│       ├── audit/          # HMAC-SHA256 chaining & verification
│       ├── auth/           # JWT sessions, bcrypt dual passwords
│       ├── db/             # Prisma database client singleton
│       ├── security/       # Server-side mutation-guard interceptor
│       └── storage/        # PDF magic bytes & local file storage
├── tests/
│   ├── security-and-business.test.ts # Unit & security test suite
│   └── e2e-http.test.mjs             # End-to-end HTTP integration suite
├── ARCHITECTURE.md         # Detailed architectural specification
├── SECURITY.md             # Threat model & Two-Level security docs
├── DATABASE.md             # Relational schema & indexing documentation
├── DEPLOYMENT.md           # Production deployment & Docker guidelines
├── ENVIRONMENT.md          # Environment variable reference
└── SETUP.md                # Step-by-step setup instructions
```

---

## 📜 Regulatory Standards Compliance

- **Labor Standards**: UAE Federal Decree-Law No. 33 of 2021 regarding the regulation of employment relationships.
- **Taxation**: UAE Federal Decree-Law No. 8 of 2017 on Value Added Tax (VAT 5%).
- **Public Safety**: Abu Dhabi Agriculture and Food Safety Authority (ADAFSA) Food Hygiene Regulations.
- **Financial Compliance**: Central Bank of the UAE & MOHRE Wages Protection System (WPS).
