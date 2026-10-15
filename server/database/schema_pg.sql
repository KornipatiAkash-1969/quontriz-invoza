-- Quontriz Invoza PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_types (
  id SERIAL PRIMARY KEY,
  type_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(255),
  contact VARCHAR(255),
  email VARCHAR(255),
  address TEXT,
  gstin VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
  buyer_id INT REFERENCES buyers(id) ON DELETE SET NULL,
  invoice_number VARCHAR(255) NOT NULL,
  invoice_date VARCHAR(50),
  due_date VARCHAR(50),
  po_number VARCHAR(100),
  place_of_supply VARCHAR(100),
  currency VARCHAR(20) DEFAULT 'INR',
  payment_terms VARCHAR(255),
  category VARCHAR(255),
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  taxable_amount NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  cgst NUMERIC(15,2) DEFAULT 0,
  sgst NUMERIC(15,2) DEFAULT 0,
  igst NUMERIC(15,2) DEFAULT 0,
  freight_charges NUMERIC(15,2) DEFAULT 0,
  other_charges NUMERIC(15,2) DEFAULT 0,
  round_off NUMERIC(15,2) DEFAULT 0,
  total_gst NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  advance_paid NUMERIC(15,2) DEFAULT 0,
  paid NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  total_amount_in_words TEXT,
  pdf_path TEXT,
  ocr_text TEXT,
  status VARCHAR(100) DEFAULT 'Pending Approval',
  created_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  paid_at TIMESTAMPTZ,
  payment_notes TEXT,
  viewed_by_owner INT DEFAULT 0,
  viewed_at TIMESTAMPTZ,
  viewed_by_staff INT DEFAULT 1,
  staff_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INT,
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  sku VARCHAR(100),
  hsn_code VARCHAR(100),
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  quantity NUMERIC(15,3) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'pcs',
  unit_original VARCHAR(50),
  unit_normalized VARCHAR(50),
  unit_price NUMERIC(15,2) DEFAULT 0,
  price_unit_quantity NUMERIC(15,3) DEFAULT 1,
  price_unit_measure VARCHAR(50),
  discount NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  taxable_value NUMERIC(15,2) DEFAULT 0,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  cgst_amount NUMERIC(15,2) DEFAULT 0,
  sgst_amount NUMERIC(15,2) DEFAULT 0,
  igst_amount NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  total_price NUMERIC(15,2) DEFAULT 0,
  line_total NUMERIC(15,2) DEFAULT 0,
  calculation_valid INT DEFAULT 1,
  unit_flagged INT DEFAULT 0,
  classification_confidence NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_category_id ON invoice_items(category_id);

CREATE TABLE IF NOT EXISTS store_requirements (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  specification TEXT,
  quantity NUMERIC(15,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL DEFAULT 'bags',
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'Medium',
  estimated_price NUMERIC(15,2) DEFAULT 0,
  preferred_vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
  preferred_vendor_name VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  requested_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name VARCHAR(255),
  fulfilled_by_user_id INT,
  fulfilled_by_name VARCHAR(255),
  fulfilled_at TIMESTAMPTZ,
  viewed_by_owner INT DEFAULT 0,
  viewed_at TIMESTAMPTZ,
  viewed_by_staff INT DEFAULT 1,
  staff_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirements_status ON store_requirements(status);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  target_role VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  related_id INT,
  related_type VARCHAR(100),
  is_read INT DEFAULT 0,
  read_at TIMESTAMPTZ,
  created_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, is_read);



CREATE TABLE IF NOT EXISTS ai_learned_vendor_templates (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL UNIQUE,
  vendor_id INT,
  sample_count INT DEFAULT 1,
  table_format TEXT,
  column_order_json TEXT,
  unit_vocabulary_json TEXT,
  few_shot_prompt_json TEXT,
  accuracy_score NUMERIC(5,2) DEFAULT 0.95,
  last_trained_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_training_samples (
  id SERIAL PRIMARY KEY,
  invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
  vendor_id INT,
  vendor_name VARCHAR(255),
  document_type VARCHAR(50) DEFAULT 'pdf',
  ocr_text TEXT,
  ai_prediction_json TEXT,
  ground_truth_json TEXT,
  user_corrections_json TEXT,
  sample_quality_score NUMERIC(5,2) DEFAULT 1.0,
  is_validated INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_training_runs (
  id SERIAL PRIMARY KEY,
  model_type VARCHAR(100) DEFAULT 'hybrid_document_ai',
  training_samples_count INT DEFAULT 0,
  accuracy_before NUMERIC(5,2) DEFAULT 0.0,
  accuracy_after NUMERIC(5,2) DEFAULT 0.0,
  learned_patterns_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  logs TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_extraction_logs (
  id SERIAL PRIMARY KEY,
  invoice_id INT,
  engine VARCHAR(100),
  raw_text TEXT,
  ai_response TEXT,
  warnings TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
