# UAE Restaurant Enterprise Management System

## Agent Implementation Specification — Production-Ready, Security-First, Audit-First

**Document status:** Build specification / source of truth for the coding agent  
**Research date:** 2026-09-30  
**Primary deployment context:** UAE restaurant business; architecture must support multiple UAE emirates, with an Abu Dhabi compliance starter profile  
**Primary currency:** AED  
**Primary timezone:** `Asia/Dubai`  
**Languages:** Arabic (`ar-AE`, RTL) + English (`en-AE`, LTR)  
**Initial deployment model:** One restaurant organization, multi-branch capable; architecture must be tenant-safe so additional organizations can be enabled later.

---

## 0. Mission

Build a full internal enterprise web application for a UAE restaurant to manage:

- Company/business information
- Branches
- Employees
- Employee HR records
- Employee legal/compliance documents
- Business/legal documents
- PDF upload, secure in-browser viewing, version history, access control, and audit history
- Employee procedures / HR processes
- Business procedures / operational processes
- Attendance and shifts
- Leave management
- Payroll preparation
- WPS-ready payroll workflows
- End-of-service calculation workflow
- Inventory
- Purchasing
- Suppliers
- Recipes / bill of materials
- Food cost
- Waste
- Sales and POS integration-ready data
- Expenses
- Payments
- Wallet / cash-flow overview
- VAT / tax record support
- Food-safety compliance and inspection workflows
- Notifications and expiry reminders
- Reports
- User accounts
- Roles and granular permissions
- Strong authorization-password protection for **every mutation**
- Complete immutable audit trail showing exactly **who changed what, when, where, before, and after**
- Security controls suitable for sensitive employee and legal-document data

This is not a simple restaurant dashboard. It is an **enterprise operations, HR, compliance, finance, and document-management system**.

Do not clone another application's branding, source code, or exact UI. The product may use familiar enterprise patterns such as KPI cards, tables, sidebars, dashboards, workflows, and audit trails.

---

# 1. Non-Negotiable Product Rules

These requirements are mandatory and must not be treated as optional polish.

## 1.1 Legal/compliance documents must have PDF files

Any record classified as a legal, governmental, regulatory, licensing, tax, employment, identity, permit, contract, certificate, or compliance document must have at least one PDF attachment.

Examples include:

- Trade license
- Commercial/business license
- Branch license/permit
- Lease / tenancy documents
- Government permits
- Employee passport
- Emirates ID
- Visa / residence document
- Work permit
- Employment contract
- Health insurance documents
- Food-safety certificates
- Food-handler training certificates
- HACCP-related certificates/records where applicable
- Tax documents
- Tax invoices
- Supplier legal documents
- Government inspection reports
- Government notices
- Any configurable document type marked `requiresPdf = true`

The system must allow administrators to create additional document types and mark them as legal/compliance types.

## 1.2 PDF preview must work inside the web application

Users with view permission must be able to open the PDF inside the application.

Required capabilities:

- Page navigation
- Zoom in/out
- Fit to width / page
- Search text where the PDF permits it
- Full-screen mode where browser supports it
- Page count
- Loading/error states
- Mobile-friendly viewer
- Optional download button based on permission

The application must never expose a public storage URL for sensitive documents.

## 1.3 Every mutation requires the authenticated user's authorization password

Every operation that creates, updates, deletes, replaces, uploads, approves, rejects, posts, imports, exports, or otherwise changes persistent business data must require:

1. An authenticated user session
2. A valid role/permission check
3. A valid **authorization password** belonging to that same user

This applies to all mutation categories, including ordinary edits.

Examples:

- Create employee
- Edit employee
- Change salary
- Upload PDF
- Replace PDF
- Delete/void document
- Create expense
- Update expense
- Create payment
- Edit inventory quantity
- Post stock adjustment
- Change supplier data
- Change recipe
- Change role
- Change permissions
- Create procedure
- Advance procedure status
- Approve an action
- Delete or archive data

Viewing data does not require the authorization password unless a specific policy marks the view as sensitive.

## 1.4 Authorization password is separate from the login password

Each user has:

- Login password: authenticates the session
- Authorization password: authorizes mutations

Never store either password in plaintext.

Never expose the authorization-password hash to the client.

Never log passwords.

Recommended password hashing: **Argon2id** using parameters meeting or exceeding the current OWASP guidance. See the Security section.

## 1.5 Permission check cannot be bypassed by knowing the password

A valid authorization password alone is never enough.

The server must enforce:

```text
Authenticated?
  AND
Account active?
  AND
Permission granted?
  AND
Scope allows the target branch/entity?
  AND
Authorization password valid?
  AND
Required policy/approval satisfied?
= ALLOW
```

If any check fails: deny the mutation.

## 1.6 The actor comes from the server-side session

Never accept `performedByUserId`, `actorId`, `createdBy`, `updatedBy`, or similar actor identity from client input for security/audit purposes.

The backend must derive the actor from the authenticated session.

Store a stable `userId` and a human-readable name/email snapshot so historical audit records remain understandable even after the user's name changes.

## 1.7 Audit log is append-only

Audit records must not be editable or deletable through the application.

The application must not expose an `updateAuditLog()` or `deleteAuditLog()` operation.

The database should additionally enforce this with database permissions/triggers where practical.

## 1.8 Never physically delete compliance documents by default

A normal user delete action must create a tombstone/archive state or a new status such as `VOIDED`, not physically erase the underlying evidence.

Physical deletion is reserved for a controlled retention/disposal workflow requiring a dedicated permission and audit event.

## 1.9 Server-side authorization is the real security boundary

Hiding an Edit button is UX only.

Every protected route, Server Action, mutation function, and file endpoint must independently check authentication, authorization, scope, and authorization password where required.

## 1.10 AED is the default currency

All financial screens must display AED by default.

Store currency as an ISO-like field such as `AED` rather than hard-coding the string into financial logic.

## 1.11 Bilingual UI is first-class

Every user-facing string must come from translations.

Arabic must support RTL correctly.

Do not concatenate English strings directly inside components when a translation key can be used.

## 1.12 No hard-coded legal rules without effective dates and sources

Legal/work rules, tax rules, WPS rules, leave policies, document requirements, retention periods, and food-safety requirements must be represented as configurable/versioned policies whenever possible.

A rule must contain:

- Name
- Description
- Jurisdiction
- Effective date
- Optional expiry date
- Source/reference URL
- Notes
- Active/inactive state

This is required because regulations and procedures can change.

---

# 2. Research / Compliance Baseline

The system is designed around current public UAE information as researched on 2026-09-30. This section is implementation guidance, not legal advice. The restaurant must validate its exact obligations with its relevant authority/advisor.

## 2.1 UAE personal-data protection

The UAE Personal Data Protection Law is Federal Decree-Law No. 45 of 2021. The official UAE portal describes it as a framework for confidentiality, privacy, data-management governance, and security obligations, including controls around processing and cross-border transfer. The system therefore treats employee identity documents, contact details, government identifiers, health-related/insurance information, salaries, and similar data as sensitive operational data.

Official source: https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws

## 2.2 UAE private-sector employment

Federal Decree-Law No. 33 of 2021, as amended, governs employment relationships in the UAE private sector. The system should therefore support contracts, employee records, working time, overtime, leave, public holidays, termination, end-of-service benefits, and related HR workflows.

Official source: https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/employment-laws-and-regulations-in-the-private-sector

## 2.3 Working hours and overtime

The UAE government currently describes normal private-sector working hours as 8 hours per day or 48 hours per week, with rules for breaks, overtime, and special situations. The software must make these rules configurable rather than burying fixed numbers throughout the code.

Official source: https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/working-hours

## 2.4 Annual leave

The UAE government states that private-sector employees are entitled to annual leave under the Labour Law; for service of one year or more the public guidance states 30 days of paid annual leave, with a proportional monthly entitlement where service exceeds six months but is less than one year. Implement leave policies as versioned rules and do not assume every employment category has identical treatment.

Official source: https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/types-of-leaves-and-entitlements-in-the-private-sector/annual-leave

## 2.5 End-of-service benefits

The official UAE government portal describes a gratuity structure for eligible full-time workers based on years of service and basic salary, including 21 days' salary per year for more than one year and less than five years, then 30 days per year after five years, subject to the applicable law and limits. The system must implement this as a configurable, effective-dated calculation policy rather than assuming it applies identically to all work arrangements and cases.

Official source: https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/end-of-service-benefits-for-employees-in-the-private-sector

## 2.6 Wage Protection System (WPS)

The UAE currently has an electronic WPS framework for salary payment and monitoring. The official UAE government page updated in June 2026 references Ministerial Resolution No. 340 of 2026 concerning WPS and states that salaries for the previous month are due on the first day of each Gregorian month under the described framework. The Central Bank also describes UAEWPS as the electronic salary-transfer infrastructure used for wage monitoring.

The application must therefore include:

- Payroll period
- WPS eligibility state
- Gross salary
- Contract/basic salary fields
- Allowances
- Deductions
- Net salary
- Payroll approval workflow
- WPS-ready export adapter
- WPS submission/reference tracking fields
- Payment reconciliation
- Exceptions and evidence

Do **not** invent a WPS bank-file format. Create an adapter/interface so the exact format can be implemented from the restaurant's approved bank/exchange/WPS provider specification.

Official sources:

- https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/payment-of-wages
- https://centralbank.ae/en/our-operations/payments-and-settlements/uae-wages-protection-system-uaewps/

## 2.7 VAT and tax records

The UAE Federal Tax Authority states that taxable persons must retain VAT invoices for at least five years. FTA guidance also describes accounting, inventory, sales, purchases, wages/salaries, fixed assets, tax invoices, credit notes, and related tax evidence as records to retain. Corporate Tax guidance states records supporting the tax position are retained for seven years following the relevant tax period.

The system must therefore support long-term searchable digital records and configurable retention policies.

Official sources:

- https://tax.gov.ae/en/faq.aspx?keyword=How+long+must+a+taxable+person+retain+VAT+invoices+for%3F
- https://tax.gov.ae/DataFolder/Files/Pdf/2022/Get%20to%20know%20your%20Tax%20Obligations.pdf
- https://tax.gov.ae/Datafolder/Files/Guides/CT/R%20CT%20Registration%20of%20Juridical%20Persons%20-%20EN%20-%2031%2008%202023%20final.pdf

Important: tax retention periods are not a blanket rule that every restaurant document should be auto-deleted after five or seven years. The application must use document-specific retention classes.

## 2.8 Abu Dhabi food-safety baseline

For an Abu Dhabi restaurant, ADAFSA states that the Essential Food Safety Training (EFST) program is mandatory for food handlers in Abu Dhabi. ADAFSA food-service guidance also discusses trained food handlers and HACCP principles/requirements for food establishments.

The system should therefore include a configurable food-safety compliance module supporting:

- Food handler records
- EFST certificate/document tracking
- Training dates
- Expiry/renewal reminders where applicable
- HACCP-related records/checklists
- Self-inspection records
- Corrective actions
- Evidence attachments

Do not hard-code a universal “one certificate = one fixed validity period” rule unless that period is confirmed by the applicable authority/current scheme.

Official sources:

- https://www.adafsa.gov.ae/ar/work/food-safety/Documents/FAQs%20EFST%20Arabic-English%20version-%20edited%20-%20Nov25.pdf
- https://www.adafsa.gov.ae/CMS/Guidelines/Guideline%20No%20%286%29%20of%202019%20Food%20Service%20Design.pdf
- https://www.adafsa.gov.ae/

---

# 3. Product Architecture

## 3.1 Recommended stack

Use a modern full-stack TypeScript architecture.

### Frontend / application

- Next.js App Router, Next.js 16 or the current stable major at implementation time if later and compatible
- TypeScript strict mode
- React
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system
- Lucide icons
- React Hook Form
- Zod for server/client validation
- TanStack Query only where client-side server-state caching is materially useful; do not introduce it everywhere unnecessarily

Next.js 16 renamed the middleware convention to `proxy.ts`. Proxy can be used for optimistic route protection, but it must **not** be the only security boundary; authorization must still happen at the data-access/server-action layer.

Official references:

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/getting-started/proxy
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy

### Authentication

Recommended:

- Better Auth or the current stable security-focused auth library with strong Next.js support
- Email/username + password
- Optional/required TOTP 2FA for Owner and other high-privilege roles
- Secure server-side sessions
- Password reset
- Session revocation
- Active-session list for owner/security administrators

Better Auth currently documents Next.js support including email/password, password reset, two-factor authentication, session management, organization/member/role features.

Official reference: https://better-auth.com/docs/examples/next-js

### Backend

- Next.js Server Actions / Server Functions where suitable
- Route Handlers for streaming/file endpoints, webhooks, external adapters, and integration APIs
- Centralized Data Access Layer (`DAL`)
- Centralized authorization service
- Transactional mutation service

Next.js explicitly recommends checking authorization before mutations and centralizing secure authorization close to the data source.

### Database

- PostgreSQL
- Prisma ORM
- PostgreSQL JSONB where semi-structured data is justified
- Strong foreign keys
- Unique constraints
- Composite indexes
- Soft-delete fields where appropriate
- Database transactions for business operations spanning multiple writes

Prisma provides interactive transactions and recommends transactions for multi-write business operations.

References:

- https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions
- https://www.prisma.io/docs/orm/fundamentals/transactions

### File storage

Use a private S3-compatible object store.

Preferred characteristics:

- Private bucket
- Object versioning enabled where supported
- Encryption at rest
- Lifecycle policies configurable
- Region configurable
- Short-lived signed URLs only after application authorization, or authenticated proxy streaming through the application

A signed URL is time-limited but can be used by anyone possessing it while active. Therefore signed URLs must be short-lived and issued only after the app has already authorized access.

Reference: https://docs.cloud.google.com/storage/docs/access-control/signed-urls

### Background jobs / scheduled tasks

Use one of:

- Redis + BullMQ
- pg-boss
- A managed job service

The job system must handle:

- Document expiry checks
- Notification delivery
- Daily compliance scans
- Payroll reminders
- Recurring inventory checks
- Report generation
- Antivirus scan completion callbacks if asynchronous

Do not rely on the browser being open for scheduled functionality.

### Deployment

Support:

- Docker
- PostgreSQL managed service
- Private object storage
- HTTPS
- Automated migrations
- Background worker
- Cron/scheduled job runner

The project must be deployable on a modern Node.js-compatible platform. If Vercel is used for the Next.js frontend, keep background work in a separate worker/service.

---

# 4. High-Level Module Map

```text
APPLICATION
│
├── Dashboard
│
├── Business
│   ├── Company Profile
│   ├── Branches
│   ├── Licenses & Permits
│   ├── Business Documents
│   └── Business Procedures
│
├── Employees
│   ├── All Employees
│   ├── Employee Profile
│   ├── Employee Documents
│   ├── Employee Procedures
│   ├── Attendance
│   ├── Shifts
│   ├── Leave
│   ├── Payroll
│   └── End of Service
│
├── Operations
│   ├── Orders / Sales
│   ├── Inventory
│   ├── Stock Movements
│   ├── Purchasing
│   ├── Suppliers
│   ├── Recipes
│   ├── Food Cost
│   ├── Waste
│   └── Food Safety
│
├── Finance
│   ├── Wallet
│   ├── Expenses
│   ├── Payments
│   ├── Income
│   ├── Payables
│   ├── Receivables
│   ├── VAT Records
│   ├── Corporate Tax Records
│   └── Financial Reports
│
├── Compliance
│   ├── Compliance Calendar
│   ├── Document Expiry Center
│   ├── Food Safety
│   ├── HR Compliance
│   ├── Government Procedures
│   └── Evidence Center
│
├── Reports
│
├── Notifications
│
├── Audit
│   ├── Activity Log
│   ├── Document History
│   ├── Login/Security Log
│   └── Change History
│
└── Settings
    ├── Users
    ├── Roles
    ├── Permissions
    ├── Policies
    ├── Document Types
    ├── Procedure Types
    ├── Notification Rules
    ├── Branch Settings
    └── System Settings
```

---

# 5. User Roles and Permission Model

Do not hard-code access based only on role names. Build a permission engine.

## 5.1 Core roles

### Owner

Full business access.

Capabilities:

- All branches
- All employees
- Finance
- HR
- Compliance
- User/role management
- Audit log viewing
- Policy configuration
- Document retention configuration
- Security configuration

Owner should require 2FA by policy.

### General Manager

- Business overview
- Operations
- Employees
- Branches assigned
- Attendance
- Inventory
- Suppliers
- Expenses within approved thresholds
- Reports

### HR Manager

- Employee records
- Employee documents
- Employee procedures
- Attendance
- Leave
- Payroll preparation
- HR reports

No finance or role-administration permissions unless explicitly granted.

### HR Officer

Limited employee/document operations.

### Accountant / Finance Manager

- Wallet
- Expenses
- Payments
- Income
- Payroll finance
- Tax records
- Financial reports

### Branch Manager

Access only to assigned branch(es).

### Inventory Manager

- Inventory
- Purchasing
- Stock movement
- Suppliers
- Waste

### Kitchen Manager

- Recipes
- Food cost
- Kitchen operations
- Waste
- Food-safety operational tasks

### Compliance Officer

- Documents
- Compliance calendar
- Procedures
- Food safety
- Audit read access

### Auditor (read-only)

Read-only access to approved modules and audit logs.

No mutations.

## 5.2 Permission naming

Use granular permissions such as:

```text
business.read
business.create
business.update
business.delete

branch.read
branch.create
branch.update
branch.delete

employee.read
employee.create
employee.update
employee.delete
employee.salary.read
employee.salary.update
employee.archive

attendance.read
attendance.create
attendance.update
attendance.approve

leave.read
leave.create
leave.update
leave.approve
leave.reject

payroll.read
payroll.create
payroll.update
payroll.approve
payroll.export

procedure.read
procedure.create
procedure.update
procedure.delete
procedure.advance
procedure.approve

business_document.read
business_document.upload
business_document.replace
business_document.download
business_document.archive
business_document.delete

employee_document.read
employee_document.upload
employee_document.replace
employee_document.download
employee_document.archive
employee_document.delete

audit.read
audit.export

finance.read
expense.create
expense.update
expense.approve
payment.create
payment.update
wallet.read
wallet.adjust

inventory.read
inventory.create
inventory.update
inventory.adjust
inventory.transfer
inventory.approve

supplier.read
supplier.create
supplier.update
supplier.archive

recipe.read
recipe.create
recipe.update
recipe.publish

food_safety.read
food_safety.create
food_safety.update
food_safety.approve
food_safety.close_finding

user.read
user.create
user.update
user.disable
user.reset_authorization_password

role.read
role.create
role.update
permission.assign

settings.read
settings.update
```

## 5.3 Scope

Each permission may be global or branch-scoped.

Example:

```text
Branch Manager
permission: employee.update
scope: BRANCH
scopeIds: [branch-01, branch-02]
```

Never allow a user to mutate records outside their scope.

---

# 6. Authentication and Authorization Design

## 6.1 Login

Login fields:

- Username/email
- Password
- Optional organization selector if the application later supports multiple organizations

After successful login:

- Create secure session
- Record security event
- Record last-login metadata
- Optionally require 2FA

## 6.2 Session requirements

Use HTTPS only.

Session cookies:

- `HttpOnly`
- `Secure`
- `SameSite=Strict` where compatible with the application; otherwise `Lax`
- Prefer `__Host-` prefix for primary session cookie when deployment allows it
- No auth/session tokens in `localStorage`
- Short-ish idle timeout
- Absolute session lifetime
- Session revocation support

OWASP explicitly recommends secure, HttpOnly cookies, HTTPS, strict session handling, and avoiding storage of session IDs/tokens in browser storage.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

## 6.3 Login password

Store using Argon2id.

Never log the password.

Rate-limit login attempts.

Implement:

- Account lockout or adaptive throttling
- Suspicious login detection
- Session revocation
- Password reset
- Strong password policy

## 6.4 Authorization password

Add a distinct credential field:

```text
UserSecurityProfile.authorizationPasswordHash
```

The owner/admin creating a user can set an initial authorization password.

Recommended flow:

1. Owner creates user.
2. Owner sets initial authorization password.
3. Backend stores only Argon2id hash.
4. The UI may mark it as `temporaryAuthorizationPassword = true`.
5. On first successful authorization, force the user to replace it if policy requires.
6. Owner cannot retrieve the old plaintext value.
7. Owner with `user.reset_authorization_password` may issue a reset and the event is logged.

The system must support the owner's requested behavior: an account creator may assign the password initially, but the stored value must remain non-reversible.

## 6.5 Mutation modal

Every mutation UI must use a shared component:

```text
Authorization Required

Action: Update Employee
Target: Ahmed Mohamed

Enter your authorization password:
[ • • • • • • • • ]

[ Cancel ]   [ Confirm & Save ]
```

The modal should not display the password as text.

After failure:

- Do not reveal whether another credential is correct
- Increment failed attempt counter
- Log authorization failure
- Apply rate limiting

## 6.6 Do not cache authorization success by default

The user's requirement is strict: every mutation requires the authorization password.

Therefore:

- Default behavior: ask for password every mutation
- Do not create a five-minute “edit mode” unless a future administrator explicitly enables such a policy
- Never silently reuse a previous authorization result across unrelated mutations

## 6.7 Server-side mutation guard

Implement a single reusable service such as:

```ts
authorizeMutation({
  actor,
  permission,
  organizationId,
  branchId,
  entityType,
  entityId,
  authorizationPassword,
})
```

This service must:

1. Load authenticated actor from session
2. Verify actor is active
3. Check organization membership
4. Check permission
5. Check branch scope
6. Verify authorization password
7. Check optional policy/approval rules
8. Return an authorization context

Never trust the client for actor identity, organization ID, or privilege escalation.

---

# 7. Audit Trail — Core Security Feature

## 7.1 Every mutation emits an audit event

For every create/update/delete/archive/upload/replace/approve/reject/export/payment/posting/change-of-permission event, create an audit record.

Required fields:

```text
id
organizationId
branchId
actorUserId
actorNameSnapshot
actorEmailSnapshot
action
module
entityType
entityId
entityDisplayName
requestId
sessionIdHash
ipAddress
userAgent
occurredAt
success
reason
changesBefore
changesAfter
changedFields
metadata
previousAuditHash
hash
```

## 7.2 Required human-readable history

Example UI:

```text
Ahmed Mohamed
Updated Employee

Employee: Mohamed Ali
Field: Salary
Before: AED 3,500
After: AED 4,000

30 Sep 2026 — 16:41 Dubai time
```

For sensitive fields:

- Mask government IDs
- Never show passwords
- Never record authentication secrets
- Avoid dumping entire PDFs into the audit log

## 7.3 Actor name snapshot

Store:

```text
actorUserId
actorNameSnapshot
actorEmailSnapshot
```

Why:

If the user later changes from `Ahmed Mohamed` to another display name, old audit records must still say who actually performed the action at the time.

## 7.4 Before/after diff

For ordinary structured records store a sanitized JSON diff:

```json
{
  "salary": {
    "before": 3500,
    "after": 4000
  },
  "branchId": {
    "before": "branch-1",
    "after": "branch-2"
  }
}
```

Do not store:

- Passwords
- Access tokens
- Full session cookies
- Encryption keys
- Full government ID values unless a documented compliance reason exists
- Raw file contents

OWASP's logging guidance emphasizes `when, where, who, what`, access-control failures, authentication events, data modification/deletion, file uploads, exports, privilege changes, and protecting logs from unauthorized modification or deletion.

References:

- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

## 7.5 Audit integrity

Implement a hash chain if practical:

```text
hash_n = HMAC_SHA256(
  AUDIT_CHAIN_SECRET,
  previousHash + canonicalJson(currentEvent)
)
```

Serialize audit events canonically before hashing.

Keep a chain head record and serialize inserts so concurrent writes do not create ambiguous chain order.

At minimum, store:

- `sequenceNumber`
- `previousHash`
- `hash`

Provide an owner-only **Verify Audit Integrity** tool that reports the first broken chain position, if any.

## 7.6 Audit access must itself be auditable

Viewing audit logs, exporting audit logs, or attempting to modify audit logs must create security events.

## 7.7 Audit filters

Required UI filters:

- Date range
- User
- Module
- Action
- Entity type
- Branch
- Success/failure
- Sensitive/security events

Search:

- Employee name
- Document name/type
- Record ID
- Invoice/payment reference
- Request ID

---

# 8. Document Management System

This module is mandatory and central to the product.

## 8.1 Document entity types

Documents can belong to:

- Organization
- Branch
- Employee
- Supplier
- Expense
- Payment
- Purchase
- Tax record
- Procedure
- Food-safety inspection
- Other configurable entities

## 8.2 Document metadata

Required:

```text
id
organizationId
branchId
entityType
entityId
documentTypeId
title
referenceNumber
issueDate
expiryDate
status
isLegal
requiresPdf
currentVersionId
createdBy
createdAt
updatedBy
updatedAt
retentionPolicyId
```

## 8.3 Document type configuration

Example:

```text
Document Type: Trade License
Category: Business Legal
requiresPdf: true
requiresExpiryDate: true
requiresReferenceNumber: true
expiryAlertDays: [90, 60, 30, 15, 7, 1]
downloadPermission: business_document.download
retentionClass: BUSINESS_LICENSE
```

Employee example:

```text
Document Type: Passport
Category: Employee Identity
requiresPdf: true
requiresExpiryDate: true
expiryAlertDays: [180, 90, 60, 30, 15, 7]
```

Do not assume all document types have the same expiry or legal requirements.

## 8.4 PDF upload pipeline

The upload must follow this flow:

```text
User selects PDF
      ↓
Client-side size/type pre-check
      ↓
Authenticated upload request
      ↓
Permission check
      ↓
Authorization password check
      ↓
Server validates extension
      ↓
Server validates actual file signature / MIME
      ↓
Virus/malware scan
      ↓
Calculate SHA-256
      ↓
Generate random storage object key
      ↓
Upload to private object storage
      ↓
Create DocumentVersion
      ↓
Create/update Document
      ↓
Write AuditLog
      ↓
Return viewer-safe document reference
```

OWASP's File Upload guidance says not to trust the `Content-Type` header, recommends allow-listed extensions, generated filenames, size limits, authorized uploaders, and storage separated from the web application's directly accessible filesystem.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

## 8.5 PDF security

Minimum requirements:

- Only allow PDF for legal document types
- Validate actual file signature
- Reject polyglots and malformed documents where feasible
- Limit file size
- Use application-generated object names
- Scan uploads for malware
- Never execute uploaded content
- Never make bucket public
- Use `Content-Disposition: inline` for preview endpoints where appropriate
- Use `X-Content-Type-Options: nosniff`
- Restrict access to authorized users

Default maximum PDF size: 25 MB.

Make size configurable.

## 8.6 Document versioning

Every replacement creates a new immutable version.

Example:

```text
Trade License

Version 1
Uploaded by Ahmed — 01 Jan

Version 2
Uploaded by Mahmoud — 03 Mar

Version 3
Uploaded by Sara — 02 Sep

Current: Version 3
```

Never overwrite the binary object in place.

## 8.7 Document history

Display:

- Version number
- Uploaded by
- Uploaded date/time
- File name
- File size
- SHA-256 checksum
- Status
- Expiry date
- Audit events

## 8.8 Secure PDF viewer

Recommended architecture:

```text
Browser
  ↓
GET /api/documents/:id/view
  ↓
Session authentication
  ↓
Document permission check
  ↓
Branch/org scope check
  ↓
Create short-lived viewer authorization
  ↓
Stream file or issue short-lived signed URL
  ↓
PDF.js viewer
```

Do not accept arbitrary storage object keys from the client.

## 8.9 Download permissions

Separate:

```text
document.read
document.download
```

A user may have:

```text
View: YES
Download: NO
```

Important implementation truth: once a browser is allowed to receive raw PDF bytes for rendering, a determined user may still be able to capture/save those bytes. Permission-controlled download is an application-level control, not a perfect technical barrier against screenshots or network inspection.

For extremely sensitive records, optionally use server-rendered page images/watermarked previews, while recognizing screenshots remain possible.

## 8.10 Expiry engine

Daily job:

```text
For every active document with expiryDate:
  calculate daysUntilExpiry
  match notification rules
  create in-app notification
  optionally send email/WhatsApp
```

Statuses:

```text
NO_EXPIRY
ACTIVE
EXPIRING_SOON
EXPIRED
VOIDED
ARCHIVED
```

Status is computed from policy plus manual state, not just a user-entered label.

---

# 9. Business / Restaurant Module

## 9.1 Company profile

Fields:

- Legal name Arabic
- Legal name English
- Trading name Arabic
- Trading name English
- Legal form
- Business/license number(s)
- Tax registration number(s)
- Contact email
- Phone
- Website
- Address
- Emirate
- City
- Country
- Primary currency
- Timezone
- Owner/contact person
- Notes

## 9.2 Licenses & permits

Use a reusable `ComplianceDocument` / `Document` model.

Examples may include:

- Trade license
- Food establishment permissions
- Municipality/authority documents
- Lease/tenancy evidence
- Fire/civil-defense related documents where applicable
- Tax registration documents
- Other activity-specific permits

The exact checklist must remain configurable by emirate/activity.

## 9.3 Branches

Fields:

- Branch name
- Branch code
- Address
- Phone
- Manager
- Opening date
- Status
- Opening hours
- Delivery zones
- Tax/VAT settings if needed
- Branch-specific bank/cash accounts
- Document set
- Food-safety profile

---

# 10. Employee Management Module

## 10.1 Employee profile

Required groups:

### Identity

- Employee ID
- Full name Arabic
- Full name English
- Gender
- Date of birth
- Nationality
- Photo

### Contact

- Mobile
- Alternate phone
- Email
- Address
- Emergency contact

### Employment

- Job title
- Department
- Branch
- Employment type
- Work model
- Contract start date
- Probation end date
- Joining date
- Status
- Manager

### Compensation

- Basic salary
- Allowances
- Overtime rate policy reference
- Other recurring components
- Payroll account/reference as allowed

Salary fields are high-sensitivity.

Require:

- `employee.salary.read`
- `employee.salary.update`
- authorization password for mutation
- optional two-person approval policy

### Government/HR references

- Passport number (masked in most views)
- Emirates ID number (masked in most views)
- Visa/reference numbers
- Work permit reference
- Insurance reference

Do not store unnecessary identifiers.

## 10.2 Employee status

```text
ACTIVE
ON_LEAVE
SUSPENDED
INACTIVE
TERMINATED
ARCHIVED
```

## 10.3 Employee search

Search by:

- Name
- Employee ID
- Mobile
- Job title
- Branch
- Nationality
- Status
- Document status

Sensitive identifiers should require elevated permissions.

---

# 11. Employee Documents

Typical configurable document set:

```text
Passport
Emirates ID
Visa / Residence
Work Permit
Employment Contract
Health Insurance
Food Safety / Food Handler Certificate
Medical / Fitness evidence where applicable
Other HR Documents
```

Each document:

- PDF required where legal/compliance type
- Expiry tracking
- Secure viewer
- Version history
- Uploaded-by information
- Audit events

Employee profile should show a compliance summary:

```text
Documents

Active        7
Expiring       2
Expired        1
Missing        1
```

---

# 12. Procedure / Workflow Management

Implement the same general concept seen in enterprise government/PRO systems, but customized for the restaurant.

## 12.1 Procedure types

Examples:

### Employee

- New employee onboarding
- Visa renewal
- Emirates ID renewal
- Work permit renewal
- Contract renewal
- Employee transfer
- Employee exit
- Final settlement
- Insurance renewal
- Food-safety training renewal

### Business

- Trade license renewal
- Branch opening
- Permit renewal
- Tax registration update
- Contract renewal
- Food-safety inspection preparation
- Government notice response

## 12.2 Procedure entity

```text
id
organizationId
branchId
typeId
subjectType
subjectId
title
description
status
priority
createdBy
assignedTo
dueDate
startedAt
completedAt
closedAt
createdAt
updatedAt
```

## 12.3 Statuses

```text
DRAFT
PENDING
IN_PROGRESS
WAITING_FOR_DOCUMENT
WAITING_FOR_APPROVAL
COMPLETED
REJECTED
CANCELLED
OVERDUE
```

## 12.4 Procedure steps

Each procedure type can define a template:

```text
Step 1 — Collect Documents
Step 2 — Review
Step 3 — Submit
Step 4 — Wait for Response
Step 5 — Approval
Step 6 — Update Record
Step 7 — Archive Evidence
```

A step can have:

- Assignee
- Due date
- Required document
- Required permission
- Required approval
- Notes
- Attachment
- Completion timestamp

## 12.5 Procedure timeline

Show an audit-friendly timeline:

```text
Created
  ↓
Assigned
  ↓
Documents uploaded
  ↓
Submitted
  ↓
In progress
  ↓
Approved
  ↓
Completed
```

Every transition is audited.

---

# 13. Attendance and Shift Management

## 13.1 Shifts

Support:

- Shift templates
- Start/end time
- Breaks
- Branch
- Department
- Employee assignment
- Overtime

## 13.2 Attendance states

```text
PRESENT
ABSENT
LATE
EARLY_LEAVE
ON_LEAVE
REST_DAY
HOLIDAY
OFF_SITE
```

## 13.3 Attendance records

```text
employeeId
branchId
workDate
scheduledStart
scheduledEnd
actualClockIn
actualClockOut
breakMinutes
lateMinutes
overtimeMinutes
status
source
notes
```

## 13.4 Corrections

Attendance corrections are mutations and require authorization password.

Example:

> User changes clock-in from 08:12 to 08:00.

Audit:

```text
Ahmed — Updated Attendance
Employee: John
Date: 2026-09-30
Clock-in: 08:12 → 08:00
Reason: Supervisor correction
```

## 13.5 UAE rules profile

Seed a configurable UAE private-sector policy with the current public baseline:

- Normal working hours: 8/day or 48/week
- Overtime policy fields
- Ramadan rule fields
- Rest-day/public-holiday behavior

Do not make these numbers impossible to change.

---

# 14. Leave Management

## 14.1 Leave types

Configurable default types:

- Annual
- Sick
- Maternity
- Parental
- Compassionate/Bereavement
- Hajj
- Unpaid
- Study
- Official/public holiday
- Company leave
- Other

## 14.2 Leave workflow

```text
Employee requests leave
        ↓
Manager reviews
        ↓
HR checks balance
        ↓
Approval / Rejection
        ↓
Attendance calendar updates
        ↓
Audit event
```

## 14.3 Leave balance engine

Store:

- Entitlement
- Accrued
- Used
- Carried over
- Pending
- Remaining

Do not calculate balances only from the UI. Use a server-side calculation engine.

---

# 15. Payroll

## 15.1 Payroll cycle

Support:

- Monthly payroll
- Ad-hoc payroll where policy allows
- Branch-level payroll
- Department totals
- Employee payslip records

## 15.2 Payroll components

```text
Basic salary
Housing allowance
Transport allowance
Food allowance
Other allowances
Overtime
Bonus
Commission
Advance deduction
Absence deduction
Other deduction
Net salary
```

Each component must be configurable.

## 15.3 Payroll process

```text
Draft
  ↓
Calculated
  ↓
HR Review
  ↓
Finance Review
  ↓
Approved
  ↓
WPS Export Ready
  ↓
Submitted / Paid
  ↓
Reconciled
  ↓
Closed
```

Every state transition is a mutation requiring authorization password and should be audited.

## 15.4 WPS adapter

Create interface:

```ts
interface WpsProviderAdapter {
  validatePayroll(input: PayrollBatch): Promise<ValidationResult>;
  generateFile(input: PayrollBatch): Promise<GeneratedFile>;
  parseResult(file: Buffer): Promise<WpsResult>;
}
```

Never hard-code a provider file format without official provider documentation.

## 15.5 Salary payment tracking

Store:

- Batch reference
- Payment date
- Bank/provider
- WPS reference
- Total amount
- Employee count
- Submitted by
- Approved by
- Evidence PDF/statement
- Result status

---

# 16. End-of-Service Module

Implement a versioned calculator.

Inputs:

- Joining date
- Termination date
- Basic salary
- Work model
- Eligible service period
- Unpaid leave exclusions where applicable
- Termination reason
- Leave balance
- Other entitlements/deductions

Outputs:

- Service duration
- Eligible gratuity amount
- Leave payout
- Other amounts
- Deductions
- Net settlement

Each calculation must store the policy version used.

The calculator is an operational aid and must support manual adjustment with reason + audit history.

---

# 17. Inventory

## 17.1 Item master

Fields:

- SKU
- Arabic name
- English name
- Category
- Unit
- Base unit
- Conversion factors
- Minimum stock
- Reorder point
- Maximum stock
- Current quantity
- Average cost
- Last purchase cost
- Supplier
- Branch
- Storage location
- Batch/lot tracking where needed
- Expiry tracking where needed

## 17.2 Stock movements

```text
PURCHASE
TRANSFER_IN
TRANSFER_OUT
SALE_CONSUMPTION
WASTE
ADJUSTMENT
RETURN_TO_SUPPLIER
OPENING_BALANCE
```

Every stock adjustment requires authorization password.

## 17.3 Stock history

Never simply overwrite quantity without creating a movement record.

Example:

```text
Chicken
Opening: 100 KG
Purchase: +50 KG
Waste: -5 KG
Transfer: -10 KG
Current: 135 KG
```

---

# 18. Purchasing

Workflow:

```text
Purchase Request
    ↓
Approval
    ↓
Purchase Order
    ↓
Goods Received
    ↓
Invoice Received
    ↓
Payment
```

Entities:

- Purchase request
- Purchase order
- Purchase order item
- Goods receipt
- Supplier invoice
- Payment

Required attachments can include PDF invoices and delivery notes.

---

# 19. Suppliers

Fields:

- Legal name
- Trading name
- Contact person
- Phone
- Email
- Address
- Tax/VAT data where applicable
- Bank/payment details (restricted)
- Contract documents
- Payment terms
- Credit limit
- Status

Supplier banking/payment information should be high sensitivity.

---

# 20. Recipe and Food-Cost System

## 20.1 Recipe

Fields:

- Dish name Arabic
- Dish name English
- SKU
- Category
- Yield quantity
- Portion size
- Ingredients
- Units
- Waste factor
- Preparation notes
- Selling price
- Published status

## 20.2 Cost calculation

For each ingredient:

```text
quantity × effective_unit_cost
```

Add:

- Ingredient waste
- Packaging
- Optional labor overhead
- Optional production overhead

Output:

- Cost per recipe
- Cost per portion
- Selling price
- Gross margin
- Food-cost percentage

All calculations must use effective-dated cost records to preserve historical accuracy.

## 20.3 Cost history

Never retroactively rewrite historical food cost.

Store:

```text
Ingredient cost effective from date
Ingredient cost effective to date
Source purchase
```

---

# 21. Waste Management

Track:

- Item
- Quantity
- Unit
- Branch
- Date/time
- Reason
- Station
- Employee
- Cost
- Photo/PDF evidence if needed

Reasons:

```text
SPOILAGE
EXPIRED
OVER_PRODUCTION
PREPARATION_WASTE
DAMAGED
QUALITY_ISSUE
UNKNOWN
OTHER
```

All posted waste records are audited.

---

# 22. Sales / Orders / POS Integration

The internal system should be POS-integration ready even if the first deployment uses manual import.

## 22.1 Sales channels

```text
DINE_IN
TAKEAWAY
DELIVERY
ONLINE
CATERING
OTHER
```

## 22.2 Daily sales summary

```text
Gross sales
Discounts
Refunds
Net sales
VAT/tax amount
Delivery revenue
Cash
Card
Online payment
Other
```

## 22.3 Integration architecture

Do not make the core ledger dependent on one POS vendor.

Create adapters:

```ts
interface PosAdapter {
  fetchOrders(range): Promise<Order[]>;
  fetchPayments(range): Promise<Payment[]>;
  fetchItems(range): Promise<SalesItem[]>;
}
```

Keep raw imported payloads separately from normalized records when legally and technically appropriate.

---

# 23. Expenses

Expense fields:

- Expense number
- Branch
- Category
- Supplier/payee
- Date
- Amount
- Currency
- VAT/tax amount
- Payment method
- Cost center
- Description
- Attachment
- Status
- Created by
- Approved by
- Paid status

Categories:

```text
Rent
Utilities
Payroll
Food Supplies
Packaging
Cleaning
Maintenance
Transport
Marketing
Government Fees
Professional Services
Bank Fees
Other
```

Every create/update/approve/pay action is audited.

---

# 24. Wallet / Financial Overview

Wallet is an operational financial view, not a substitute for a licensed accounting system unless accounting requirements are explicitly added.

Display:

- Current cash/bank balance entered/imported
- Revenue
- Payments
- Expenses
- Supplier payable
- Payroll payable
- Penalties/fines
- Tax liabilities
- Pending obligations

## 24.1 Double-entry-ready design

Even if full accounting is not in MVP, financial records must be structured so a ledger can be added later.

Suggested entities:

```text
LedgerAccount
JournalEntry
JournalLine
Payment
Expense
Income
TaxTransaction
```

Do not store a single mutable “wallet balance” as the only source of truth.

Balance should be derived from posted financial movements or reconciled snapshots.

---

# 25. Tax / VAT / Corporate Tax Record Center

This module is an evidence and operational record system.

Do not advertise that it files tax returns directly unless an official integration is actually implemented and tested.

## 25.1 VAT records

Support:

- Tax invoice
- Tax credit note
- Purchase invoice
- Sales invoice
- Input VAT
- Output VAT
- Adjustments
- Tax period
- Evidence PDF

Default VAT retention policy should be configurable, with a baseline of at least five years based on FTA public guidance.

## 25.2 Corporate Tax records

Support:

- Tax-period records
- P&L evidence
- Balance-related evidence
- Supporting invoices
- Expense records
- Asset records
- Tax computation workpapers
- Tax return evidence

Baseline Corporate Tax evidence retention: seven years after the relevant tax period, configurable by compliance policy.

---

# 26. Food Safety / ADAFSA-Ready Module

This is especially important for an Abu Dhabi restaurant.

## 26.1 Food handlers

Track:

- Employee
- Role
- Food handler yes/no
- Training program
- Training provider
- Certificate number
- Training date
- Expiry/review date where applicable
- PDF certificate
- Status

## 26.2 EFST

Create a document/training type for Essential Food Safety Training.

Do not assume a fixed expiry period unless the current applicable authority/provider documentation confirms it.

## 26.3 HACCP

Support:

- HACCP plan reference
- Control points
- Monitoring records
- Corrective actions
- Evidence

## 26.4 Self-inspection

Create configurable checklists.

Checklist fields:

- Checklist type
- Branch
- Date
- Inspector
- Section
- Question
- Answer
- Finding
- Severity
- Attachment
- Corrective action
- Assigned to
- Due date
- Closure evidence
- Closed by
- Closed at

Statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
VERIFIED
CLOSED
```

## 26.5 Food-safety dashboard

Display:

- Open findings
- Overdue corrective actions
- Food-handler training coverage
- Expiring certificates
- Last inspection
- Upcoming inspection tasks
- Unresolved high-priority findings

---

# 27. Compliance Calendar

Central calendar for:

- License expiry
- Document expiry
- Visa/ID expiry
- Insurance expiry
- Contract renewal
- Supplier contract renewal
- Food-safety training
- Inspection
- Tax periods
- Payroll deadlines
- Procedure due dates

Calendar views:

- Month
- Week
- List
- Overdue
- Next 30/60/90 days

---

# 28. Notifications

Channels:

- In-app
- Email
- Optional WhatsApp Business provider integration
- Optional push notifications

Notification rules are configurable.

Examples:

```text
Trade license expires in 90 days
Employee passport expires in 30 days
Employee document expired
Payroll due
Supplier payment due
Stock below reorder point
Food-safety finding overdue
Procedure overdue
```

Each notification should have:

```text
id
userId
organizationId
branchId
type
title
body
severity
readAt
createdAt
relatedEntityType
relatedEntityId
```

---

# 29. Reporting

## 29.1 Executive dashboard

Top cards:

```text
Total Employees
Active Employees
Expired Documents
Expiring Documents
Open Procedures
Completed Procedures
Today Sales
Month Sales
Month Expenses
Current Cash/Wallet Position
Inventory Value
Food Cost %
Open Compliance Findings
```

## 29.2 HR reports

- Employee roster
- New hires
- Terminations
- Expiring employee documents
- Attendance summary
- Late/absence summary
- Leave balance
- Payroll summary
- End-of-service liability estimate

## 29.3 Finance reports

- Revenue by branch
- Expenses by category
- Supplier payable
- Payroll cost
- VAT evidence report
- Cash-flow summary

## 29.4 Inventory reports

- Current stock
- Low stock
- Stock movement
- Waste
- Inventory valuation
- Supplier purchase history

## 29.5 Compliance reports

- Expired documents
- 30/60/90-day expiry list
- Open procedures
- Overdue procedures
- Audit activity
- Food-safety findings
- Food-handler training status

All report exports are audited.

---

# 30. Dashboard UI / UX

## 30.1 Visual direction

Use a premium, modern enterprise dashboard inspired by the supplied reference screenshots, but do not copy it exactly.

Recommended visual language:

- Dark charcoal/near-black background
- Black or very dark navigation bar
- Bright magenta accent line
- Neutral white/gray typography
- Controlled use of green, blue, yellow, orange, and purple for status/KPI cards
- Rounded cards
- Strong spacing hierarchy
- Crisp tables
- Responsive layout
- No visual clutter

## 30.2 Main navigation

Desktop:

```text
Dashboard
My Business
My Employees
Operations
Finance
Compliance
Reports
Notifications
Audit
Settings
[User menu]
```

Mobile:

- Bottom navigation for the 4–5 most-used destinations
- Slide-out/full-screen navigation for secondary modules
- Sticky top bar
- Touch-friendly controls

## 30.3 Dashboard KPI cards

Use compact cards similar in information density to the reference UI.

Each card should show:

- Icon
- Title
- Supporting label
- Main number
- Optional trend or status
- Click target

Examples:

```text
Active Employees
44 Persons

Expired Documents
1 Doc

Employee Procedures
99 Procedures

In Progress
11 Procedures
```

## 30.4 Tables

Required features:

- Server-side pagination
- Search
- Sorting
- Filtering
- Column visibility
- Sticky header
- Responsive behavior
- Export where permission allows
- Empty states
- Loading skeletons
- Error states

## 30.5 Status colors

Use semantic colors consistently:

```text
Green = Active / Completed / Healthy
Yellow = Expiring / Pending
Orange = Warning / Overdue Soon
Red = Expired / Rejected / Critical
Blue = Informational
Purple = Workflow / Procedure
```

Accessibility must not depend only on color.

## 30.6 Arabic RTL

Test every screen in RTL.

Pay special attention to:

- Tables
- Pagination
- Icons with directional meaning
- Dates
- Numeric columns
- Sidebars
- PDF viewer controls
- Dialog alignment
- Breadcrumbs

---

# 31. Data Model

Use PostgreSQL + Prisma.

The exact Prisma schema may evolve, but these entities must exist or have an equivalent normalized representation.

## 31.1 Core organization

```text
Organization
Branch
Department
Location
CompliancePolicy
SystemSetting
```

## 31.2 Auth / security

```text
User
Session
UserSecurityProfile
Role
Permission
RolePermission
UserRole
UserBranchScope
TwoFactorCredential
BackupCode
SecurityEvent
```

## 31.3 HR

```text
Employee
EmploymentContract
CompensationComponent
EmployeeCompensation
AttendanceRecord
ShiftTemplate
ShiftAssignment
LeaveType
LeavePolicy
LeaveBalance
LeaveRequest
PayrollPeriod
PayrollEntry
PayrollComponent
PayrollApproval
WpsBatch
WpsPaymentResult
EndOfServiceCalculation
```

## 31.4 Documents

```text
DocumentType
Document
DocumentVersion
DocumentAccessPolicy
DocumentRetentionPolicy
DocumentPermission
```

## 31.5 Workflows

```text
ProcedureType
ProcedureTemplate
ProcedureStepTemplate
Procedure
ProcedureStep
ProcedureComment
ProcedureAttachment
ApprovalPolicy
ApprovalRequest
ApprovalDecision
```

## 31.6 Operations

```text
Product
ProductCategory
InventoryItem
InventoryLocation
InventoryBalance
StockMovement
Supplier
SupplierContact
PurchaseRequest
PurchaseRequestItem
PurchaseOrder
PurchaseOrderItem
GoodsReceipt
GoodsReceiptItem
SupplierInvoice
Recipe
RecipeIngredient
IngredientCost
WasteRecord
FoodSafetyChecklist
FoodSafetyChecklistItem
FoodSafetyInspection
FoodSafetyFinding
CorrectiveAction
FoodHandlerTraining
```

## 31.7 Finance

```text
LedgerAccount
JournalEntry
JournalLine
Expense
ExpenseCategory
Payment
Income
TaxRecord
TaxPeriod
Reconciliation
FinancialAttachment
```

## 31.8 Sales / integrations

```text
Sale
SaleItem
PaymentMethod
PosConnection
PosImportBatch
ExternalReference
```

## 31.9 Notifications / audit

```text
Notification
NotificationRule
AuditLog
AuditChainHead
```

---

# 32. Important Database Constraints

## 32.1 Tenant isolation

Every organization-owned row must contain `organizationId` directly or through an enforced ownership relation.

Do not rely on a UI filter to isolate tenants.

## 32.2 Branch isolation

Rows with branch scope must contain `branchId` or an unambiguous relationship to branch.

## 32.3 Unique identifiers

Examples:

```text
organization.code unique
branch.code unique within organization
employee.employeeCode unique within organization
supplier.code unique within organization
expense.number unique within organization
purchaseOrder.number unique within organization
procedure.reference unique within organization
```

## 32.4 Indexes

Index common query combinations:

```text
organizationId + status
organizationId + branchId + status
organizationId + expiryDate
organizationId + createdAt
organizationId + employeeId
organizationId + documentTypeId
organizationId + assignedTo
```

## 32.5 Soft delete

Use fields such as:

```text
deletedAt
deletedBy
archiveReason
```

for entities that support logical deletion.

Legal records should generally be voided/archived instead of deleted.

---

# 33. PostgreSQL Row-Level Security

For an enterprise-grade security posture, evaluate enabling PostgreSQL Row-Level Security (RLS) for tenant/branch-sensitive tables.

PostgreSQL supports row-level policies for SELECT/INSERT/UPDATE/DELETE and defaults to deny access when RLS is enabled without a matching policy.

Reference: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

Use RLS as defense-in-depth, not as a substitute for application authorization.

Because application connections often run as a database owner role, design the deployment roles carefully if RLS is relied upon.

---

# 34. API / Server Action Conventions

## 34.1 Naming

Use resource-oriented routes:

```text
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PATCH  /api/employees/:id
POST   /api/employees/:id/archive

GET    /api/documents/:id
GET    /api/documents/:id/view
POST   /api/documents
POST   /api/documents/:id/versions
POST   /api/documents/:id/archive

GET    /api/audit
GET    /api/audit/:id
POST   /api/audit/verify
```

Or equivalent Server Actions, but use one consistent pattern.

## 34.2 Mutation request shape

Do not expose actor identity.

Example:

```json
{
  "data": {
    "salary": 4000
  },
  "authorizationPassword": "<entered by user>",
  "idempotencyKey": "generated-per-attempt"
}
```

The server injects:

```text
actorUserId from session
organizationId from session/context
branchId from target
```

## 34.3 Generic mutation pipeline

```text
Request
 ↓
Rate limit
 ↓
Authentication
 ↓
Input validation (Zod)
 ↓
Authorization policy
 ↓
Scope enforcement
 ↓
Authorization password verification
 ↓
Optional approval rule
 ↓
Load current record
 ↓
Generate sanitized before/after diff
 ↓
DB transaction
   ├── write business record
   ├── write audit event
   └── write notification/outbox event if needed
 ↓
Return safe DTO
```

## 34.4 Transactions

Any operation that changes multiple tables and must remain consistent must run inside a transaction.

Examples:

- Expense + attachment metadata + audit
- Employee update + audit
- Document version replacement + current pointer + audit
- Payroll posting + payment + audit
- Inventory transfer from branch A to B
- Approval decision + state change + audit

Prisma's transaction APIs support this pattern.

---

# 35. Security Requirements

Use the following as a production baseline.

## 35.1 OWASP alignment

Target:

- OWASP ASVS-style controls
- OWASP password storage guidance
- OWASP session management guidance
- OWASP authorization guidance
- OWASP file-upload guidance
- OWASP logging guidance

## 35.2 Password storage

Argon2id.

OWASP's current password-storage guidance recommends Argon2id with a memory-hard configuration and states passwords must never be stored in plaintext.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## 35.3 Brute-force protection

Apply rate limits to:

- Login
- Authorization password verification
- Password reset
- 2FA verification
- PDF access attempts
- High-frequency exports

## 35.4 CSRF / request protection

Use framework-native protections appropriate to Server Actions and Route Handlers.

Never disable CSRF-related defenses globally just to make an integration easier.

## 35.5 CSP

Configure a Content Security Policy.

Minimum goals:

- Restrict scripts
- Restrict object sources
- Restrict frame ancestors
- Restrict connect sources
- Restrict image sources
- Use nonces where inline scripts are genuinely required

Next.js documents CSP as a defense against XSS, clickjacking, and injection risks.

Reference: https://nextjs.org/docs/14/pages/building-your-application/configuring/content-security-policy

## 35.6 Security headers

At minimum evaluate:

```text
Strict-Transport-Security
X-Content-Type-Options: nosniff
Referrer-Policy
Content-Security-Policy
Permissions-Policy
frame-ancestors via CSP
```

Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers

## 35.7 Secrets

Never commit:

- Database URLs
- Auth secrets
- Storage keys
- HMAC secrets
- SMTP passwords
- API keys

Ensure `.env*` is ignored and only intended public variables use the `NEXT_PUBLIC_` prefix.

## 35.8 Sensitive logging

Never log:

- Passwords
- Authorization passwords
- Session cookies
- Access tokens
- Encryption keys
- Database credentials
- Full government identifiers
- Raw document bytes

Mask or hash where necessary.

## 35.9 Access-control failures

Log failed:

- Permission checks
- Branch-scope checks
- Authorization password checks
- Document access
- Downloads
- Role changes
- User disable attempts

---

# 36. Document Data Protection

Because the system stores passports, Emirates IDs, visas, contracts, salaries and business licenses, implement data-minimization and least-privilege principles.

## 36.1 Visibility classes

Recommended classes:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
HIGHLY_CONFIDENTIAL
```

Examples:

```text
Menu description       PUBLIC/INTERNAL
Employee roster        INTERNAL
Employee salary        CONFIDENTIAL
Passport PDF           HIGHLY_CONFIDENTIAL
Bank account           HIGHLY_CONFIDENTIAL
Audit log              CONFIDENTIAL/HIGHLY_CONFIDENTIAL
```

## 36.2 Field masking

Examples:

```text
Passport: ******1234
Emirates ID: *********5678
Bank account: ****9012
```

A user needs an elevated permission to reveal full values.

Revealing a masked field should itself be auditable if policy marks it sensitive.

---

# 37. File Storage Strategy

Recommended object key:

```text
org/{organizationId}/documents/{documentId}/versions/{versionId}/{randomId}.pdf
```

Never use the user-uploaded filename as the storage key.

Metadata table stores:

```text
originalFilename
mimeType
sizeBytes
sha256
storageKey
uploadedBy
uploadedAt
scanStatus
scanEngine
scanAt
```

## 37.1 Antivirus

Preferred production flow:

```text
UPLOAD_PENDING_SCAN
      ↓
ANTIVIRUS_SCAN
      ↓
CLEAN → AVAILABLE
INFECTED → QUARANTINED
FAILED → BLOCKED/RETRY
```

The user must not be able to view a file that has not passed the required scan policy.

---

# 38. Search

Global search should cover authorized records only.

Search targets:

- Employee
- Business
- Branch
- Document
- Procedure
- Supplier
- Expense
- Purchase order
- Inventory item
- Audit event

Never return unauthorized records and then hide them in the UI.

---

# 39. Settings

## 39.1 Organization settings

- Names
- Address
- Timezone
- Currency
- Fiscal year
- Locale defaults
- Notification defaults

## 39.2 Branch settings

- Opening hours
- Manager
- Departments
- Inventory locations
- Tax settings
- POS connection

## 39.3 Document settings

- Document types
- Required fields
- Required PDF
- Expiry rules
- Alert days
- Retention class
- Download policy

## 39.4 Workflow settings

- Procedure types
- Steps
- Assignees
- SLA/due dates
- Approval policies

## 39.5 Security settings

- Password policy
- Authorization-password policy
- 2FA policy
- Session lifetime
- Login throttling
- File size limits
- Allowed MIME types
- Audit retention

---

# 40. Recommended Folder Structure

```text
src/
  app/
    (auth)/
      login/
      forgot-password/
      reset-password/
    (dashboard)/
      dashboard/
      business/
      employees/
      operations/
      finance/
      compliance/
      reports/
      notifications/
      audit/
      settings/
    api/
      auth/
      employees/
      documents/
      procedures/
      payroll/
      inventory/
      finance/
      audit/
      notifications/
  components/
    ui/
    layout/
    tables/
    charts/
    forms/
    dialogs/
    pdf/
    security/
      authorization-password-dialog.tsx
      permission-gate.tsx
  lib/
    auth/
    authorization/
    audit/
    documents/
    storage/
    malware/
    db/
    validation/
    notifications/
    policies/
    finance/
    payroll/
    inventory/
    food-safety/
    reports/
  server/
    actions/
    services/
    dal/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  i18n/
  types/
  hooks/
  config/

workers/
  expiry-worker/
  notification-worker/
  report-worker/
```

Adapt the structure to the existing repository if one exists. Do not destroy working project architecture without reason.

---

# 41. Core Shared Components

Build these once and reuse everywhere.

## 41.1 `AuthorizationPasswordDialog`

Props:

```ts
{
  actionLabel: string;
  targetLabel?: string;
  permission: string;
  onConfirm: (password: string) => Promise<void>;
}
```

But the component must not make authorization decisions itself. The server does.

## 41.2 `PermissionGate`

UI helper only.

Never rely on it as the server security boundary.

## 41.3 `AuditHistoryPanel`

Reusable history drawer for:

- Employee
- Document
- Procedure
- Expense
- Payment
- Inventory
- Supplier

## 41.4 `PdfViewerModal`

Features:

- Secure URL acquisition
- Loading
- Error
- Zoom
- page navigation
- fullscreen
- download if authorized
- access event creation

## 41.5 `ExpiryBadge`

Displays:

```text
Active
Expiring in 30 days
Expired
```

## 41.6 `DataTable`

One shared enterprise data table with:

- server-side pagination
- query-string filters
- sorting
- saved views later if desired
- export
- responsive mode

## 41.7 `ConfirmMutation`

Every create/update/delete action should follow:

```text
Intent
 ↓
Preview change
 ↓
Authorization password
 ↓
Server mutation
 ↓
Audit
 ↓
Toast/result
```

---

# 42. API Error Model

Use structured errors:

```json
{
  "code": "AUTHORIZATION_PASSWORD_INVALID",
  "message": "Authorization failed.",
  "requestId": "..."
}
```

Common codes:

```text
UNAUTHENTICATED
ACCOUNT_DISABLED
PERMISSION_DENIED
BRANCH_SCOPE_DENIED
AUTHORIZATION_PASSWORD_REQUIRED
AUTHORIZATION_PASSWORD_INVALID
AUTHORIZATION_PASSWORD_LOCKED
VALIDATION_ERROR
DOCUMENT_SCAN_PENDING
DOCUMENT_SCAN_INFECTED
DOCUMENT_NOT_FOUND
DOCUMENT_DOWNLOAD_DENIED
CONFLICT
STALE_VERSION
RATE_LIMITED
INTERNAL_ERROR
```

Do not leak internal stack traces to users.

---

# 43. Concurrency / Data Integrity

Implement optimistic concurrency for records that multiple operators may edit.

Use:

```text
version integer
updatedAt timestamp
```

A mutation should optionally require the client to send the version it last read.

If the stored version changed:

```text
409 CONFLICT
```

Display:

> This record was changed by another user. Review the latest values before saving.

This is especially important for:

- Employee data
- Documents
- Payroll
- Inventory
- Expenses
- Purchase orders

---

# 44. Idempotency

Use idempotency keys for operations that could otherwise be duplicated:

- Payments
- Payroll posting
- Inventory transfers
- WPS exports/submissions
- POS imports
- Expense posting

Example:

```text
IdempotencyKey
organizationId
operation
requestHash
result
createdAt
```

---

# 45. Import / Export

## 45.1 Employee import

Support CSV/XLSX only after permission + authorization password.

Required:

- Upload validation
- Column mapping
- Preview
- Validation errors
- Duplicate handling
- Import transaction
- Audit log

## 45.2 Export

Exports can contain sensitive data.

Therefore:

- Require permission
- Optionally require authorization password
- Log export
- Log filters/columns
- Add watermark or metadata when appropriate
- Expire generated download files

---

# 46. Backup and Disaster Recovery

## Database

Minimum production baseline:

- Automated daily backups
- Point-in-time recovery where provider supports it
- Encryption
- Restore verification
- Backup retention policy
- Documented recovery procedure

## Object storage

- Object versioning
- Backup/redundancy
- Encryption
- Retention/lifecycle rules
- Recovery test

Never claim a backup exists unless the deployed environment actually creates and verifies it.

---

# 47. Observability

Implement:

- Structured application logs
- Request IDs
- Error tracking
- Health endpoint
- Database health check
- Storage health check
- Worker health check
- Queue/job metrics

Recommended:

- Sentry or equivalent
- OpenTelemetry-compatible tracing

Every request should have a request ID that can be correlated with audit/security records.

---

# 48. Performance Requirements

Targets:

- Server-render read-heavy dashboard pages
- Avoid loading all employees/documents at once
- Server-side pagination
- Efficient indexes
- Lazy-load large PDF viewer
- Lazy-load charts below the fold
- Optimize images
- Cache safe reference data
- Use database aggregation for KPI counts rather than loading entire datasets

Required dashboard behavior:

- KPI counts must be computed on the server
- Counts must respect organization/branch scope
- No client-side filtering of unauthorized data

---

# 49. Accessibility

Target WCAG-oriented usability.

Requirements:

- Keyboard navigation
- Focus states
- Dialog focus trapping
- Form labels
- Error messages linked to inputs
- Accessible tables
- Screen-reader labels for icons
- Do not rely on color alone
- Sufficient contrast

---

# 50. Testing Strategy

## 50.1 Unit tests

Test:

- Permission engine
- Scope engine
- Authorization password verification
- Leave calculations
- Payroll calculations
- End-of-service calculations
- Food cost calculations
- Inventory calculations
- Expiry engine
- Tax/record-retention policy engine
- Audit diff sanitization

## 50.2 Integration tests

Test:

- User creation
- Login
- Authorization password
- Employee creation
- Employee update
- Document upload
- Document version replacement
- PDF viewing
- Download denial
- Expense posting
- Inventory transfer
- Payroll approval
- Role/permission changes
- Audit generation

## 50.3 Security tests

Must prove:

1. User without permission cannot mutate.
2. User with permission but wrong authorization password cannot mutate.
3. User with permission and another user's authorization password cannot mutate.
4. Changing `actorUserId` in client payload has no effect.
5. Changing `organizationId` in client payload cannot escape tenant.
6. Changing `branchId` in request cannot escape branch scope.
7. Direct API calls receive the same authorization as UI actions.
8. PDF access without permission is denied.
9. PDF object storage is not public.
10. Audit logs cannot be modified via application APIs.
11. Passwords never appear in logs.
12. Download permission is separate from view permission.
13. Expired documents trigger correct notifications.
14. Inventory transfers remain atomic.
15. Payroll posting cannot be duplicated.

## 50.4 End-to-end tests

Use Playwright.

Test critical flows across Arabic and English.

---

# 51. Acceptance Tests — Mandatory Business Scenarios

These scenarios define “done.”

## Scenario A — Create an employee

Owner logs in.

Owner opens Employees → Add Employee.

Enters employee information.

Clicks Save.

Authorization password dialog appears.

Correct password is entered.

Server creates employee.

Audit record appears:

```text
Owner Name
CREATE
Employee
Employee ID
Timestamp
```

## Scenario B — Employee attempts unauthorized edit

HR user tries to modify a field without `employee.update`.

Even if they call the API manually:

```text
PATCH /api/employees/:id
```

Server responds:

```text
PERMISSION_DENIED
```

No audit mutation event is created as a successful change; the security failure is logged separately.

## Scenario C — Wrong authorization password

Authorized HR user has `employee.update`.

They enter an incorrect authorization password.

Server denies mutation.

Database remains unchanged.

Security event records failed authorization attempt.

## Scenario D — Password belonging to another user

Ahmed has edit permission.

Ahmed enters Sara's authorization password.

Server must reject because the password is verified against Ahmed's security profile, not Sara's.

## Scenario E — Employee edit history

Ahmed changes job title from:

```text
Waiter → Senior Waiter
```

Audit history shows:

```text
Ahmed
Field: Job Title
Before: Waiter
After: Senior Waiter
```

## Scenario F — Legal PDF upload

HR uploads `passport.pdf`.

System validates:

- permission
- authorization password
- PDF signature
- size
- virus scan

After success:

- Document created
- Version 1 created
- Current version set
- PDF privately stored
- Audit record created

## Scenario G — PDF viewer

HR opens the passport document.

System verifies permission.

PDF opens inside the web app.

If HR has no download permission:

- Download control is hidden/disabled
- Direct download endpoint rejects unauthorized request

## Scenario H — Replace PDF

New passport PDF uploaded.

System creates Version 2.

Version 1 remains available to authorized historical viewers.

Current version becomes Version 2.

Audit history shows replacement.

## Scenario I — Expired document

A document reaches expiry date.

Daily job updates computed status to `EXPIRED`.

Notification generated for responsible users.

Dashboard count increments.

## Scenario J — Role change

Owner changes HR Officer permissions.

Authorization password required.

Role/permission change logged.

Affected user receives notification.

Existing sessions may be re-evaluated/revoked according to security policy.

## Scenario K — Branch isolation

Branch Manager A attempts to edit employee belonging to Branch B.

Server denies even if Branch Manager A has `employee.update`.

## Scenario L — Inventory transfer

Branch A transfers 20 kg chicken to Branch B.

One transaction creates:

```text
StockMovement OUT -20 A
StockMovement IN +20 B
Transfer record
Audit event
```

If one write fails, the whole operation rolls back.

## Scenario M — Payroll

HR prepares monthly payroll.

Finance reviews.

Approved payroll can generate a provider-specific WPS export.

Every state change is audited.

## Scenario N — Food safety

Compliance officer starts an Abu Dhabi food-safety checklist.

Findings are assigned.

Corrective action is uploaded as PDF evidence.

Closure is audited.

## Scenario O — Audit integrity

Owner opens Audit → Verify Integrity.

System verifies chain.

Returns:

```text
Verified: 1,234 events
Chain: OK
```

---

# 52. Seed Data

Create a realistic seed environment.

## Organization

```text
Tasha Restaurant / Restaurant Demo
Emirate: Abu Dhabi
Currency: AED
Timezone: Asia/Dubai
Languages: ar-AE, en-AE
```

Do not hard-code the actual customer's sensitive information.

## Branches

```text
Main Branch
Branch 2
Kitchen / Central Kitchen
```

## Departments

```text
Management
HR
Finance
Kitchen
Service
Delivery
Procurement
Inventory
Compliance
```

## Example roles

Seed all roles from Section 5.

## Document types

Seed examples:

```text
Trade License
Branch Permit
Lease Agreement
Tax Registration
Tax Invoice
Employee Passport
Emirates ID
Visa
Work Permit
Employment Contract
Health Insurance
EFST Certificate
HACCP Record
Supplier Contract
Supplier Invoice
Inspection Report
```

Mark legal/compliance types appropriately and require PDF.

## Procedure types

Seed:

```text
New Employee Onboarding
Visa Renewal
Work Permit Renewal
Employee Exit
Trade License Renewal
Food Safety Compliance Review
Supplier Contract Renewal
```

---

# 53. Environment Variables

Example `.env.example`:

```env
DATABASE_URL=
DIRECT_URL=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

AUDIT_CHAIN_SECRET=

STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=

ANTIVIRUS_ENABLED=true
ANTIVIRUS_ENDPOINT=

REDIS_URL=

EMAIL_PROVIDER=
EMAIL_FROM=
EMAIL_API_KEY=

WHATSAPP_PROVIDER=
WHATSAPP_API_KEY=

SENTRY_DSN=

NEXT_PUBLIC_APP_NAME=Restaurant Enterprise
NEXT_PUBLIC_APP_URL=
```

Never commit real values.

---

# 54. Database Migration Rules

The agent must:

1. Create migrations, never manually mutate production schema.
2. Keep migrations deterministic.
3. Add indexes deliberately.
4. Add foreign keys.
5. Add constraints for statuses/enums where useful.
6. Test migration from empty DB.
7. Test migration from seeded DB.
8. Avoid destructive migrations without explicit data migration logic.

---

# 55. Internationalization

Translation structure:

```text
messages/
  ar-AE.json
  en-AE.json
```

Example:

```json
{
  "employees": {
    "title": "All Employees",
    "total": "Total Employees",
    "active": "Active Employees"
  }
}
```

Arabic UI examples:

```text
لوحة التحكم
الشركة
الموظفون
العمليات
المالية
الامتثال
التقارير
الإشعارات
سجل النشاط
الإعدادات
```

Ensure every translated UI label is actually switched when locale changes.

---

# 56. Date / Time Rules

Store timestamps in UTC.

Render according to organization timezone, default `Asia/Dubai`.

Display:

```text
30 Sep 2026, 04:41 PM
```

Arabic rendering should remain readable and numerically consistent.

Do not use client browser time as the source of truth for audit records.

Server timestamp is authoritative.

---

# 57. Business Rules Engine

Do not scatter business rules across components.

Create policy services such as:

```text
DocumentPolicyService
EmployeePolicyService
LeavePolicyService
PayrollPolicyService
WpsPolicyService
TaxPolicyService
FoodSafetyPolicyService
RetentionPolicyService
AuthorizationPolicyService
```

Policies must be testable without rendering React components.

---

# 58. Approval Engine

Add configurable approval workflows.

Example:

```text
Change Employee Salary
      ↓
Permission Check
      ↓
Authorization Password
      ↓
Approval Policy?
      ↓
Second Approver Required
      ↓
Approved
      ↓
Apply Change
      ↓
Audit
```

This is optional on ordinary fields but recommended for:

- Salary changes
- Bank/payment details
- User role changes
- High-value expenses
- Payments above threshold
- Tax-critical records
- Permanent record deletion/retention disposal

---

# 59. High-Risk Actions Policy

Configure high-risk operations:

```text
Delete financial transaction
Delete legal document
Change employee salary
Change user permissions
Disable owner/admin
Change bank details
Post payroll
Approve payment
Export sensitive employee data
Change retention policy
```

These can require:

- Authorization password
- 2FA re-authentication
- Second approver

The security policy must be configurable without changing source code.

---

# 60. Frontend Data Security

Never send more data to the browser than the page needs.

Example:

A table of employees should not automatically serialize:

- Passport number
- Emirates ID
- Bank details
- Full salary

unless the viewer's permission and screen require it.

Use DTOs that intentionally select fields.

Next.js documentation recommends using a Data Access Layer and DTOs to keep authorization and returned data secure.

Reference: https://nextjs.org/docs/app/guides/authentication

---

# 61. No Trust in Client Inputs

Treat all client inputs as untrusted.

Validate:

- IDs
- Dates
- Numbers
- Currency
- Enum values
- Branch IDs
- Document IDs
- File types
- Search filters
- Sort fields
- Pagination

Never interpolate untrusted values into SQL.

Prisma parameterized access should be preferred.

---

# 62. Report Export Security

Exports can be more sensitive than screens.

Every export should:

- Check permission
- Apply same scope filtering as the UI
- Record actor
- Record report type
- Record filters
- Record columns
- Record row count
- Create audit event

Large exports should run asynchronously.

---

# 63. Mobile

The application must be fully responsive.

Priority mobile screens:

1. Dashboard
2. Notifications
3. Employees
4. Employee profile
5. Document viewer
6. Procedures
7. Attendance
8. Expenses
9. Approvals
10. Audit details

Avoid horizontal scrolling except for large data tables where an accessible responsive table solution is unavoidable.

---

# 64. Empty / Error / Loading States

Every module must have:

- Loading skeleton
- Empty state
- Permission-denied state
- Not-found state
- Validation-error state
- Server-error state
- Retry state

Examples:

```text
No employees yet.
Add your first employee.
```

```text
You do not have permission to edit this record.
```

```text
This document is currently being scanned.
```

---

# 65. Search and Query String State

Filters should be encoded into URL query parameters where practical.

Example:

```text
/employees?status=ACTIVE&branch=branch-1&page=2
```

This provides:

- Shareable views
- Back/forward navigation
- Better debugging
- Predictable server rendering

Never encode secrets into URLs.

---

# 66. Audit-Friendly UI Pattern

Every high-value entity detail page should include a visible:

```text
Activity
```

tab/side panel showing:

```text
Last changed by Ahmed
Last changed 30 Sep 2026 16:41

History
- Created
- Updated
- Document uploaded
- Document viewed
- Status changed
```

For legal documents add:

```text
Versions
Permissions
Activity
```

---

# 67. Document Retention Architecture

Retention must be policy-based.

Example classes:

```text
EMPLOYEE_IDENTITY
BUSINESS_LICENSE
TAX_VAT
TAX_CORPORATE
EMPLOYMENT
FOOD_SAFETY
SUPPLIER
FINANCE
AUDIT
```

Each class:

```text
retentionPeriodDays
legalBasis/source
startsFrom
preserveOnDispute
preserveOnAudit
legalHoldSupported
```

When a legal hold is active:

```text
physicalDeletion = BLOCKED
```

---

# 68. Legal Hold

Support a simple legal-hold mechanism:

```text
LegalHold
id
organizationId
name
reason
startedAt
endedAt
createdBy
```

Entities/documents under hold cannot be physically disposed of.

Every hold operation is audited.

---

# 69. Data Subject / Privacy Requests

Because employee data is personal data, support an internal workflow for:

- Access request
- Correction request
- Data processing inquiry
- Restriction request
- Deletion request where legally applicable

Do not promise that every request must be fulfilled. The workflow should route requests to authorized staff for legal/privacy review.

---

# 70. Security Event Center

Separate from business audit history.

Display:

- Login success/failure
- Password changes
- Authorization-password failures
- Permission failures
- 2FA events
- Session revocations
- Suspicious access
- Export events
- File scanning failures
- Admin/security configuration changes

Severity:

```text
INFO
WARNING
HIGH
CRITICAL
```

---

# 71. Suggested Dashboard Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Logo │ Dashboard │ Business │ Employees │ Finance │ ... │ User     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Restaurant Overview                                               │
│                                                                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│ │ Employees  │ │ Documents  │ │ Procedures │ │ Sales      │       │
│ │ 58         │ │ 53         │ │ 99         │ │ 12,450 AED │       │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│                                                                    │
│ ┌────────────────────────────┐ ┌────────────────────────────────┐ │
│ │ Compliance                 │ │ Finance                         │ │
│ │ Expiring Docs: 3           │ │ Revenue: 250K AED              │ │
│ │ Expired Docs: 1            │ │ Expenses: 109K AED             │ │
│ │ Open Findings: 4           │ │ Payroll: 88K AED               │ │
│ └────────────────────────────┘ └────────────────────────────────┘ │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Recent Activity                                                │ │
│ │ Ahmed updated employee salary                                  │ │
│ │ Sara uploaded Trade License v3                                 │ │
│ │ Mahmoud approved supplier payment                               │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

# 72. Implementation Phases

Build in phases, but keep the architecture complete from the beginning.

## Phase 0 — Foundation

- Initialize repo
- Next.js App Router
- TypeScript strict
- Tailwind/shadcn
- PostgreSQL
- Prisma
- Auth
- i18n
- Layout
- Design tokens
- Error handling
- Logging
- Environment validation

## Phase 1 — Security Core

- User accounts
- Sessions
- Roles
- Permissions
- Branch scopes
- Authorization password
- Mutation guard
- Security events
- Audit log
- Audit integrity

This phase must be completed before business CRUD is considered production-ready.

## Phase 2 — Business + Documents

- Organization
- Branches
- Document types
- Documents
- PDF upload
- Virus scan
- Private storage
- PDF viewer
- Document versioning
- Expiry engine
- Document history

## Phase 3 — Employees + HR

- Employees
- Employee documents
- Contracts
- Attendance
- Shifts
- Leave
- Procedures
- Notifications

## Phase 4 — Payroll + Finance

- Payroll
- WPS adapter architecture
- Payments
- Expenses
- Wallet
- Finance reports
- Tax evidence center

## Phase 5 — Operations

- Suppliers
- Purchasing
- Inventory
- Recipes
- Food cost
- Waste
- Sales/POS adapter

## Phase 6 — Food Safety + Compliance

- Food handlers
- EFST records
- HACCP records
- Inspections
- Findings
- Corrective actions
- Compliance calendar

## Phase 7 — Reports + Hardening

- Reports
- Exports
- Advanced filters
- Performance
- Security review
- Penetration-test readiness
- Backup/restore test
- Production deployment

---

# 73. Agent Execution Instructions

These instructions are intended for an autonomous coding agent.

## 73.1 Start by inspecting the repository

Before changing anything:

1. Inspect `package.json`.
2. Inspect existing Next.js version.
3. Inspect existing Prisma schema/migrations.
4. Inspect auth implementation.
5. Inspect current folder structure.
6. Inspect `.env.example`.
7. Run the existing test suite.
8. Run typecheck/lint if available.

If the repository is empty, scaffold according to this document.

If the repository already contains a working application, preserve functioning business logic and integrate the new architecture rather than blindly replacing the project.

## 73.2 Do not ask for routine implementation choices

Use the defaults in this document.

Only stop for clarification if there is a genuine blocker such as:

- Missing required credential that cannot be generated locally
- Existing project architecture directly contradicts a safety-critical requirement
- A business decision is impossible to infer from the specification

Otherwise implement the sensible default and document it.

## 73.3 Build vertically

Do not create 100 empty screens first.

Build working vertical slices:

```text
Auth
 → Permission
 → Authorization Password
 → Audit
 → Employee CRUD
 → PDF Documents
```

Once these are production-quality, continue to other modules.

## 73.4 Every feature must be tested

After implementing each module:

1. Run lint.
2. Run typecheck.
3. Run unit tests.
4. Run integration tests.
5. Run relevant Playwright tests.
6. Manually inspect desktop and mobile layouts.
7. Test Arabic RTL.
8. Test unauthorized API access.
9. Test wrong authorization password.
10. Confirm audit records.

## 73.5 Never declare “done” with broken flows

Every button that changes data must actually work.

No fake success toasts.

No placeholder CRUD.

No hard-coded KPI values in production code.

No fake PDF URLs.

No frontend-only permissions.

No localStorage authentication tokens.

No plaintext passwords.

No public legal-document bucket.

---

# 74. Agent Acceptance Gate Before Final Delivery

The coding agent must not report completion until all of the following are true:

```text
[ ] Project builds successfully
[ ] Database migrations succeed from empty database
[ ] Seed script succeeds
[ ] Login works
[ ] Logout works
[ ] Password reset works
[ ] 2FA works if enabled
[ ] User creation works
[ ] Role creation works
[ ] Permission assignment works
[ ] Branch scope works
[ ] Authorization password works
[ ] Every mutation verifies authorization password
[ ] Wrong authorization password is rejected
[ ] Cross-user authorization password is rejected
[ ] Unauthorized API mutation is rejected
[ ] Audit log is created for successful mutations
[ ] Security log is created for failed authorization
[ ] Audit log cannot be updated through app
[ ] Audit integrity verification works
[ ] Employee CRUD works
[ ] Employee documents work
[ ] Legal document PDF requirement works
[ ] PDF upload validation works
[ ] Malware scan pipeline works or is safely stubbed with explicit production blocker
[ ] Private storage works
[ ] PDF viewer works
[ ] Download permissions work
[ ] Document versioning works
[ ] Expiry notifications work
[ ] Procedures work
[ ] Attendance works
[ ] Leave works
[ ] Payroll works
[ ] WPS adapter architecture exists
[ ] Finance works
[ ] Inventory works
[ ] Purchasing works
[ ] Supplier module works
[ ] Recipe/food-cost works
[ ] Food safety module works
[ ] Reports work
[ ] Export audit works
[ ] Arabic RTL works
[ ] English LTR works
[ ] Mobile layout works
[ ] Accessibility checks pass
[ ] Security headers configured
[ ] CSP configured
[ ] Environment secrets are not committed
[ ] Backup strategy documented
[ ] Production build passes
```

If a production dependency such as antivirus infrastructure or an external WPS provider is unavailable, the agent must implement the interface, safe failure behavior, and integration boundary, and clearly identify the one external dependency rather than pretending the integration is complete.

---

# 75. Definition of Done for the Security Model

The most important demonstration is this test matrix:

| Actor | Permission | Authorization Password | Target Scope | Result |
|---|---|---|---|---|
| Owner | Yes | Correct | Valid | ALLOW |
| Owner | Yes | Wrong | Valid | DENY |
| HR | Yes | Correct | Valid | ALLOW |
| HR | No | Correct | Valid | DENY |
| HR | Yes | Correct | Invalid branch | DENY |
| HR | Yes | Other user's password | Valid | DENY |
| Disabled user | Yes | Correct | Valid | DENY |
| Unauthenticated | N/A | Correct | Valid | DENY |

This table is mandatory to test automatically.

---

# 76. Recommended Build Priority Inside the Agent

Priority 1:

```text
Auth
RBAC
Branch scoping
Authorization password
Audit
```

Priority 2:

```text
Business
Employees
Documents
PDF viewer
Document versioning
Expiry
Procedures
```

Priority 3:

```text
Attendance
Leave
Payroll
Finance
```

Priority 4:

```text
Inventory
Purchasing
Suppliers
Recipes
Food cost
Waste
```

Priority 5:

```text
Food safety
Compliance calendar
Reports
Integrations
Advanced analytics
```

---

# 77. Final Product Principle

The application should behave as though every important action must answer five questions:

```text
WHO did it?
WHAT changed?
WHEN did it happen?
WHY was it allowed?
WHAT evidence exists?
```

And for every legal/compliance document:

```text
WHERE is the PDF?
WHO uploaded it?
WHO viewed it?
WHO replaced it?
WHICH version is current?
WHEN does it expire?
WHAT was changed between versions?
```

And for every mutation:

```text
Authenticated user
        +
Permission
        +
Correct scope
        +
User's own authorization password
        +
Optional approval policy
        ↓
     Mutation
        ↓
 Immutable audit event
```

This is the core architecture. Do not weaken it for convenience.

---

# 78. Source References

The following sources were used to establish the current baseline for this specification.

1. UAE Personal Data Protection Law overview — Federal Decree-Law No. 45 of 2021  
   https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws

2. UAE private-sector employment laws — Federal Decree-Law No. 33 of 2021 and amendments  
   https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/employment-laws-and-regulations-in-the-private-sector

3. UAE private-sector working hours and overtime  
   https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/working-hours

4. UAE annual leave rules  
   https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/types-of-leaves-and-entitlements-in-the-private-sector/annual-leave

5. UAE end-of-service benefits  
   https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/end-of-service-benefits-for-employees-in-the-private-sector

6. UAE WPS salary-payment rules, current government page referencing Ministerial Resolution No. 340 of 2026  
   https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/payment-of-wages

7. UAE Central Bank — UAE Wages Protection System  
   https://centralbank.ae/en/our-operations/payments-and-settlements/uae-wages-protection-system-uaewps/

8. UAE FTA — VAT invoice retention FAQ  
   https://tax.gov.ae/en/faq.aspx?keyword=How+long+must+a+taxable+person+retain+VAT+invoices+for%3F

9. UAE FTA — Tax obligations / record examples  
   https://tax.gov.ae/DataFolder/Files/Pdf/2022/Get%20to%20know%20your%20Tax%20Obligations.pdf

10. UAE FTA — Corporate Tax registration guide / seven-year record retention  
    https://tax.gov.ae/Datafolder/Files/Guides/CT/R%20CT%20Registration%20of%20Juridical%20Persons%20-%20EN%20-%2031%2008%202023%20final.pdf

11. Abu Dhabi ADAFSA — EFST FAQ  
    https://www.adafsa.gov.ae/ar/work/food-safety/Documents/FAQs%20EFST%20Arabic-English%20version-%20edited%20-%20Nov25.pdf

12. Abu Dhabi ADAFSA — Food Service Design & Equipment guideline  
    https://www.adafsa.gov.ae/CMS/Guidelines/Guideline%20No%20%286%29%20of%202019%20Food%20Service%20Design.pdf

13. Next.js authentication guide  
    https://nextjs.org/docs/app/guides/authentication

14. Next.js Proxy documentation  
    https://nextjs.org/docs/app/getting-started/proxy

15. Next.js security headers / production checklist  
    https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
    https://nextjs.org/docs/app/guides/production-checklist

16. Better Auth — Next.js example and organization/session/2FA support  
    https://better-auth.com/docs/examples/next-js

17. OWASP Authorization Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

18. OWASP Logging Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

19. OWASP File Upload Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

20. OWASP Password Storage Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

21. OWASP Session Management Cheat Sheet  
    https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

22. PostgreSQL Row-Level Security  
    https://www.postgresql.org/docs/current/ddl-rowsecurity.html

23. Prisma transactions  
    https://www.prisma.io/docs/orm/fundamentals/transactions

24. Google Cloud signed URL documentation (principle also applies to other object-storage providers)  
    https://docs.cloud.google.com/storage/docs/access-control/signed-urls

---

# 79. Final Agent Command

**Build this system end-to-end.**

Start from the existing repository if present; otherwise scaffold the project.

Do not produce mockups instead of working features.

Do not create fake backend success responses.

Do not trust frontend permissions.

Do not skip authorization-password verification on mutations.

Do not skip audit logging.

Do not expose legal PDFs publicly.

Do not store passwords in plaintext.

Do not store authentication tokens in browser localStorage.

Do not hard-code regulatory logic where it can be configured and versioned.

Implement, test, inspect, fix, and re-test each feature before moving to the next module.

The finished application must be production-oriented, bilingual, responsive, secure, auditable, and ready for a UAE restaurant's real operational data.
