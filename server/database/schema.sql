-- Quontriz Invoza Full MySQL Schema

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_types_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(255),
  contact VARCHAR(255),
  email VARCHAR(255),
  address TEXT,
  gstin VARCHAR(50),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendors_name (vendor_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS buyers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT,
  buyer_id INT,
  invoice_number VARCHAR(255) NOT NULL,
  invoice_date VARCHAR(50),
  due_date VARCHAR(50),
  po_number VARCHAR(100),
  place_of_supply VARCHAR(100),
  currency VARCHAR(20) DEFAULT 'INR',
  payment_terms VARCHAR(255),
  category VARCHAR(255),
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  taxable_amount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  cgst DECIMAL(15,2) DEFAULT 0,
  sgst DECIMAL(15,2) DEFAULT 0,
  igst DECIMAL(15,2) DEFAULT 0,
  freight_charges DECIMAL(15,2) DEFAULT 0,
  other_charges DECIMAL(15,2) DEFAULT 0,
  round_off DECIMAL(15,2) DEFAULT 0,
  total_gst DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  advance_paid DECIMAL(15,2) DEFAULT 0,
  paid DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  outstanding_balance DECIMAL(15,2) DEFAULT 0,
  total_amount_in_words TEXT,
  pdf_path TEXT,
  ocr_text LONGTEXT,
  status VARCHAR(100) DEFAULT 'Pending Approval',
  created_by_user_id INT,
  approved_by_user_id INT,
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  paid_at DATETIME,
  payment_notes TEXT,
  viewed_by_owner INT DEFAULT 0,
  viewed_at DATETIME,
  viewed_by_staff INT DEFAULT 1,
  staff_viewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoices_vendor_id (vendor_id),
  INDEX idx_invoices_number (invoice_number),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  line_number INT,
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  sku VARCHAR(100),
  hsn_code VARCHAR(100),
  category_id INT,
  quantity DECIMAL(15,3) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'pcs',
  unit_original VARCHAR(50),
  unit_normalized VARCHAR(50),
  unit_price DECIMAL(15,2) DEFAULT 0,
  price_unit_quantity DECIMAL(15,3) DEFAULT 1,
  price_unit_measure VARCHAR(50),
  discount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  taxable_value DECIMAL(15,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) DEFAULT 0,
  calculation_valid INT DEFAULT 1,
  unit_flagged INT DEFAULT 0,
  classification_confidence DECIMAL(5,2) DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_items_invoice_id (invoice_id),
  INDEX idx_invoice_items_category_id (category_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  specification TEXT,
  quantity DECIMAL(15,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL DEFAULT 'bags',
  category_id INT,
  category_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'Medium',
  estimated_price DECIMAL(15,2) DEFAULT 0,
  preferred_vendor_id INT,
  preferred_vendor_name VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  requested_by_user_id INT,
  requested_by_name VARCHAR(255),
  fulfilled_by_user_id INT,
  fulfilled_by_name VARCHAR(255),
  fulfilled_at DATETIME,
  viewed_by_owner INT DEFAULT 0,
  viewed_at DATETIME,
  viewed_by_staff INT DEFAULT 1,
  staff_viewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requirements_status (status),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (preferred_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  target_role VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  related_id INT,
  related_type VARCHAR(100),
  is_read INT DEFAULT 0,
  read_at DATETIME,
  created_by_user_id INT,
  created_by_name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_target (target_role, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(20) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  metadata TEXT,
  attempts INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otps_email_purpose (email, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_learned_vendor_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_id INT,
  sample_count INT DEFAULT 1,
  table_format TEXT,
  column_order_json TEXT,
  unit_vocabulary_json TEXT,
  few_shot_prompt_json TEXT,
  accuracy_score DECIMAL(5,2) DEFAULT 0.95,
  last_trained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ai_templates_vendor (vendor_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_training_samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT,
  vendor_id INT,
  vendor_name VARCHAR(255),
  document_type VARCHAR(50) DEFAULT 'pdf',
  ocr_text LONGTEXT,
  ai_prediction_json LONGTEXT,
  ground_truth_json LONGTEXT,
  user_corrections_json LONGTEXT,
  sample_quality_score DECIMAL(5,2) DEFAULT 1.0,
  is_validated INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_training_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_type VARCHAR(100) DEFAULT 'hybrid_document_ai',
  training_samples_count INT DEFAULT 0,
  accuracy_before DECIMAL(5,2) DEFAULT 0.0,
  accuracy_after DECIMAL(5,2) DEFAULT 0.0,
  learned_patterns_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  logs LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_extraction_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT,
  engine VARCHAR(100),
  raw_text LONGTEXT,
  ai_response LONGTEXT,
  warnings TEXT,
  latency_ms INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
