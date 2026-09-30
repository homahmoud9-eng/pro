# Database Architecture & Schema Specification (DATABASE.md)

This document describes the relational database schema, tables, foreign keys, indexes, and transactional boundaries implemented in the **UAE Restaurant Enterprise System** using PostgreSQL 16 and Prisma ORM.

---

## 1. Entity-Relationship Overview

The database contains **26 distinct models** organized into 8 functional modules:

```
[Organization] (Root Multi-Tenant Entity)
  │
  ├── [Branch] (Al Bateen BR-01, Yas Mall BR-02, Musaffah BR-03)
  ├── [Department] (MGMT, HR, FIN, KIT, SRV, PROC, COMP)
  ├── [User] ── [UserSecurityProfile] (Login & Auth Password Hashes)
  │     ├── [UserRole] ── [Role] ── [RolePermission] ── [Permission]
  │     ├── [UserBranchScope] (Enforces Branch Isolation)
  │     └── [Session] / [SecurityEvent]
  │
  ├── [Document] (Legal Licenses, Tenancy Contracts, Passports, Visas)
  │     ├── [DocumentType]
  │     └── [DocumentVersion] (v1, v2, v3 Non-Destructive Storage)
  │
  ├── [Employee] (Workforce & WPS Filing Profile)
  │     ├── [AttendanceRecord] (Biometric/Punch Times)
  │     ├── [LeaveRequest] / [LeaveBalance]
  │     ├── [PayrollEntry] ── [PayrollPeriod] (WPS SIF Format)
  │     └── [EndOfServiceCalculation] (UAE Federal Decree-Law No. 33)
  │
  ├── [Procedure] ── [ProcedureStep] ── [ProcedureComment] (PRO Government Workflows)
  │
  ├── [InventoryItem] ── [Supplier] (Raw Ingredients & Cost Tracking)
  │     ├── [StockMovement] (Atomic Transfers & Inventory Adjustments)
  │     ├── [PurchaseOrder] ── [PurchaseOrderItem]
  │     ├── [Recipe] ── [RecipeIngredient] (Portion Food Cost Calculations)
  │     └── [WasteRecord] (Kitchen Spoilage & Write-Off Ledger)
  │
  ├── [Wallet] / [Expense] / [Payment] / [TaxRecord] (Treasury & 5% UAE VAT)
  │
  ├── [FoodSafetyChecklist] ── [FoodSafetyInspection] ── [FoodSafetyFinding] (ADAFSA)
  ├── [FoodHandlerTraining] (EFST Certification Tracker)
  │
  └── [AuditLog] ── [AuditChainHead] (HMAC-SHA256 Cryptographic Ledger)
```

---

## 2. Table Catalog

### 2.1 Core & Security
| Table | Description | Primary Key | Key Constraints & Indexes |
| :--- | :--- | :--- | :--- |
| `Organization` | Enterprise parent holding entity | `id` (UUID) | `@unique([code])` |
| `Branch` | Multi-unit operational locations | `id` (UUID) | `@unique([organizationId, code])` |
| `Department` | Functional divisions | `id` (UUID) | `@unique([organizationId, code])` |
| `User` | Administrative and staff users | `id` (UUID) | `@unique([organizationId, email])`, `@unique([username])` |
| `UserSecurityProfile`| Salting & hashing for dual passwords | `id` (UUID) | `@unique([userId])` |
| `Role` | RBAC roles (Owner, HR, Finance, etc.)| `id` (UUID) | `@unique([organizationId, name])` |
| `Permission` | Fine-grained capability codes | `id` (UUID) | `@unique([code])` |
| `UserBranchScope` | Maps users to authorized branch IDs | `id` (UUID) | `@unique([userId, branchId])` |

### 2.2 Documents & Versioning
| Table | Description | Primary Key | Key Constraints & Indexes |
| :--- | :--- | :--- | :--- |
| `DocumentType` | Regulatory categorization rules | `id` (UUID) | `@unique([organizationId, nameEn])` |
| `Document` | Master record for licenses, contracts| `id` (UUID) | `@@index([organizationId, entityType, entityId])`, `@@index([expiryDate])` |
| `DocumentVersion` | Historical immutable PDF snapshots | `id` (UUID) | `@@unique([documentId, versionNumber])` |

### 2.3 Operations & Inventory
| Table | Description | Primary Key | Key Constraints & Indexes |
| :--- | :--- | :--- | :--- |
| `InventoryItem` | Raw food ingredients and stock | `id` (UUID) | `@@unique([organizationId, sku])`, `@@index([branchId, category])` |
| `StockMovement` | In/out ledger movements | `id` (UUID) | `@@index([organizationId, itemId, createdAt])` |
| `Recipe` | Menu products with portion cost | `id` (UUID) | `@@unique([organizationId, sku])` |
| `RecipeIngredient`| Ingredient quantity & unit cost | `id` (UUID) | `@@index([recipeId])` |
| `WasteRecord` | Inventory write-offs and spoilage | `id` (UUID) | `@@index([organizationId, createdAt])` |
| `Supplier` | Approved vendors with TRN & terms | `id` (UUID) | `@@unique([organizationId, code])` |

### 2.4 Cryptographic Audit Trail
| Table | Description | Primary Key | Key Constraints & Indexes |
| :--- | :--- | :--- | :--- |
| `AuditLog` | Immutable HMAC hash-chained ledger | `id` (UUID) | `@@unique([organizationId, sequenceNumber])`, `@@index([actorUserId])`, `@@index([occurredAt])` |
| `AuditChainHead`| Head sequence and hash tracker | `organizationId` | `@unique([organizationId])` |

---

## 3. Database Transactions (ACID Guarantees)

Multi-step business workflows are wrapped in `prisma.$transaction`:

1. **Inter-Branch Stock Movement**:
   - Updates source branch `InventoryItem.currentStock`.
   - Creates `StockMovement` (type `TRANSFER_OUT`).
   - Updates destination branch `InventoryItem.currentStock`.
   - Creates `StockMovement` (type `TRANSFER_IN`).
   - Creates sequential `AuditLog` with HMAC chaining.

2. **Legal Document Replacement**:
   - Calculates SHA-256 and saves file to storage.
   - Inserts new `DocumentVersion` with incremented `versionNumber`.
   - Updates `Document.currentVersionId` pointer and `expiryDate`.
   - Logs `DOCUMENT_REPLACE` event in the audit trail.

3. **Vendor Payment Settlement**:
   - Deducts liquidity from `Wallet.balance`.
   - Records `Payment` with bank transaction reference.
   - Updates `Supplier.balance`.
   - Writes `PAYMENT_CREATE` audit record.

---

## 4. Idempotent Seed Architecture

The seed script (`prisma/seed.ts`) is designed to run repeatedly without duplicate key errors:
- Executes clean deletions in strict foreign-key order (leaves to root).
- Uses `upsert` and unique keys across organizations, branches, and roles.
- Establishes a valid mathematical HMAC hash chain for initial audit entries.
