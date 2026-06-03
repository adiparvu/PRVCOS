# PRV — Complete Security Architecture
## Enterprise Security Blueprint · Source of Truth · v1.0

---

## SECURITY PHILOSOPHY

PRV operates on **Zero Trust Architecture**.

> "Never trust. Always verify. Log everything."

No request is trusted by default — regardless of source, network, or previous session.
Every single access is validated against seven independent gates before execution.

**The Seven Gates (every request, every time):**
```
1. User Identity       — Who is making this request?
2. Role Validation     — What is their current role?
3. Permission Check    — Do they have this specific permission?
4. Scope Validation    — Does this resource fall within their scope?
5. Company Isolation   — Is this resource in their authorized company?
6. Device Trust        — Is this a recognized, trusted device?
7. Session Validity    — Is the session active, unexpired, and uncompromised?
```

Failure at any gate = immediate rejection + audit log entry (DENIED).

---

## 1. AUTHENTICATION ARCHITECTURE

### 1.1 Public Application Authentication

**Target users:** General public, prospective clients, shop customers.

| Method | Requirement |
|---|---|
| Email + Password | Minimum 8 chars, 1 uppercase, 1 number |
| Social Login (optional) | Google / Apple Sign-In |
| Guest Browsing | Shop and public pages — no auth required |
| Client Portal | Email + Password + optional MFA |

**Password Policy (Public):**
- Minimum 8 characters
- Must include: uppercase, lowercase, number
- Breach detection: reject passwords found in known breach databases
- Reset: email link (expires in 15 minutes)

---

### 1.2 Dashboard Authentication (Business OS)

**Target users:** All internal PRV roles (Employees, Managers, Executives).

**Access Model: Invitation Only.**
No self-registration. Every account is created by System Administrator or HR.

**Login Flow:**
```
Step 1: Email entry
        → Check: account exists, invitation accepted, not suspended
        ↓
Step 2: Password entry
        → Argon2id hashing · breach detection · rate limiting
        ↓
Step 3: Verification Code (TOTP or Email OTP)
        → TOTP via Authenticator App (preferred)
        → Fallback: Email OTP (expires 10 minutes)
        ↓
Step 4: Biometric Verification
        → Face ID (iOS) / Fingerprint (Android) / Windows Hello (Desktop)
        → Required for L3+ roles
        → L2 roles: optional but encouraged
        ↓
Step 5: Device Trust Check
        → Known device? → proceed
        → New device? → additional verification + device registration flow
        ↓
Step 6: Access Granted
        → Session token issued
        → Audit log: LOGIN_SUCCESS
        → Dynamic Island: session active indicator
```

**Failed Login Handling:**
```
Attempt 1-3:  Standard error message ("Invalid credentials")
Attempt 4:    CAPTCHA challenge added
Attempt 5:    Account locked for 15 minutes · admin notified (L3+)
Attempt 6+:   Account locked · mandatory admin unlock · security alert
```

---

### 1.3 Multi-Factor Authentication (MFA)

**Mandatory for (cannot be disabled):**
- CEO
- Co-CEO
- System Administrator
- Finance access roles (HR/Payroll, Finance team)
- Shop Director
- Project Director
- Operations Manager

**Supported MFA Methods:**

| Method | Priority | Security Level |
|---|---|---|
| Authenticator App (TOTP - RFC 6238) | Primary (preferred) | Highest |
| Biometric (Face ID / Fingerprint) | Primary on mobile | Highest |
| Hardware Security Key (FIDO2/WebAuthn) | Required for L5 | Highest |
| Email OTP | Fallback only | Medium |
| SMS OTP | Emergency fallback | Lower (SIM-swap risk) |

**MFA Bypass:** Never allowed for L4/L5 roles. L2/L3 roles may have emergency bypass with CEO + System Admin dual approval + full audit.

---

### 1.4 Biometric Authentication

| Platform | Method | Usage |
|---|---|---|
| iPhone | Face ID | Login + sensitive action re-auth |
| iPad | Face ID / Touch ID | Login + sensitive action re-auth |
| Android | Fingerprint / Face | Login + sensitive action re-auth |
| macOS | Touch ID / Face ID | Login + sensitive action re-auth |
| Web | WebAuthn | Login (if hardware key enrolled) |

**Re-authentication triggers (always require biometric):**
- Accessing Executive Vault
- Approving financial transactions above threshold
- Exporting sensitive data
- Changing security settings
- Role reassignment actions
- Viewing payroll records

---

## 2. AUTHORIZATION ARCHITECTURE

### 2.1 Permission Model

Every authorization check evaluates four dimensions simultaneously:

```
AUTHORIZED = Role ∩ Permission ∩ Scope ∩ Company
```

All four must satisfy for access to be granted.

### 2.2 Permission Types

| Permission | Description |
|---|---|
| `none` | No access — resource not visible |
| `read` | View only — no modification |
| `write` | Create and update |
| `manage` | Read + write + manage sub-resources |
| `admin` | Full CRUD + configure settings |
| `full` | Admin + delegate permissions |

### 2.3 Authorization Flow

```
Request arrives
    ↓
Token decoded → user_id extracted
    ↓
User record loaded → role, company, scope resolved
    ↓
Permission table checked → does role have {permission} on {resource_type}?
    ↓
Scope validated → does resource_id fall within user's scope?
    ↓
Company isolation → does resource belong to user's authorized company/companies?
    ↓
Data filter applied → response filtered to scope (even on "read all" queries)
    ↓
Action executed
    ↓
Audit entry written
```

### 2.4 Scope Enforcement

Scope is enforced at the **database query layer**, not just the API layer.
Every query includes an automatic scope filter — no role can accidentally retrieve out-of-scope data even through API manipulation.

```
Example:
Team Leader queries team attendance
→ Query automatically adds: WHERE team_id IN (user.assigned_teams)
→ No matter what team_id is passed in the request
```

### 2.5 Role Assignment Security

- Only System Administrator can create/modify roles
- Only CEO can assign System Administrator role
- Role changes require: requesting admin + dual approval for L4+ roles
- Every role change: audit entry + notification to CEO/Co-CEO
- Role changes take effect immediately (no grace period for downgrade)
- Downgraded sessions are invalidated within 60 seconds

---

## 3. AUDIT ARCHITECTURE

### 3.1 Audit Log Entry Structure

Every action in PRV produces an immutable audit entry:

```json
{
  "id": "UUID",
  "timestamp": "ISO8601 with milliseconds",
  "user_id": "UUID",
  "user_email": "string",
  "role": "RoleEnum",
  "action": "ActionEnum",
  "resource_type": "ResourceEnum",
  "resource_id": "UUID",
  "resource_name": "string (at time of action)",
  "scope": "ScopeEnum",
  "company_id": "UUID",
  "store_id": "UUID | null",
  "project_id": "UUID | null",
  "ip_address": "string",
  "ip_country": "string",
  "device_id": "UUID",
  "device_name": "string",
  "device_type": "iOS | Android | Web | macOS",
  "session_id": "UUID",
  "result": "SUCCESS | DENIED | ERROR",
  "denial_reason": "string | null",
  "previous_value": "encrypted JSON | null",
  "new_value": "encrypted JSON | null",
  "metadata": {},
  "checksum": "SHA-256 of entry (tamper detection)"
}
```

### 3.2 Audited Actions

| Category | Actions Audited |
|---|---|
| Authentication | LOGIN, LOGOUT, LOGIN_FAILED, MFA_SUCCESS, MFA_FAILED, BIOMETRIC_SUCCESS, BIOMETRIC_FAILED, SESSION_EXPIRED, PASSWORD_CHANGE, PASSWORD_RESET |
| Data Access | READ (L4+ only), CREATE, UPDATE, DELETE, EXPORT, DOWNLOAD, PRINT, SHARE |
| Financial | PAYMENT_APPROVED, PAYMENT_REJECTED, INVOICE_CREATED, PAYROLL_RUN, BUDGET_MODIFIED |
| Approvals | APPROVED, REJECTED, ESCALATED |
| Security | ROLE_ASSIGNED, ROLE_REVOKED, PERMISSION_CHANGED, DEVICE_REGISTERED, DEVICE_REVOKED, ACCOUNT_SUSPENDED, ACCOUNT_UNLOCKED, MFA_ENABLED, MFA_DISABLED |
| Documents | DOCUMENT_VIEWED, DOCUMENT_DOWNLOADED, DOCUMENT_SHARED, DOCUMENT_WATERMARKED, LINK_GENERATED, LINK_EXPIRED |
| System | SETTING_CHANGED, INTEGRATION_ENABLED, INTEGRATION_DISABLED, BACKUP_CREATED, BACKUP_RESTORED, LOCKDOWN_ACTIVATED |

### 3.3 Audit Log Immutability

- Audit logs are **append-only** — no update or delete operations exist at any permission level
- Each entry contains a SHA-256 checksum of its own content
- Each entry also contains the checksum of the previous entry (chain integrity — like blockchain)
- Any tampering attempt breaks the chain and triggers an automatic security alert
- Even System Administrator cannot delete or modify audit entries
- Logs are replicated to isolated storage not accessible from the main application

### 3.4 Audit Log Retention

| Security Level | Role Examples | Retention |
|---|---|---|
| L2 — Standard | Worker, Seller, Project Worker | 90 days (hot) + 1 year (cold archive) |
| L3 — Elevated | Team Leader, OMS, Store Manager, HR | 1 year (hot) + 3 years (cold archive) |
| L4 — Executive | CEO, Co-CEO, Shop Director, Project Director | 7 years (hot) + permanent (cold archive) |
| L5 — System | System Administrator | Permanent (forensic-grade, isolated) |

### 3.5 Audit Access Permissions

| Role | Can View | Can Export | Can Delete |
|---|---|---|---|
| CEO | Company-wide | Yes (own company) | Never |
| Co-CEO | Company-wide | Yes (own company) | Never |
| System Administrator | All (technical) | Yes (technical) | Never |
| HR / Payroll | HR actions only | Limited | Never |
| Operations Manager | Regional | No | Never |
| All others | Own actions only | No | Never |

---

## 4. ENCRYPTION ARCHITECTURE

### 4.1 Data In Transit

- **Protocol:** TLS 1.3 (minimum) — TLS 1.2 rejected
- **Certificate:** EV certificate, pinned on mobile apps
- **HSTS:** Enforced with minimum 1 year max-age
- **Certificate Transparency:** Mandatory
- **MTLS:** Used for internal service-to-service communication

### 4.2 Data At Rest

- **Primary encryption:** AES-256-GCM
- **Key management:** Hardware Security Module (HSM) — keys never leave HSM
- **Key rotation:** Automatic every 90 days
- **Database encryption:** Full-disk + column-level for sensitive fields

### 4.3 Sensitive Field Encryption (Column-Level)

Fields encrypted with an additional layer beyond disk encryption:

| Field Category | Fields | Encryption |
|---|---|---|
| Personal Identity | National ID, passport, tax number | AES-256 + field-level key |
| Financial | Bank accounts, card data, salary | AES-256 + field-level key + tokenization |
| Authentication | Password hashes | Argon2id (not reversible) |
| MFA Secrets | TOTP seeds | AES-256 + dedicated KMS key |
| Documents | Contract content, legal docs | AES-256 + document-specific key |
| AI Conversations | Executive AI chat history | AES-256 + session key |
| Biometric References | Face ID / fingerprint hashes | Never stored (verified by OS only) |

### 4.4 Encryption Key Hierarchy

```
Master Key (HSM, never leaves hardware)
    ↓
Company Key (per company, derived from master)
    ↓
Domain Key (per domain: HR / Finance / Projects / etc.)
    ↓
Record Key (per sensitive record, for highest classification)
```

### 4.5 End-to-End Encryption

Project chat messages and Executive Vault documents are end-to-end encrypted.
Server processes metadata only — cannot read content.

---

## 5. DEVICE ARCHITECTURE

### 5.1 Device Registration

Every device accessing the Business OS is registered and tracked.

**Device Record:**
```json
{
  "device_id": "UUID",
  "user_id": "UUID",
  "device_name": "User-defined name (e.g. 'Alex iPhone 16 Pro')",
  "device_type": "iOS | Android | Web | macOS | Windows",
  "device_fingerprint": "hardware-derived unique hash",
  "os_version": "string",
  "app_version": "string",
  "registered_at": "ISO8601",
  "last_activity_at": "ISO8601",
  "last_ip": "string",
  "last_location_approx": "City, Country",
  "trusted": true | false,
  "status": "Active | Revoked | Suspended"
}
```

### 5.2 New Device Flow

```
First login on new device
    ↓
Credentials verified
    ↓
"New device detected" — notification sent to all existing trusted devices
    ↓
User must approve from existing trusted device OR
Complete enhanced verification (additional OTP + biometric)
    ↓
Device registered + named by user
    ↓
Trust level assigned based on role
```

### 5.3 Device Trust Levels

| Trust Level | Requirements | Session Duration |
|---|---|---|
| Trusted Personal | Registered + biometric enrolled | Full session duration |
| Trusted Corporate | MDM-managed + certificate enrolled | Full session duration |
| Untrusted | New / unrecognized | Re-auth every 30 minutes |
| Revoked | Admin/user revoked | No access |

### 5.4 Device Management (User Self-Service)

Every user can:
- View all their registered devices
- See last activity and approximate location
- Revoke individual devices
- Log out all devices simultaneously
- Rename devices

Every user receives instant push notification when:
- New device registered
- Device revoked
- Login from new location

### 5.5 Device Limits Per Role

| Security Level | Max Trusted Devices |
|---|---|
| L2 | 5 |
| L3 | 3 |
| L4 | 2 |
| L5 | 1 (+ 1 backup hardware key) |

### 5.6 Mobile Device Security (iOS / Android)

- **Jailbreak/Root detection:** App refuses to run on compromised devices
- **App attestation:** iOS DeviceCheck + Android SafetyNet / Play Integrity
- **Screenshot prevention:** Sensitive screens marked non-capturable
- **App backgrounding:** Blur sensitive content when app leaves foreground
- **Clipboard restrictions:** Prevent copying of financial / sensitive data
- **Auto-lock:** App locks after 5 minutes background (L3+) / 2 minutes (L4+)

---

## 6. SESSION ARCHITECTURE

### 6.1 Session Token Structure

```
Access Token:  JWT (RS256) · short-lived
Refresh Token: Opaque · long-lived · stored in secure enclave (mobile) / httpOnly cookie (web)
Session ID:    UUID · tracked server-side · revocable
```

### 6.2 Session Expiration Policy

| Security Level | Access Token TTL | Refresh Token TTL | Inactivity Timeout | Re-auth Triggers |
|---|---|---|---|---|
| L2 (Worker, Seller) | 60 minutes | 30 days | 8 hours | Password change |
| L3 (Manager, OMS, HR) | 30 minutes | 14 days | 4 hours | Sensitive action |
| L4 (Executive, Director) | 15 minutes | 7 days | 30 minutes | Every sensitive action |
| L5 (System Admin) | 10 minutes | 1 day | 15 minutes | Every action requiring write |

### 6.3 Session Refresh Flow

```
Access token expires
    ↓
Client sends refresh token
    ↓
Server validates: refresh token valid + not revoked + device trusted + session not flagged
    ↓
New access token issued
    ↓
Refresh token rotation (old invalidated, new issued)
```

Refresh token compromise: if old refresh token is used after rotation → **security alert + all sessions revoked**.

### 6.4 Forced Re-authentication Triggers

Regardless of session validity, re-authentication (biometric minimum) is required for:
- Accessing Executive Vault
- Approving transactions above threshold
- Exporting data (L3+ roles)
- Changing own security settings
- Viewing payroll records
- Accessing audit logs
- Any L4 action after 15 minutes of inactivity

### 6.5 Session Invalidation

Sessions are immediately invalidated when:
- User logs out
- Device is revoked
- Role is downgraded
- Account is suspended
- Password is changed
- Security incident detected
- CEO/System Admin initiates Global Lockdown
- Impossible travel detected

Invalidation propagates within 60 seconds across all services.

### 6.6 Concurrent Session Policy

| Level | Max Concurrent Sessions | Behavior on Exceed |
|---|---|---|
| L2 | 3 | Oldest session terminated |
| L3 | 2 | Oldest session terminated + notification |
| L4 | 1 | Previous session terminated + alert sent |
| L5 | 1 | Previous session terminated + security alert |

---

## 7. SECURITY MONITORING ARCHITECTURE

### 7.1 Threat Detection Rules

All rules run in real-time against the event stream:

| Threat | Detection Logic | Response |
|---|---|---|
| Brute Force | >3 failed logins in 5 minutes | Lock account + alert |
| Credential Stuffing | >10 failed logins across accounts from same IP | IP block + alert |
| Impossible Travel | Login from location B within time impossible from location A | Alert + re-auth required |
| Unusual Export | Export volume >2x 30-day average | Flag + require approval |
| Privilege Escalation | Permission check denied >5 times in 1 hour | Alert + account review |
| Mass Data Access | >500 record reads in 5 minutes (non-analyst role) | Rate limit + alert |
| Off-Hours Access | L4 login outside business hours from unknown location | Re-auth + alert |
| Session Hijacking | Token used from different device fingerprint | Immediate revocation + alert |
| Anomalous Role Usage | First-time module access at unusual hour | Log + soft alert |
| Data Exfiltration Pattern | Sequential download of document categories | Alert + temporary DLP block |

### 7.2 Alert Routing

| Threat Level | Alert Recipients | Channel |
|---|---|---|
| CRITICAL | CEO + Co-CEO + System Admin | Push (immediate) + Email + SMS |
| HIGH | System Admin + relevant domain head | Push + Email |
| MEDIUM | System Admin | Push + Inbox |
| LOW | System Admin | Inbox |

### 7.3 Security Score

A real-time security score (0-100) is calculated for the organization:

**Factors:**
- % of L3+ accounts with MFA enabled (20 points)
- % of devices trusted vs unrecognized (20 points)
- Failed login rate (15 points)
- Session compliance (expiration policy adherence) (15 points)
- Open security alerts count (20 points)
- Audit log integrity (chain intact) (10 points)

Score displayed on Security Dashboard (CEO + System Admin only).

---

## 8. DATA LOSS PREVENTION (DLP) ARCHITECTURE

### 8.1 DLP Rules

| Trigger | Threshold | Action |
|---|---|---|
| Mass export (non-analyst) | >100 records in single export | Block + alert + require approval |
| Sensitive document download | Any payroll / contract / legal doc | Log + watermark + notify owner |
| Bulk document download | >20 documents in 1 hour | Slow throttle + alert |
| Sharing outside company | Document shared to external email | Alert + confirm intent |
| Screenshot detection (mobile) | Sensitive screen captured | Log + warn user |
| Copy/paste of sensitive field | Financial / personal data field | Block + log |

### 8.2 Watermarking

Documents downloaded from the system are automatically watermarked with:
- User name
- User email
- Download timestamp
- Device name
- Company name

Watermarking applies to: contracts, invoices, payslips, financial reports, strategic documents.

### 8.3 Expiring Links

When documents are shared externally:
- Link expires in: 24h (default) / 7 days (extended, requires approval)
- Link is single-use or limited-use (configurable)
- Access tracked: opened, from which IP, at what time
- Link can be revoked at any time
- Expired link access → log entry + notify document owner

---

## 9. DOCUMENT SECURITY ARCHITECTURE

### 9.1 Document Classification

| Level | Label | Description | Access |
|---|---|---|---|
| Public | OPEN | Marketing materials, product catalogues | Anyone |
| Internal | INTERNAL | Operational documents, schedules | All employees |
| Confidential | CONFIDENTIAL | Contracts, financial reports, HR records | Role-based |
| Restricted | RESTRICTED | Payroll, personal data, legal | Named individuals |
| Executive | EXECUTIVE | Board reports, M&A, strategic docs | CEO/Co-CEO + named |

### 9.2 Document Access Tracking

Every document interaction is recorded:
- Opened (timestamp, user, device, location)
- Time spent viewing (approximate)
- Downloaded (watermark applied, logged)
- Shared (to whom, when, expiry set)
- Modified (diff stored in audit log)
- Printed (if print is allowed — logged)

### 9.3 Executive Vault

Secure storage for highest classification documents.

**Access requirements:**
1. Role must be CEO, Co-CEO, or explicitly granted Executive Vault access
2. Biometric authentication (Face ID) required every time
3. MFA re-verification required every time
4. Access logged with full detail (including view duration)
5. Cannot be accessed from untrusted devices
6. Documents cannot be downloaded — view-only in secure viewer
7. Screenshots blocked at OS level (iOS entitlement)

**Content:**
- Strategic planning documents
- M&A documents
- Executive compensation records
- Board meeting minutes
- Legal agreements (company-level)
- Financial forecasts (full)

---

## 10. COMPANY ISOLATION ARCHITECTURE

### 10.1 Multi-Tenant Isolation Model

PRV uses **logical isolation with cryptographic boundaries** per company.

Every database record carries `company_id`. All queries are automatically scoped.

```
User makes request
    ↓
company_id extracted from JWT
    ↓
All queries: WHERE company_id = {user.company_id}
    ↓
Response filtered — cross-company data physically impossible to retrieve
    ↓
(CEO only: company_id = ANY(user.authorized_companies))
```

### 10.2 Cross-Company Rules

| Scenario | Rule |
|---|---|
| Employee of Company A | Cannot see any data from Company B |
| Store Manager of Store 1 | Cannot see Store 2 data (different company) |
| Regional Manager | Can only see stores in assigned region/company |
| CEO of PRV Group | Can see all companies — explicit switch required (no default "all") |
| System Admin | Sees system data, not business data from any company |

### 10.3 CEO Cross-Company Access

CEO global access requires:
- Explicit company selection (no implicit "show all")
- Each company switch is logged (audit entry)
- Cannot perform write operations across companies in a single action
- Financial approvals are company-specific, not cross-company

---

## 11. COMPLIANCE ARCHITECTURE

### 11.1 GDPR Compliance

| Requirement | Implementation |
|---|---|
| Right to Access | User can download own data (structured, machine-readable) |
| Right to Erasure | Soft-delete + anonymization pipeline (audit logs retain anonymized version) |
| Right to Rectification | User can update own profile data |
| Data Minimization | Only necessary data collected per role |
| Consent Management | Explicit consent for: marketing, analytics, data sharing |
| Data Retention | Automatic deletion schedules per data category |
| Breach Notification | 72-hour notification pipeline (CEO + DPO + affected users) |
| DPO Access | Designated Data Protection Officer role with compliance-specific access |

### 11.2 Data Retention Schedules

| Data Category | Retention Period | Action at Expiry |
|---|---|---|
| Authentication logs | 1 year | Anonymize + archive |
| Business transaction records | 7 years (legal) | Archive + encrypt |
| Employee records (active) | Duration of employment + 5 years | Anonymize |
| Employee records (terminated) | 5 years post-termination | Delete |
| Financial records | 10 years (legal) | Archive |
| Project documents | Duration + 5 years | Archive |
| AI conversation logs | 90 days | Delete |
| Audit logs | See section 3.4 | Archive |
| Session logs | 90 days | Delete |

### 11.3 Consent Management

Users are asked for explicit consent for:
- Analytics tracking (beyond operational necessity)
- Marketing communications
- Third-party integrations
- AI training data contribution (opt-in only)

Consent is versioned, timestamped, and stored with audit trail.
Consent withdrawal takes effect within 24 hours.

---

## 12. BACKUP & RECOVERY ARCHITECTURE

### 12.1 Backup Schedule

| Frequency | Scope | Retention | Storage |
|---|---|---|---|
| Continuous (WAL streaming) | Database changes | 7 days | Encrypted, separate region |
| Daily | Full database snapshot | 30 days | Encrypted, separate region |
| Weekly | Full system backup | 90 days | Encrypted, separate provider |
| Monthly | Archive backup | 7 years | Cold storage, encrypted |

### 12.2 Backup Encryption

- All backups encrypted with AES-256 before leaving primary storage
- Backup encryption keys stored in separate KMS from application keys
- Keys rotated annually
- Backup restoration requires dual-authorization (System Admin + CEO)

### 12.3 Recovery Objectives

| Metric | Target |
|---|---|
| RPO (Recovery Point Objective) | < 5 minutes (continuous WAL streaming) |
| RTO (Recovery Time Objective) | < 30 minutes (hot standby) |
| Data restoration (single record) | < 5 minutes |
| Data restoration (company) | < 2 hours |
| Full system restoration | < 4 hours |

### 12.4 Granular Recovery

Recovery is possible at any of these levels:
- **Single record** — restore a deleted record (within retention)
- **User data** — restore a user's full data state to a point in time
- **Project** — restore a full project to a point in time
- **Company** — restore all company data to a point in time
- **Full system** — restore entire PRV platform

All restoration actions require: System Admin authorization + CEO approval + full audit trail.

---

## 13. LOCKDOWN MODE ARCHITECTURE

### 13.1 What is Lockdown Mode

Lockdown Mode is an emergency security posture that can be activated by CEO or System Administrator in response to a confirmed or suspected security incident.

### 13.2 Lockdown Levels

| Level | Name | Effect |
|---|---|---|
| L1 | Alert Mode | Heightened monitoring · No behavioral change · Security team notified |
| L2 | Restricted Mode | External integrations suspended · Export disabled · All sessions require re-auth |
| L3 | Partial Lockdown | Non-essential modules suspended · Only L4+ can log in · All others shown maintenance screen |
| L4 | Full Lockdown | Complete platform suspended · Only System Admin + CEO can access · Read-only mode |
| L5 | Emergency Shutdown | All sessions terminated · No logins possible · Manual restoration required |

### 13.3 Lockdown Activation

- Available to: CEO (levels 1-4) · System Admin (levels 1-5)
- Requires: Biometric + MFA confirmation
- Activation logged: full detail entry in isolated audit trail
- Notifications: immediate push to all L4 role holders + email

### 13.4 Module-Level Restrictions

CEO and System Admin can individually disable/restrict specific modules:
- Disable exports for specific roles
- Restrict specific company data
- Suspend specific user accounts
- Force re-authentication for all active sessions
- Restrict AI access
- Suspend third-party integrations

### 13.5 Lockdown Exit

Exiting Lockdown requires:
- CEO + System Admin dual authorization
- Incident report filed
- Affected users notified of reason (where legally permissible)
- All sessions re-established from scratch (no session restoration)

---

## 14. SECURITY DASHBOARD ARCHITECTURE

### 14.1 Available To

- CEO (company-wide view)
- Co-CEO (company-wide view)
- System Administrator (full technical view)

### 14.2 Dashboard Sections

**Section 1: Security Score**
- Overall score (0-100) with trend
- Score breakdown by category
- Comparison to previous week
- Recommended actions to improve score

**Section 2: Active Devices**
- Total active devices (by platform)
- Trusted vs unrecognized count
- Recent device registrations
- Recently revoked devices
- Map view (approximate locations)

**Section 3: Authentication Activity**
- Logins (24h, 7d, 30d)
- Failed login attempts (with spike detection)
- MFA success/failure rates
- Biometric success rates
- New device registrations

**Section 4: Security Alerts**
- Open alerts (by severity)
- Alert timeline
- Alert resolution status
- False positive rate

**Section 5: Risk Register**
- Current risk items (scored by severity)
- Risk trend (improving / degrading)
- Time-to-resolution for historical risks

**Section 6: Audit Activity**
- Action volume by category (24h)
- Top active users
- Unusual patterns flagged
- Export activity
- Document access spikes

**Section 7: Compliance Status**
- GDPR compliance checklist
- Data retention compliance %
- MFA adoption rate (by role)
- Consent coverage %
- Outstanding compliance items

**Section 8: Access Anomalies**
- Impossible travel events
- Off-hours access events
- Excessive permission denials
- Unusual data access patterns

### 14.3 Security Dashboard Alerts (Real-time)

| Alert | Trigger | Display |
|---|---|---|
| Breach Attempt | >5 failed logins in 1 minute | Red banner + sound |
| Impossible Travel | Login from impossible location | Orange alert card |
| MFA Disabled | L3+ user disables MFA | Critical alert |
| Mass Export | Unusual export volume | Warning card |
| Lockdown Required | Score drops below 40 | Recommendation banner |
| Audit Chain Break | Checksum mismatch detected | Critical alert + immediate escalation |

---

## SECURITY ARCHITECTURE SUMMARY

```
ZERO TRUST
    │
    ├── Authentication
    │       ├── Invitation-only accounts
    │       ├── Email + Password + MFA + Biometric
    │       ├── Device trust verification
    │       └── Progressive step-up auth for sensitive actions
    │
    ├── Authorization
    │       ├── Role + Permission + Scope + Company (4-dimensional check)
    │       ├── Query-level scope filtering (not just API)
    │       └── Real-time role invalidation
    │
    ├── Session Management
    │       ├── Short-lived access tokens + rotating refresh tokens
    │       ├── Role-based session duration
    │       ├── Inactivity timeout
    │       └── Forced re-auth for sensitive actions
    │
    ├── Device Security
    │       ├── Device registration + trust scoring
    │       ├── Jailbreak/root detection
    │       ├── App attestation
    │       └── Remote device revocation
    │
    ├── Encryption
    │       ├── TLS 1.3 in transit
    │       ├── AES-256-GCM at rest
    │       ├── Column-level encryption for sensitive fields
    │       └── HSM key management
    │
    ├── Monitoring
    │       ├── Real-time threat detection
    │       ├── Impossible travel detection
    │       ├── Anomaly scoring
    │       └── Automated alert routing
    │
    ├── Audit
    │       ├── Append-only immutable log
    │       ├── SHA-256 chain integrity
    │       ├── Role-based retention
    │       └── Isolated storage
    │
    ├── Data Protection
    │       ├── Company isolation (tenant separation)
    │       ├── DLP rules (export, download, sharing)
    │       ├── Watermarking
    │       └── Expiring links
    │
    ├── Recovery
    │       ├── Continuous WAL streaming (RPO < 5 min)
    │       ├── Granular restoration (record → company → full)
    │       └── Dual-authorization for restoration
    │
    └── Compliance
            ├── GDPR (erasure, access, minimization)
            ├── Data retention schedules
            ├── Consent management
            └── Breach notification pipeline
```

---

*End of PRV Security Architecture v1.0*
*This document governs all security decisions in the PRV ecosystem.*
*No security mechanism may be weakened, bypassed, or simplified without CEO + System Admin dual approval.*
