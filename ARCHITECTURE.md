# System Architecture & Technical Design

This document details the software architecture, design patterns, security frameworks, and domain models implemented in the **UAE Restaurant Enterprise System**.

---

## 1. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                           PRESENTATION LAYER (Next.js 16)                         |
|  - Modern Dark-Themed Dashboard       - Bilingual English / Arabic RTL Context    |
|  - In-Browser PDF Preview Modal       - Two-Level Authorization Password Modal    |
|  - Responsive Mobile / Tablet Grid    - Interactive EOS & Food Cost Calculators   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | JSON over HTTPS (Cookies / Bearer)
                                          v
+-----------------------------------------------------------------------------------+
|                             API & SECURITY GATEWAY                                |
|  - JWT Session Verification (HTTP-Only)       - Rate Limiting Interceptor         |
|  - Role-Based Access Control (RBAC)           - IDOR Branch Scoping Defense       |
|  - Server-Side Mutation Guard (Two-Level Auth Verification for all Writes)        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                DOMAIN SERVICES                                    |
|  +--------------------------+  +--------------------------+  +------------------+ |
|  | Document Service         |  | Operations & Kitchen     |  | Finance & VAT    | |
|  | - Magic Bytes Validator  |  | - Atomic Stock Transfer  |  | - Treasury Wallet| |
|  | - SHA-256 Checksum Calc  |  | - Recipe Food Cost Calc  |  | - 5% UAE VAT 201 | |
|  | - Version History Branch |  | - Waste Tracking         |  | - Supplier Payout| |
|  +--------------------------+  +--------------------------+  +------------------+ |
|  +--------------------------+  +--------------------------+  +------------------+ |
|  | HR & Compliance Service  |  | ADAFSA Food Safety       |  | PRO Procedures   | |
|  | - UAE EOS Gratuity D33   |  | - Inspection Checklists  |  | - Multi-Step Flow| |
|  | - WPS Payroll Prep       |  | - EFST Staff Tracking    |  | - Attestation Doc| |
|  +--------------------------+  +--------------------------+  +------------------+ |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        CRYPTOGRAPHIC AUDIT SERVICE (HMAC-SHA256)                  |
|  - Canonical JSON Serializer (RFC 8785)        - Sequence Number Monotonicity     |
|  - Chained Hash: HMAC(prevHash + canonical(payload), AUDIT_SECRET)                |
|  - Continuous Audit Verifier (Mathematical re-computation from Genesis)           |
+-----------------------------------------+-----------------------------------------+
                                          |
                         +----------------+----------------+
                         |                                 |
                         v                                 v
+------------------------------------+   +------------------------------------+
|       RELATIONAL DATABASE          |   |       DOCUMENT OBJECT VAULT        |
|  - PostgreSQL 16 (Port 5435)       |   |  - Local Filesystem / S3 Ready     |
|  - Prisma ORM 6.4.1                |   |  - Isolated Directory Trees        |
|  - 26+ Normal Form Relational Models|  |  - No Direct Public Web Access     |
|  - ACID Transactions               |   |  - Streamed via Authenticated API  |
+------------------------------------+   +------------------------------------+
```

---

## 2. Core Architectural Principles

### 2.1 Separation of Concerns
- **UI Components** (`src/components/*`): Pure presentation and interactive user feedback. No business logic or permission evaluations occur solely in the UI.
- **API Endpoints** (`src/app/api/*`): Strict request validation, session hydration, and HTTP transport formatting.
- **Mutation Guard** (`src/lib/security/mutation-guard.ts`): Centralized, server-side gatekeeper enforcing:
  1. Active authenticated session.
  2. Active account state.
  3. Granular RBAC permissions (`employee.create`, `inventory.adjust`, etc.).
  4. Cryptographic verification of Level-2 Authorization Password.
  5. Branch scoping validation (preventing Cross-Branch IDOR attacks).
  6. Automated immutable audit record creation.
- **Data Access** (`src/lib/db/prisma.ts`): Type-safe ORM access enforcing database constraints, foreign keys, and indexes.

### 2.2 Two-Level Security Credentials Model
Every privileged user maintains two independent, cryptographically salted credentials (`bcryptjs`, 10 rounds):
- **Credential 1: Login Password**: Used solely for initial authentication and token issuance.
- **Credential 2: Level-2 Authorization Password**: Required for executing sensitive mutations (approving payroll, adjusting salaries, inter-branch stock transfers, legal document replacement, user provisioning).
- **Security Rule**: The backend strictly rejects attempts to substitute the login password as the authorization password.

### 2.3 Cryptographic Audit Trail (HMAC Hash-Chaining)
Audit records are strictly append-only. The system implements a blockchain-like cryptographic hash chain:
$$H_n = \text{HMAC-SHA256}(H_{n-1} \parallel \text{CanonicalJSON}(\text{Payload}_n), \text{Secret})$$
Where:
- $H_0 = \text{"0000000000000000000000000000000000000000000000000000000000000000"}$
- $\text{CanonicalJSON}$ recursively sorts object keys and formats dates in standard ISO strings according to RFC 8785.
- The `POST /api/audit/verify` endpoint verifies the integrity of the ledger from Sequence 1 to present. Any database tampering or row deletion causes immediate signature failure.

### 2.4 Legal Document Management & Versioning
- **Magic Bytes Validation**: Uploaded files are inspected for `%PDF-` header signature (bytes `0x25, 0x50, 0x44, 0x46, 0x2D`). Files disguised with `.pdf` extension containing executable or malicious payloads are rejected immediately.
- **Non-Destructive Versioning**: Existing documents are never updated in-place. Uploading a replacement creates a new `DocumentVersion` linked to the parent `Document` record, incrementing `versionNumber`, calculating the SHA-256 hash, and archiving historical files.
- **In-Browser Viewing**: Documents are streamed over authenticated HTTP endpoints (`GET /api/documents/[id]/view`) with `Content-Disposition: inline` and `X-Content-Type-Options: nosniff`. Downloads require explicit `*.download` permission.

### 2.5 UAE Labor Law End-of-Service (EOS) Engine
Calculates employee terminal gratuity based on **UAE Federal Decree-Law No. 33 of 2021**:
- Service $< 1$ year: 0 AED.
- Service $1 \le Y \le 5$: 21 days basic wage per year of service:
  $$\text{Gratuity} = Y \times 21 \times \left(\frac{\text{BasicSalary} \times 12}{365}\right)$$
- Service $> 5$ years: 21 days/year for first 5 years + 30 days/year for each additional year.
- Statutory Cap: Total gratuity cannot exceed 2 years' gross basic salary.

### 2.6 Atomic Inter-Branch Inventory Movement
Inter-branch transfers execute within a database transaction:
1. Validate source branch has sufficient stock ($\ge \text{quantity}$).
2. Decrement source branch item inventory.
3. Increment or upsert destination branch item inventory.
4. Record two balanced `StockMovement` ledger entries (`TRANSFER_OUT` and `TRANSFER_IN`).
5. Require Level-2 Authorization Password and write HMAC audit record.
If any step fails, the entire transaction rolls back.
