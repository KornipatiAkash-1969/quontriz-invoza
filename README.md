# 🧾 Quontriz Invoza - Intelligent Invoice Processing

A production-ready, full-stack **OCR Invoice Management and Item Classification System** built for supermarkets and retail businesses. Upload supplier invoices as PDF files (digital or scanned), extract invoice information, identify and classify purchased items into categories with confidence ratings, match or create vendors, and store everything in SQLite after interactive human-in-the-loop review.

---

## 🌟 Key Features

- **Role-Based Access Control (RBAC) with JWT Authentication**:
  - **Two Logins**:
    - **Owner Account**: Full access to financial analytics, approving pending invoices by recording payments (UPI, Bank Transfer, Cash, Cheque), vendor management.
    - **Employee Account**: Can upload invoices (PDF or Images) or manually enter entire invoices directly; submissions are queued for owner approval.
  - Pre-seeded one-click demo credentials on the login screen:
    - **Owner**: `owner@supermarket.com` / `owner123`
    - **Employee**: `employee@supermarket.com` / `emp123`
- **Multi-Format Invoice Intake**:
  - **PDF (Digital & Scanned)**: Direct text extraction or Tesseract.js WASM OCR.
  - **Images (PNG, JPG, JPEG, WebP)**: Mobile photo and scan OCR directly into line items.
  - **Manual Invoice Entry**: Employees can enter entire invoices manually with full vendor, items, and tax breakdown without requiring a document upload.
- **Owner Payment & Approval Workflow**:
  - Invoices created by employees enter status `Pending Approval`.
  - Store owner can review the invoice and click **"Approve & Pay"**.
  - Supports payment recording via **UPI**, **Bank Transfer (NEFT/RTGS)**, **Cash**, **Cheque**, and **Company Card**, storing the transaction reference, payment timestamp, and approver attribution.
- **Invoice Information Extraction**:
  - Automatically parses Vendor Name, Vendor Address, GSTIN, Invoice Number, Invoice Date, Due Date, PO Number, Subtotal, Discount, Tax / GST, and Grand Total.
  - Extracts line items: Item Name, SKU/Product Code, Quantity, Unit, Unit Price, Discount, Tax, and Total Price.
- **AI / Modular Item Classification Engine**:
  - Analyzes item names and predicts categories (e.g. `Samsung LED TV` ➔ **Electronics**, `Coca Cola 500ml` ➔ **Beverages**, `Amul Milk` ➔ **Dairy**, `Aashirvaad Atta` ➔ **Grocery**).
  - Returns classification confidence score (e.g. `98%`).
  - Low-confidence items (< 70%) are flagged with a review badge for manual category correction.
  - Modular architecture: Easily switch or plug in external LLMs (OpenAI, Gemini) without altering controllers.
- **Vendor Recognition & Fuzzy Matching**:
  - Normalizes vendor names, strips legal suffixes (`Pvt Ltd`, `LLP`, `Inc`), and computes string similarity.
  - Automatic match by GSTIN or company name.
  - Detects new suppliers and allows one-click vendor creation with pre-filled fields.
- **Human-in-the-Loop Invoice Review**:
  - Invoices are **NOT** blindly auto-saved.
  - Every single field (Vendor, Invoice #, Date, Items, Categories, Prices, Totals) is editable before saving.
  - Auto-calculate totals button.
- **Duplicate Invoice Detection**:
  - Checks if an invoice with the same `Vendor + Invoice Number` already exists before saving.
  - Prompts with `[View Existing]`, `[Save Anyway]`, or `[Cancel]`.
- **Interactive Dashboard & Business Analytics**:
  - Real-time KPIs: Total Invoices, Total Suppliers, Items Count, Total Purchase Spend, Pending Invoices.
  - Interactive charts:
    - Purchases by Category (Doughnut / Pie Chart)
    - Top Vendors by Spend (Horizontal Bar Chart)
    - Monthly Expenditure Trend (Line / Area Chart)
- **Supplier & Category Management**:
  - Vendor directory with aggregated spend, invoice history, and products purchased.
  - Category department manager with total spend and item count per category.
  - Vendor type management.
- **Live AI Classifier Sandbox**:
  - Interactive test tool in Settings where users can test item categorization in real-time.

---

## 🏗️ Architecture & Workflow

```text
Upload PDF (Drag-and-Drop or Browse)
     ↓
Detect PDF Type (Digital Text vs. Scanned Raster)
     ↓
Extract Text directly (or Tesseract OCR if scanned)
     ↓
Invoice Parser (Regex & Heuristic Tokenizer)
     ↓
Vendor Matcher (GSTIN & Fuzzy String Similarity)
     ↓
Modular Classifier (Category Dictionary & Confidence Scorer)
     ↓
Duplicate Detection Check (Vendor + Invoice Number)
     ↓
Interactive Review Page (User Edits & Confirms)
     ↓
Save to SQLite Database (Transactional Foreign Keys)
     ↓
Dashboard & History Updated
```

---

## 🛠️ Technology Stack

### Frontend
- **React 19** & **Vite 6**
- **Tailwind CSS 3.4**
- **React Router 7**
- **Axios**
- **Chart.js** & **react-chartjs-2**
- **Lucide React** (Modern iconography)

### Backend
- **Node.js** (v20+ / v22+ / v24+)
- **Express.js 4**
- **Multer** (Secure PDF uploads with MIME & 15MB size limits)
- **Tesseract.js v5** (Pure WebAssembly OCR worker — runs with zero OS binary dependencies)
- **pdf-parse** & **pdf-lib** (Digital extraction and page rasterization)
- **node:sqlite** / SQLite 3 (Foreign keys enabled, WAL journaling mode)

---

## 📂 Project Structure

```text
ocr-invoice-system/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, TopNav, App Shell
│   │   │   ├── ui/              # Modal, Toast, Badge, Card, Spinner, Pagination
│   │   │   ├── upload/          # Dropzone, ProcessingStepIndicator, SampleSelector
│   │   │   └── review/          # DuplicateWarningModal, RawOcrViewerModal, VendorCreateModal
│   │   ├── pages/               # Dashboard, Upload, Review, Invoices, Detail, Vendors, Categories, Settings
│   │   ├── services/            # Axios API client
│   │   ├── context/             # Toast Notification Context
│   │   ├── utils/               # Currency, Date, and File formatters
│   │   ├── App.jsx              # Routes configuration
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Tailwind directives
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/
│   ├── controllers/            # invoiceController, vendorController, categoryController, etc.
│   ├── routes/                 # Express API routes
│   ├── services/
│   │   ├── ocr/                # ocrService.js (Digital extraction + Tesseract OCR)
│   │   ├── invoiceParser/      # invoiceParser.js (Regex & semantic heuristic parser)
│   │   ├── classifier/         # classificationService.js & providers/ruleBasedProvider.js
│   │   └── vendorMatcher/      # vendorMatcher.js (Normalized fuzzy matching & GSTIN)
│   ├── database/               # db.js, initDb.js (SQLite tables & seed data)
│   ├── uploads/                # Secure PDF upload directory & samples
│   ├── utils/                  # multerConfig.js, samplePdfGenerator.js
│   ├── app.js                  # Main server entry point
│   ├── .env.example
│   └── package.json
│
├── package.json                # Root package with concurrently launcher
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: v20 or higher (Tested and verified on Node.js v24.19)
- **npm**: v10 or higher
- **Windows / macOS / Linux**: Runs cross-platform without requiring external C++ tools or poppler installs.

### Quick Start (Single Command)

1. Clone or navigate to the project directory:
   ```bash
   cd ocr-invoice-system
   ```

2. Install all dependencies across root, server, and client:
   ```bash
   npm run install:all
   ```

3. Launch both the Backend Server and Frontend Vite dev server concurrently:
   ```bash
   npm run dev
   ```

4. Open your browser:
   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`

---

## 🪟 Windows Setup Instructions

This application is built with pure JavaScript and WebAssembly dependencies (`node:sqlite` and `tesseract.js` WASM), meaning:
- **No Python or Visual Studio Build Tools required**.
- **No Ghostscript or Poppler `.exe` installations needed**.

### Running on PowerShell:

```powershell
# 1. Install root dependencies
npm install

# 2. Install server dependencies
cd server
npm install
cd ..

# 3. Install client dependencies
cd client
npm install
cd ..

# 4. Start full-stack app
npm run dev
```

### Running Frontend and Backend Separately:

If you prefer two separate terminal windows:

**Terminal 1 (Backend Server):**
```powershell
cd server
npm start
# Runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```powershell
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 📡 REST API Documentation

### Invoices

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/invoices/upload` | Upload PDF (multipart) and run OCR pipeline (returns parsed data without saving) |
| `POST` | `/api/invoices/process-sample/:key` | Run OCR on built-in samples (`electronics`, `grocery`, `scanned`) |
| `POST` | `/api/invoices` | Save confirmed/edited invoice and line items to SQLite |
| `GET` | `/api/invoices` | Fetch invoices with search, filters (vendor, category, status, date), sort, pagination |
| `GET` | `/api/invoices/:id` | Get single invoice with vendor details, items, and OCR raw text |
| `PUT` | `/api/invoices/:id` | Update invoice header and items |
| `DELETE` | `/api/invoices/:id` | Delete invoice and cascade line items |

#### Sample Payload for Saving Invoice (`POST /api/invoices`)

```json
{
  "vendorId": 1,
  "invoiceNumber": "INV-10234",
  "invoiceDate": "2026-10-06",
  "dueDate": "2026-11-06",
  "poNumber": "PO-9821",
  "subtotal": 96000.00,
  "discount": 0.00,
  "tax": 17280.00,
  "total": 113280.00,
  "status": "Approved",
  "pdfPath": "uploads/invoice_123.pdf",
  "ocrText": "TAX INVOICE...",
  "items": [
    {
      "itemName": "Samsung 55 inch LED TV",
      "sku": "ELEC-SAM-55",
      "category": "Electronics",
      "categoryId": 1,
      "quantity": 2,
      "unit": "pcs",
      "unitPrice": 45000.00,
      "discount": 0.00,
      "tax": 16200.00,
      "totalPrice": 106200.00,
      "classificationConfidence": 0.98
    }
  ]
}
```

### Vendors

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vendors` | List all vendors with total invoices and total spend |
| `POST` | `/api/vendors` | Create a new vendor profile |
| `GET` | `/api/vendors/:id` | Detailed vendor profile with invoice history and aggregated product purchases |
| `PUT` | `/api/vendors/:id` | Update vendor information |
| `DELETE` | `/api/vendors/:id` | Delete vendor profile |

### Categories & Vendor Types

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/categories` | List categories with item count and purchase spend |
| `POST` | `/api/categories` | Create a new product category |
| `PUT` | `/api/categories/:id` | Update category name |
| `DELETE` | `/api/categories/:id` | Delete category (re-links items to 'Other') |
| `GET` | `/api/vendor-types` | List vendor supplier types |
| `POST` | `/api/vendor-types` | Create a new vendor type |

### Dashboard & Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Returns KPIs, recent invoices, category breakdown, vendor spend, and monthly trend |

### Classifier Sandbox

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/classifier/test` | Test product name classification (`{ "itemName": "..." }`) |

---

## 🧪 Built-in One-Click Sample Invoices

The application automatically generates 3 real sample invoices on startup so you can test immediately:

1. **Digital Electronics Invoice**: `ABC Electronics Pvt Ltd` — Tests digital text extraction, electronics categorization (`Samsung LED TV`, `HDMI Cable`, `Logitech Mouse`), GSTIN, PO, and financial reconciliation.
2. **Supermarket Grocery Invoice**: `Metro Supermarket Wholesalers` — Tests multi-category recognition across Beverages (`Coca Cola`), Snacks (`Lays Chips`), Dairy (`Amul Milk`), Bakery (`Britannia Bread`), Grocery (`Aashirvaad Atta`), Personal Care (`Dove Soap`), Household (`Surf Excel`), Fruits & Vegetables (`Apples`), and Stationery (`Notebooks`).
3. **Scanned Image Invoice (Tesseract OCR Test)**: `Sunrise Agro Farms Pvt Ltd` — A pure raster PDF containing zero selectable digital text, automatically routed to the **Tesseract OCR WASM** engine to test visual OCR extraction.

You can trigger any of these samples from the **Upload Invoice** page with 1 click.

---

## 🔒 Security & Best Practices

- **Strict File Validation**: Only genuine `.pdf` MIME files accepted.
- **Upload Size Limits**: 15 MB limit enforced via Multer.
- **Safe File Naming**: Uploaded files use UUID and timestamp masking.
- **SQL Parameterization**: All queries use SQLite prepared statements to prevent SQL injection.
- **Non-Destructive Database Actions**: Foreign keys configured with `ON DELETE SET NULL` or `CASCADE` where appropriate.
- **Error Shielding**: Server internal stack traces are caught and sanitized before returning to the frontend.

---

## 📄 License
ISC License. Built for Supermarket & Retail Enterprise Invoicing.
