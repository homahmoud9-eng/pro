# Application Security & Threat Model (SECURITY.md)

This document describes the defense-in-depth security architecture, credentials isolation model, threat mitigations, and compliance postures implemented in the **UAE Restaurant Enterprise System**.

---

## 1. Two-Level Security Credentials Model

A foundational requirement of the system is the **Dual-Password Security Model**, ensuring separation between session access and high-impact operational execution:

```
[User Ingress]
      |
      v
+-------------------------------+
|  1. Login Password            | ---> Authenticates Identity & Issues JWT Cookie
+-------------------------------+
      |
      | (Session Active)
      v
[Mutation Attempt] (e.g., Transfer Stock, Disburse Cash, Replace Legal Doc)
      |
      v
+-------------------------------+
|  2. Level-2 Authorization     | ---> Validated SERVER-SIDE on Every Mutation
|     Password                  |      Never cached in browser session
+-------------------------------+      Rejects Login Password if substituted
      |
      v
[Execute Database Transaction & Write HMAC Audit Log]
```

### Server-Side Validation Rules
- **No Client Trust**: The frontend modal is solely a collection interface. The backend API verifies the raw password hash on every state change.
- **Credential Separation**: `verifyAuthorizationPassword(userId, authPassword)` checks `userSecurityProfile.authorizationPasswordHash`. If the user submits their login password, verification strictly fails with HTTP 403 Forbidden.
- **Temporary Password Flagging**: New users can be flagged with `temporaryAuthPassword: true`, requiring an immediate password reset before performing protected actions.

---

## 2. OWASP Top 10 Mitigations Matrix

| OWASP Threat Category | System Vulnerability Risk | Implemented Production Defense |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | User changes URL/body ID to access another branch's documents or staff. | `authorizeMutation` checks `targetBranchId` against `actor.branchScopes`. Branch managers restricted to their assigned branch (`BR-01`) cannot manipulate records for `BR-02` or `BR-03`. |
| **A02: Cryptographic Failures** | Data in transit or sensitive passwords exposed. | Passwords hashed using `bcrypt` (10 rounds). Audit logs hashed using `HMAC-SHA256` with server secret. JWT stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies. |
| **A03: Injection** | SQL Injection via form fields or query params. | All database interactions utilize parameterized queries via Prisma ORM 6.4.1. No raw SQL strings or untrusted query interpolations. |
| **A04: Insecure Design** | Silent overwrite of critical business licenses. | Legal documents use non-destructive versioning. Prior versions (`v1`, `v2`, etc.) remain archived and immutable on disk with SHA-256 integrity hashes. |
| **A05: Security Misconfiguration** | Missing security headers or leaked stack traces. | `next.config.js` injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. Production error handlers suppress internal stack traces. |
| **A06: Vulnerable Components** | Outdated or insecure dependencies. | Locked dependencies: `prisma@6.4.1`, `@prisma/client@6.4.1`, `bcryptjs@3.0.3`, `jsonwebtoken@9.0.3`. Automated package audit checks. |
| **A07: Identification & Auth Failures** | Brute-force attacks on login or authorization. | Rate limiting table `rateLimitAttempt` tracks failed attempts per IP and username. Failed login attempts generate `SecurityEvent` log entries. |
| **A08: Software & Data Integrity** | Spoofed PDF uploads containing malicious payloads. | `validatePdfBytes()` verifies the magic byte sequence `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Max size capped at 25MB. Generated random UUID storage keys prevent path traversal. |
| **A09: Logging & Monitoring Failures**| Audit records altered or deleted by rogue admin. | Audit ledger is strictly append-only. Each log entry is HMAC-SHA256 chained to its predecessor. `verifyAuditChain()` algorithm mathematically proves chain integrity from Genesis. |
| **A10: Server-Side Request Forgery** | Insecure URL fetching. | System does not accept untrusted external URLs for server-side fetching. Document previews stream solely from authenticated internal storage paths. |

---

## 3. Legal Document Security & PDF Handling

1. **Storage Isolation**: Documents are stored in isolated folder structures: `uploads/{organizationId}/{documentId}/v{versionNumber}/{uuid}.pdf`.
2. **Access Decoupling**:
   - `VIEW_DOCUMENT`: Grants access to inline PDF streaming (`Content-Disposition: inline`).
   - `DOWNLOAD_DOCUMENT`: Decoupled permission required for file export (`Content-Disposition: attachment`).
3. **MIME & Signature Verification**:
   - Both MIME type (`application/pdf`) and binary magic bytes (`%PDF-`) must validate before a file is written to storage.

---

## 4. Audit Trail Cryptographic Specification

The audit trail cannot be modified or re-sequenced without breaking the cryptographic chain.
- Every event computes a canonical payload JSON string sorted by object keys (RFC 8785 standard).
- Dates are converted to ISO 8601 strings.
- Hashes are generated via HMAC-SHA256 using `AUDIT_CHAIN_SECRET`.
- The live verification API (`POST /api/audit/verify`) traverses every sequential entry and recalculates the expected signature, returning `valid: true` or pinpointing the exact corrupted sequence number.
