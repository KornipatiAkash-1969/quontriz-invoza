# 📄 Quontriz Invoza - Complete Platform Documentation

**Platform**: Quontriz Invoza Supermarket Invoice & Inventory System  
**Version**: 1.0.0 (Production Release)  
**Live Production URL**: [https://quontriz-invoza.onrender.com](https://quontriz-invoza.onrender.com)  
**Source Repository**: [https://github.com/KornipatiAkash-1969/quontriz-invoza.git](https://github.com/KornipatiAkash-1969/quontriz-invoza.git)  

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture & Technology Stack](#2-system-architecture--technology-stack)
3. [Role Permissions & Operational Segregation](#3-role-permissions--operational-segregation)
4. [Invoice Intake & Multi-Engine OCR Pipeline](#4-invoice-intake--multi-engine-ocr-pipeline)
5. [Side-by-Side Review & Arithmetic Reconciliation](#5-side-by-side-review--arithmetic-reconciliation)
6. [Owner Approval & Multi-Mode Payment Workflow](#6-owner-approval--multi-mode-payment-workflow)
7. [Store Inventory Demand Management](#7-store-inventory-demand-management)
8. [Cross-Portal Notifications & Real-Time Sync](#8-cross-portal-notifications--real-time-sync)
9. [Enterprise Security & Zero-Leak Architecture](#9-enterprise-security--zero-leak-architecture)
10. [Database Architecture & Schema Specification](#10-database-architecture--schema-specification)
11. [REST API Reference Guide](#11-rest-api-reference-guide)
12. [Deployment & Infrastructure Guide](#12-deployment--infrastructure-guide)

---

## 1. Executive Summary

### 1.1 Problem Statement
Modern retail supermarkets, grocery chains, and wholesale distributors handle hundreds of supplier invoices weekly. Traditionally, this process is plagued by:
- **Manual Data Entry Bottlenecks**: Clerks manually re-typing line items and prices from paper or PDF bills into spreadsheets.
- **Arithmetic Inconsistencies & Overpayments**: Unnoticed discrepancies between item totals, taxes (CGST/SGST/IGST), and invoice grand totals.
- **Duplicate Billing Vulnerabilities**: Suppliers submitting duplicate bills leading to double disbursements.
- **Operational Disconnect**: Lack of immediate communication between floor staff receiving goods and store owners authorizing payments.
- **Stock Replenishment Delays**: Verbal or paper-based store demand requests getting lost, resulting in stockouts of essential supermarket goods.

### 1.2 The Quontriz Invoza Solution
**Quontriz Invoza** solves these challenges through an integrated, automated procurement platform:
- **Instant Document Intake**: High-accuracy optical character recognition (OCR) extracting headers, vendor details, and itemized line tables from digital PDFs, mobile photo bills, and scanned receipts.
- **AI-Driven Item Classification**: Automatic department prediction (e.g. *Grocery*, *Dairy*, *Beverages*, *Personal Care*) with real-time confidence scoring.
- **Side-by-Side Reconciliation**: Human-in-the-loop verification allowing staff and owners to review, edit, and auto-balance invoices before saving.
- **Multi-Mode Payment Recording**: Store owners can record payments across UPI, Bank Transfer (NEFT/RTGS), Cash, Cheque, or Company Card with full audit stamping.
- **Inventory Demand Intake**: Staff logs required stock items in seconds with automated author attribution, priority badges, and formatted Excel purchase order exports.
- **Cross-Portal Live Alerts**: Instant notification delivery across staff and owner portals using browser `BroadcastChannel` and background synchronization.

---

## 2. System Architecture & Technology Stack

### 2.1 High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT LAYER                           │
│        React 19 • Vite 6 • Tailwind CSS 3.4 • Chart.js • Lucide        │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │ Store Owner Portal  │   │ Store Staff Portal  │   │ Live Sync  │   │
│   │ Analytics & Approvals│  │ Intake & Demands    │   │ (4s / BC)  │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └─────┬──────┘   │
└──────────────┼─────────────────────────┼────────────────────┼──────────┘
               │                         │                    │
               ▼                         ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API & PIPELINE                          │
│               Node.js v24 • Express.js 4.21 • JWT • Multer             │
│                                                                        │
│   ┌───────────────────────┐         ┌──────────────────────────────┐   │
│   │  Auth & Permissions   │         │ Multi-Engine Document OCR    │   │
│   │  Bcrypt Salted Hash   │         │ Tesseract.js WASM + Regex    │   │
│   └───────────────────────┘         └──────────────┬───────────────┘   │
│   ┌───────────────────────┐                        ▼                   │
│   │  Notifications & Sync │         ┌──────────────────────────────┐   │
│   │  Broadcast / Polling  │         │ AI Classifier & Reconciler   │   │
│   └───────────────────────┘         └──────────────────────────────┘   │
└────────────────────────────────────────────┬───────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE STORAGE LAYER                          │
│        PostgreSQL 16+ (Render Cloud) / WASM Localhost Engine           │
│                                                                        │
│     [users]  [invoices]  [invoice_items]  [vendors]  [requirements]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack Details

- **Frontend**:
  - **React 19**: Modern component architecture utilizing concurrent hooks (`useCallback`, `useMemo`, `useRef`).
  - **Vite 6**: Lightning-fast compilation and HMR development server.
  - **Tailwind CSS 3.4**: Clean utility-first styling with custom retail color palettes.
  - **Chart.js & react-chartjs-2**: High-performance canvas charts for financial KPIs and spend categorization.
  - **Lucide React**: Vector iconography for intuitive navigation.
- **Backend**:
  - **Node.js (v20+ / v22+ / v24+)**: Non-blocking asynchronous event loop runtime.
  - **Express.js 4.21**: Robust HTTP routing with middleware architecture.
  - **Tesseract.js v5**: Pure WebAssembly OCR engine capable of running in Node.js with zero operating system C++ binaries or external tool dependencies.
  - **ExcelJS**: Programmatic generation of formatted Excel (`.xlsx`) spreadsheets.
  - **BcryptJS**: Salted cryptographic password hashing with 10 rounds.
  - **JSON Web Tokens (JWT)**: Cryptographically signed tokens with automated midnight (12:00 AM) expiration.
- **Database**:
  - **PostgreSQL 16+**: ACID-compliant relational storage hosted on Render Cloud.
  - **Pure-JS WASM PostgreSQL Engine**: Automatic fallback for local testing, enabling seamless local execution without requiring a local PostgreSQL service installation.

---

## 3. Role Permissions & Operational Segregation

Quontriz Invoza enforces strict **Role-Based Access Control (RBAC)** across two primary user portals:

### 3.1 Permissions Matrix & Feature Intersection

```text
       ┌───────────────────────────────┐       ┌───────────────────────────────┐
       │      STORE STAFF PORTAL       │       │      STORE OWNER PORTAL       │
       │                               │       │                               │
       │  • Upload Invoice PDFs        │       │  • Financial Analytics & KPIs │
       │  • Upload Mobile Bill Photos  │       │  • Approve Invoices & Pay     │
       │  • Submit Manual Invoices     │       │  • Reject Invoices with Reason│
       │  • Log Store Demands          │       │  • Team Management (CRUD)     │
       │  • View Self-Uploaded Bills   │       │  • Admin Password Resets      │
       │  • Receive Payment Alerts     │       │  • Toggle Requirement Status  │
       │                               │       │  • Export Demands to Excel    │
       │               ┌───────────────┴───────┴───────────────┐               │
       │               │      SHARED CORE INTERSECTION         │               │
       │               │                                       │               │
       │               │  • Cryptographic JWT Authentication   │               │
       │               │  • Midnight 12:00 AM Session Renewal  │               │
       │               │  • Master Invoice Directory Search    │               │
       │               │  • Clean Invoice PDF Download         │               │
       │               │  • Real-Time Notification Bell        │               │
       │               │  • Self Password Management           │               │
       │               └───────────────────────────────────────┘               │
       └───────────────────────────────────────────────────────────────────────┘
```

### 3.2 Granular Permissions Table

| Operational Capability | Store Staff | Store Owner | Backend Middleware Rule |
| :--- | :---: | :---: | :--- |
| **Login to Staff Tab** | ✅ Allowed | ❌ Denied (403) | `requireRole('staff')` |
| **Login to Owner Tab** | ❌ Denied (403) | ✅ Allowed | `requireRole('owner')` |
| **Invoice Upload (PDF/Image)** | ✅ Allowed | ✅ Allowed | `optionalToken` |
| **Interactive OCR Review** | ✅ Allowed | ✅ Allowed | `optionalToken` |
| **Invoice Approval & Payment** | ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Invoice Rejection** | ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Financial Analytics & Charts** | ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Team Management (Add/Delete)**| ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Submit Store Requirements** | ✅ Allowed | ✅ Allowed | `verifyToken` |
| **Update Requirement Status** | ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Export Requirements to Excel**| ❌ Denied (403) | ✅ Allowed | `verifyToken, requireRole('owner')` |
| **Self Password Change** | ✅ Allowed | ✅ Allowed | `verifyToken` |

---

## 4. Invoice Intake & Multi-Engine OCR Pipeline

Quontriz Invoza implements a **4-tier intake and extraction pipeline**:

```text
[Invoice Document: PDF or Image]
              │
              ▼
[Step 1: Ingestion & Validation] ──▶ Verifies MIME type and enforces 15MB file limit.
              │
              ▼
[Step 2: Stream Selection] ───────┬──▶ Digital PDF: Direct text and coordinate extraction.
                                  └──▶ Scanned/Image: Tesseract.js WASM OCR processing.
              │
              ▼
[Step 3: Semantic Tokenization] ──▶ Regex pattern recognition for GSTIN, Dates, PO, Totals.
              │
              ▼
[Step 4: AI Item Classification] ─▶ Categorizes items into Grocery, Dairy, Beverages, etc.
              │
              ▼
[Step 5: Reconciliation Engine] ──▶ Validates arithmetic (Subtotal + Taxes - Discounts = Total).
              │
              ▼
[Step 6: Duplicate Verification] ─▶ Checks database for existing (Vendor + Invoice Number).
              │
              ▼
[Step 7: Side-by-Side Review] ────▶ Interactive frontend review before database persistence.
```

### 4.1 Automated Category Prediction
Items are categorized using semantic rule sets and fuzzy dictionary matching:
- **Grocery**: Atta, Rice, Dal, Pulses, Sugar, Spices, Flour, Oil, Ghee.
- **Dairy**: Milk, Curd, Butter, Paneer, Cheese, Cream, Yogurt.
- **Beverages**: Tea, Coffee, Cold Drinks, Juices, Energy Drinks, Water.
- **Bakery & Snacks**: Bread, Biscuits, Chips, Cookies, Cakes, Toast.
- **Personal Care**: Soap, Shampoo, Toothpaste, Deodorant, Cream, Lotion.
- **Household & Cleaning**: Detergent, Dishwash, Floor Cleaner, Mosquito Spray, Bags.
- **Electronics**: Cables, Batteries, Torches, Adapters, Memory Cards.

Items scored with confidence `< 70%` display an amber review badge prompting the user to confirm or adjust the category dropdown.

---

## 5. Side-by-Side Review & Arithmetic Reconciliation

Before any invoice is committed to the database, it enters the **Interactive Review Page**:

### 5.1 Verification Features
- **Split Screen Layout**: Source document viewer on the left (with zoom, page flip, and rotate controls) and editable structured form on the right.
- **Inline Line-Item Editing**: Add, remove, or modify item names, quantities, units, unit prices, discounts, and tax rates.
- **Auto-Recalculate Totals**: Automatically recomputes taxable amount, CGST (9%), SGST (9%), IGST (18%), round-off, and grand total.
- **Duplicate Protection**: If an invoice number already exists for that supplier, a prominent warning dialog prevents accidental duplicate entries.
- **Upload Origin Tagging**:
  - **Staff PDF Upload**: Flagged with a distinctive badge and queued for Owner approval.
  - **Owner PDF Upload**: Flagged with an owner badge and verified for payment processing.
  - **Staff/Owner Image Upload**: Tagged when uploaded from mobile bill photos.
  - **Manual Entry**: Tagged when entered manually without physical file.

---

## 6. Owner Approval & Multi-Mode Payment Workflow

Invoices submitted by Staff enter status `Pending Approval`.

### 6.1 Payment Recording Workflow
1. The Store Owner opens the invoice details page.
2. The owner reviews line items, vendor details, and attached receipt document.
3. The owner clicks **"Approve & Pay"**.
4. An approval modal prompts for payment recording:
   - **Payment Method**: UPI, Bank Transfer (NEFT/RTGS), Cash, Cheque, Company Card.
   - **Payment Reference**: Transaction UTR, cheque number, or receipt reference.
   - **Approval Notes**: Optional accounting remarks.
5. Upon confirmation:
   - Invoice status transitions to `Paid`.
   - `paid_at` and `approved_by_user_id` are permanently recorded.
   - Submitting staff member receives an immediate payment alert notification.
   - Total business spend and vendor analytics update in real time.

---

## 7. Store Inventory Demand Management

The **Store Requirements** module enables seamless communication between supermarket floor staff and store owners regarding inventory shortages:

```text
Floor Staff identifies out-of-stock item (e.g. Rice - 25 KG)
                         │
                         ▼
Staff submits requirement form with item, quantity, unit, and priority
                         │
                         ▼
System permanently binds creator name (e.g. 'Staff: Akanksh')
                         │
                         ▼
Owner navigation bar immediately increments unviewed demand badge
                         │
                         ▼
Owner opens Requirements Table with prominent Requester Name Badge
                         │
                         ▼
Owner toggles status: [Pending] ➔ [Ordered] ➔ [Received]
                         │
                         ▼
One-click export to formatted Excel spreadsheet (.xlsx) for suppliers
```

### 7.1 Requester Attribution
Every requirement in the table and card view displays the author's badge:
```text
┌─────────────────────────────────────────────────────────────┐
│ Rice - 25 KG bags                                           │
│ Demand: Rice - 25 KG - 10 bags                              │
│ Staff: [👤 Akanksh]                    [Priority: Urgent]   │
└─────────────────────────────────────────────────────────────┘
```
This guarantees complete transparency and eliminates confusion about who requested which items.

---

## 8. Cross-Portal Notifications & Real-Time Sync

Quontriz Invoza features a **zero-latency cross-portal alert engine**:

### 8.1 Alert Routing Logic
- **Staff Uploads Invoice**: All Store Owners receive `"New Invoice Uploaded by Staff"` with supplier name and total amount.
- **Owner Uploads Invoice**: Peer Store Owners receive `"New Invoice Added by Owner"`.
- **Owner Approves & Pays Invoice**: The specific staff member who uploaded the bill receives an `"Invoice Approved & Paid"` confirmation.
- **Staff Submits Requirement**: Owners receive `"New Store Requirement Submitted"`.
- **Owner Fulfills Requirement**: Staff receives notification when the item is marked `"Ordered"` or `"Received"`.

### 8.2 Hybrid Synchronization Architecture
1. **Browser `BroadcastChannel` API**: Instantly broadcasts updates across all open tabs on the same device with 0ms latency.
2. **4-Second Polling**: Fetches updates from `/api/notifications/updates` to ensure remote devices update automatically.
3. **Window Focus Trigger**: Instantly queries the server when a user switches back to the application tab.
4. **Optimistic Route Badges**: Decrements unviewed badges immediately upon click for instant UI responsiveness.

---

## 9. Enterprise Security & Zero-Leak Architecture

### 9.1 Cryptographic Password Security
- Passwords stored in the PostgreSQL database use salted **Bcrypt** cryptographic hashing (`$2b$10$...`) with 10 salt rounds.
- Direct login strictly executes `bcrypt.compareSync(password, user.password_hash)`.
- Fallback plaintext comparisons are strictly forbidden in controllers.

### 9.2 Zero-Leak API Policy
- Database queries across `/api/auth/users`, `/api/auth/me`, and `/api/auth/login` explicitly omit `password_hash` and sensitive token secrets.
- The `/api/auth/demo-users` endpoint does not disclose passwords.
- Server console logs never log plain passwords.

### 9.3 Daily Midnight Session Expiration
- JWT tokens expire automatically at 12:00:00 AM midnight.
- Enforces fresh authentication at the start of each supermarket business day.

### 9.4 Frictionless Direct Login (No OTP)
- The OTP system has been completely eliminated across the frontend and backend.
- Users authenticate directly using email and password without dependency on SMS gateways or third-party email OTP services.

---

## 10. Database Architecture & Schema Specification

The platform utilizes a relational PostgreSQL schema:

```text
┌────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users      │       │     vendors     │       │   categories    │
├────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)        │       │ id (PK)         │       │ id (PK)         │
│ name           │   ┌───┤ vendor_name     │   ┌───┤ category_name   │
│ email (UNIQUE) │   │   │ gstin           │   │   └─────────────────┘
│ password_hash  │   │   │ address         │   │
│ role           │   │   └─────────────────┘   │
└───────┬────────┘   │                         │
        │            │                         │
        ▼            ▼                         ▼
┌───────────────────────────┐       ┌─────────────────────────┐
│         invoices          │       │      invoice_items      │
├───────────────────────────┤       ├─────────────────────────┤
│ id (PK)                   │       │ id (PK)                 │
│ invoice_number            │◀──────┤ invoice_id (FK)         │
│ vendor_id (FK)            │       │ item_name               │
│ created_by_user_id (FK)   │       │ category_id (FK)        │
│ approved_by_user_id (FK)  │       │ quantity, unit, price   │
│ total, tax, status        │       │ line_total              │
│ payment_method, paid_at   │       └─────────────────────────┘
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐       ┌─────────────────────────┐
│    store_requirements     │       │      notifications      │
├───────────────────────────┤       ├─────────────────────────┤
│ id (PK)                   │       │ id (PK)                 │
│ item_name, quantity, unit │       │ user_id (FK)            │
│ requested_by_user_id (FK) │       │ target_role             │
│ status (Pending/Ordered)  │       │ title, message, link    │
└───────────────────────────┘       └─────────────────────────┘
```

---

## 11. REST API Reference Guide

### 11.1 Authentication & Users

| Method | Endpoint | Access | Request Body | Response |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/auth/login` | Public | `{ email, password, portalRole }` | `{ success: true, token, user }` |
| `POST` | `/api/auth/logout` | Public | None | `{ success: true, message }` |
| `GET` | `/api/auth/me` | Authenticated | None | `{ success: true, user }` |
| `GET` | `/api/auth/users` | Owner Only | None | `{ success: true, data: [...] }` |
| `POST` | `/api/auth/users` | Owner Only | `{ name, email, password?, role }` | `{ success: true, user }` |
| `PUT` | `/api/auth/users/:id/password` | Owner Only | `{ newPassword }` | `{ success: true, message }` |
| `DELETE` | `/api/auth/users/:id` | Owner Only | None | `{ success: true, message }` |
| `POST` | `/api/auth/change-password` | All Users | `{ currentPassword, newPassword }`| `{ success: true, message }` |

### 11.2 Invoices & Procurement

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/invoices/upload` | All Users | Uploads invoice file and executes multi-engine OCR |
| `POST` | `/api/invoices/process-sample/:key` | All Users | Processes built-in test sample (`grocery`, `electronics`) |
| `POST` | `/api/invoices` | All Users | Persists confirmed invoice with line items |
| `GET` | `/api/invoices` | All Users | Fetches paginated, filtered invoice list |
| `GET` | `/api/invoices/:id` | All Users | Fetches single invoice with line items and vendor |
| `POST` | `/api/invoices/:id/approve-pay` | Owner Only | Approves invoice and records payment method |
| `POST` | `/api/invoices/:id/reject` | Owner Only | Rejects invoice with reason |
| `GET` | `/api/invoices/:id/pdf` | All Users | Downloads clean rendered PDF document |
| `DELETE` | `/api/invoices/:id` | Owner Only | Deletes invoice record and cascades line items |

### 11.3 Store Requirements

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/requirements` | All Users | Fetches requirements with requester attribution |
| `POST` | `/api/requirements` | All Users | Submits new store requirement |
| `PUT` | `/api/requirements/:id` | All Users | Updates requirement details or toggles status |
| `GET` | `/api/requirements/export/excel` | Owner Only | Downloads formatted Excel spreadsheet (`.xlsx`) |
| `DELETE` | `/api/requirements/:id` | Owner Only | Deletes store requirement |

---

## 12. Deployment & Infrastructure Guide

### 12.1 Live Cloud Hosting (Render)
- **Live URL**: [https://quontriz-invoza.onrender.com](https://quontriz-invoza.onrender.com)
- **Direct Login**: [https://quontriz-invoza.onrender.com/login](https://quontriz-invoza.onrender.com/login)
- **Architecture**: Render Node.js Web Service + Render Managed PostgreSQL (`quontriz-invoza-db`).
- **CI/CD**: Automatic zero-downtime builds triggered on every push to `main` branch.

### 12.2 Localhost Development Setup
1. **Clone repository**:
   ```bash
   git clone https://github.com/KornipatiAkash-1969/quontriz-invoza.git
   cd quontriz-invoza
   ```
2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
3. **Start full-stack application**:
   ```bash
   npm run dev
   ```
4. **Access locally**:
   - Frontend App: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

---

## 📄 License & Attribution
**ISC License**. Developed for Supermarket & Retail Enterprise Invoicing.  
All rights reserved © 2026 Quontriz Invoza.
