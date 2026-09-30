# Testing & Quality Assurance Guide (TESTING.md)

This document details the automated testing architecture, test suites, execution commands, and verification criteria for the **UAE Restaurant Enterprise System**.

---

## 1. Test Architecture Overview

The system includes two comprehensive test suites:

1. **Security & Business Logic Test Suite** (`tests/security-and-business.test.ts`):
   - Verifies the Two-Level password security matrix.
   - Verifies RBAC permissions and branch-scoped object access control (IDOR defense).
   - Validates binary magic-byte PDF inspection (`%PDF-`).
   - Asserts non-destructive legal document versioning.
   - Tests UAE Federal Decree-Law No. 33 of 2021 End-of-Service gratuity algorithms.
   - Recalculates the HMAC-SHA256 audit ledger from Genesis to head sequence.
   - Computes recipe portion food cost and gross profit percentages against UAE F&B standards.

2. **Live HTTP End-to-End Integration Suite** (`tests/e2e-http.test.mjs`):
   - Tests live HTTP rendering of the Login interface and test profile selectors.
   - Exercises `POST /api/auth/login` and validates secure HTTP-Only session cookies.
   - Verifies session token hydration and actor scopes on `GET /api/auth/me`.
   - Queries `GET /api/dashboard/metrics` and asserts live PostgreSQL aggregations.
   - Streams PDF documents via `GET /api/documents/[id]/view` and inspects binary headers for in-browser viewing.
   - Tests mutation rejection with wrong Level-2 authorization password (HTTP 401/403).
   - Tests mutation acceptance with correct Level-2 authorization password (HTTP 200).
   - Executes `POST /api/audit/verify` to confirm that the live audit chain remains 100% mathematically intact.

---

## 2. Running Automated Tests

### Run Full Test Suite (Unit + HTTP E2E)
```bash
npm test
```

### Run Unit & Business Logic Tests Only
```bash
npx tsx tests/security-and-business.test.ts
```

### Run HTTP E2E Integration Suite Only
*(Ensure `npm run dev` or `npm run start` is listening on port 3000)*
```bash
node tests/e2e-http.test.mjs
```

---

## 3. Mandatory Security Verification Matrix

| Requirement | Test Assertion | Expected Behavior |
| :--- | :--- | :--- |
| **Two-Level Password Separation** | User enters Login Password in authorization prompt | **REJECTED**: Server denies mutation. |
| **Wrong Authorization Password** | User enters incorrect Level-2 authorization password | **REJECTED**: Server denies with HTTP 401/403. |
| **Correct Authorization Password** | User enters valid Level-2 authorization password | **ACCEPTED**: Server processes transaction and appends audit log. |
| **Branch Scoping (IDOR)** | Branch Manager of BR-01 attempts mutation on BR-02 | **REJECTED**: Server denies with HTTP 403 Forbidden. |
| **PDF Magic Bytes** | Upload non-PDF file renamed with `.pdf` extension | **REJECTED**: Magic byte validator flags invalid signature. |
| **Audit Ledger Immutability** | Cryptographic audit chain verification | **VERIFIED**: HMAC-SHA256 signature matches across all sequential entries. |
| **UAE EOS Calculation** | Service < 1 year: 0 AED; 1-5 yrs: 21 days/yr; > 5 yrs: 30 days/yr | **VERIFIED**: Gratuity computed with daily wage basis and 2-year statutory cap. |
