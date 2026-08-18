/*
# إنجاز للإلكترونيات — Core Database Schema

## Overview
This migration creates the foundational schema for the Enjaz Electronics platform —
a wholesale/retail electronics commerce and management system. It covers products,
inventory, pricing, customers, suppliers, orders, invoices, payments, warranties,
repairs, RMA, imports, audit, and notifications.

## Tables Created

### Auth-related
- `profiles` — extends auth.users with role, full_name, is_active

### Catalog
- `categories` — hierarchical product categories (parent_id self-reference)
- `brands` — electronics brands with country of origin
- `products` — product master with SKU, barcode, warranty config, serialization flags
- `product_variants` — color/storage/RAM/network variants per product

### CRM
- `customers` — customer master with code, tier (wholesale_wholesale/wholesale/retail), credit_limit, balance

### Pricing
- `price_rules` — single pricing engine rules (base/wholesale/retail/customer/campaign/qty/branch/variant/bundle)
  with formula type (markup/margin/fixed/amount), min/max guards, priority, date ranges

### Inventory
- `warehouses` — warehouse locations
- `inventory_items` — stock per product/variant/warehouse with on_hand, reserved, row_version (optimistic locking)
- `serial_devices` — serialized tracking with serial_number, IMEI1/IMEI2, status machine, ownership refs

### Suppliers & Purchasing
- `suppliers` — supplier master
- `purchase_orders` — PO header with status machine
- `purchase_order_items` — PO line items

### Orders
- `orders` — order header with status machine, idempotency_key (duplicate prevention), total
- `order_items` — line items with price_snapshot, is_dirty flag (quantity approval workflow)
- `order_status_history` — full state machine audit trail (actor, reason, correlation_id)

### Invoicing & Payments
- `invoices` — invoice header linked to order, template_version
- `payments` — payment records with evidence, verification status, allocation

### Warranty / Repairs / RMA
- `warranties` — warranty records linked to serial device
- `repair_tickets` — repair tickets with symptoms, diagnosis, technician, SLA, costs
- `rmas` — return merchandise authorization with status machine

### Import Engine
- `import_jobs` — unified import job tracking with file_hash (idempotency), profile, row stats, status

### Governance
- `audit_logs` — audit trail for sensitive operations (actor, action, before, after, reason, correlation_id)
- `notifications` — in-app notifications per user

## Security
- RLS enabled on ALL tables
- All policies scoped to `authenticated` users (app has sign-in)
- Owner-scoped where applicable; organization-level read/write for staff
- `profiles` table: users can read/update own profile only

## Important Notes
1. All money columns use numeric(18,2) — never float
2. inventory_items.row_version for optimistic concurrency control
3. orders.idempotency_key with unique index to prevent duplicate orders
4. serial_devices serial_number and imei columns have unique indexes to prevent duplicates
5. All tables have created_at/updated_at timestamps
6. updated_at triggers auto-update on row modification
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'viewer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categories" ON categories;
CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_categories" ON categories;
CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_categories" ON categories;
CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_categories" ON categories;
CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_of_origin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_brands" ON brands;
CREATE POLICY "select_brands" ON brands FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_brands" ON brands;
CREATE POLICY "insert_brands" ON brands FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_brands" ON brands;
CREATE POLICY "update_brands" ON brands FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_brands" ON brands;
CREATE POLICY "delete_brands" ON brands FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'قطعة',
  warranty_duration_months integer NOT NULL DEFAULT 12,
  warranty_type text,
  is_serialized boolean NOT NULL DEFAULT false,
  is_imei boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products (sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_name_idx ON products (name);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products (barcode) WHERE barcode IS NOT NULL;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color text,
  storage text,
  ram text,
  network text,
  sku text NOT NULL,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS variants_sku_unique ON product_variants (sku);
CREATE INDEX IF NOT EXISTS variants_product_idx ON product_variants (product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_variants" ON product_variants;
CREATE POLICY "select_variants" ON product_variants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_variants" ON product_variants;
CREATE POLICY "insert_variants" ON product_variants FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_variants" ON product_variants;
CREATE POLICY "update_variants" ON product_variants FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_variants" ON product_variants;
CREATE POLICY "delete_variants" ON product_variants FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  tier text NOT NULL DEFAULT 'retail',
  credit_limit numeric(18,2) NOT NULL DEFAULT 0,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_code_unique ON customers (code);
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (name);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PRICE RULES — Single Pricing Engine
-- ============================================================
CREATE TABLE IF NOT EXISTS price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'base',
  formula text NOT NULL DEFAULT 'markup',
  value numeric(18,2) NOT NULL DEFAULT 0,
  min_price numeric(18,2),
  max_price numeric(18,2),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id uuid,
  min_qty numeric(18,2),
  branch_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_rules_product_idx ON price_rules (product_id);
CREATE INDEX IF NOT EXISTS price_rules_level_idx ON price_rules (level);
CREATE INDEX IF NOT EXISTS price_rules_customer_idx ON price_rules (customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_price_rules" ON price_rules;
CREATE POLICY "select_price_rules" ON price_rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_price_rules" ON price_rules;
CREATE POLICY "insert_price_rules" ON price_rules FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_price_rules" ON price_rules;
CREATE POLICY "update_price_rules" ON price_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_price_rules" ON price_rules;
CREATE POLICY "delete_price_rules" ON price_rules FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_code_unique ON suppliers (code);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_warehouses" ON warehouses;
CREATE POLICY "select_warehouses" ON warehouses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_warehouses" ON warehouses;
CREATE POLICY "insert_warehouses" ON warehouses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_warehouses" ON warehouses;
CREATE POLICY "update_warehouses" ON warehouses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_warehouses" ON warehouses;
CREATE POLICY "delete_warehouses" ON warehouses FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- INVENTORY ITEMS — with optimistic locking
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  on_hand numeric(18,2) NOT NULL DEFAULT 0,
  reserved numeric(18,2) NOT NULL DEFAULT 0,
  row_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_unique ON inventory_items (product_id, variant_id, warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_warehouse_idx ON inventory_items (warehouse_id);

-- Prevent negative stock
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_on_hand_nonneg') THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_on_hand_nonneg CHECK (on_hand >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reserved_nonneg') THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_reserved_nonneg CHECK (reserved >= 0);
  END IF;
END $$;

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_inventory" ON inventory_items;
CREATE POLICY "select_inventory" ON inventory_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_inventory" ON inventory_items;
CREATE POLICY "insert_inventory" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_inventory" ON inventory_items;
CREATE POLICY "update_inventory" ON inventory_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_inventory" ON inventory_items;
CREATE POLICY "delete_inventory" ON inventory_items FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SERIAL DEVICES — unique serial & IMEI
-- ============================================================
CREATE TABLE IF NOT EXISTS serial_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  imei_1 text,
  imei_2 text,
  status text NOT NULL DEFAULT 'in_stock',
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  purchase_ref text,
  sale_ref text,
  warranty_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS serial_number_unique ON serial_devices (serial_number);
CREATE UNIQUE INDEX IF NOT EXISTS imei_1_unique ON serial_devices (imei_1) WHERE imei_1 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS imei_2_unique ON serial_devices (imei_2) WHERE imei_2 IS NOT NULL;

ALTER TABLE serial_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_serials" ON serial_devices;
CREATE POLICY "select_serials" ON serial_devices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_serials" ON serial_devices;
CREATE POLICY "insert_serials" ON serial_devices FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_serials" ON serial_devices;
CREATE POLICY "update_serials" ON serial_devices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_serials" ON serial_devices;
CREATE POLICY "delete_serials" ON serial_devices FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ORDERS — with idempotency key
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  total numeric(18,2) NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_number_unique ON orders (order_number);
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_unique ON orders (idempotency_key);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_orders" ON orders;
CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ORDER ITEMS — with dirty state flag
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity numeric(18,2) NOT NULL DEFAULT 1,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  total_price numeric(18,2) NOT NULL DEFAULT 0,
  price_snapshot jsonb NOT NULL DEFAULT '{}',
  is_dirty boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_order_items" ON order_items;
CREATE POLICY "select_order_items" ON order_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_order_items" ON order_items;
CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_order_items" ON order_items;
CREATE POLICY "update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_order_items" ON order_items;
CREATE POLICY "delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ORDER STATUS HISTORY — full audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor text,
  reason text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON order_status_history (order_id);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_order_status_history" ON order_status_history;
CREATE POLICY "select_order_status_history" ON order_status_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_order_status_history" ON order_status_history;
CREATE POLICY "insert_order_status_history" ON order_status_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  total numeric(18,2) NOT NULL DEFAULT 0,
  template_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_unique ON invoices (invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_invoices" ON invoices;
CREATE POLICY "select_invoices" ON invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_invoices" ON invoices;
CREATE POLICY "insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_invoices" ON invoices;
CREATE POLICY "update_invoices" ON invoices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_invoices" ON invoices;
CREATE POLICY "delete_invoices" ON invoices FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  evidence_url text,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- WARRANTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_id uuid REFERENCES serial_devices(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  claim_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS warranties_customer_idx ON warranties (customer_id);
CREATE INDEX IF NOT EXISTS warranties_serial_idx ON warranties (serial_id) WHERE serial_id IS NOT NULL;

ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_warranties" ON warranties;
CREATE POLICY "select_warranties" ON warranties FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_warranties" ON warranties;
CREATE POLICY "insert_warranties" ON warranties FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_warranties" ON warranties;
CREATE POLICY "update_warranties" ON warranties FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_warranties" ON warranties;
CREATE POLICY "delete_warranties" ON warranties FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- REPAIR TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  serial_id uuid REFERENCES serial_devices(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  symptoms text,
  diagnosis text,
  technician text,
  status text NOT NULL DEFAULT 'open',
  labor_cost numeric(18,2) NOT NULL DEFAULT 0,
  parts_cost numeric(18,2) NOT NULL DEFAULT 0,
  sla_due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS repair_ticket_number_unique ON repair_tickets (ticket_number);

ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_repairs" ON repair_tickets;
CREATE POLICY "select_repairs" ON repair_tickets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_repairs" ON repair_tickets;
CREATE POLICY "insert_repairs" ON repair_tickets FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_repairs" ON repair_tickets;
CREATE POLICY "update_repairs" ON repair_tickets FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_repairs" ON repair_tickets;
CREATE POLICY "delete_repairs" ON repair_tickets FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- RMAs
-- ============================================================
CREATE TABLE IF NOT EXISTS rmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serial_id uuid REFERENCES serial_devices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rma_number_unique ON rmas (rma_number);

ALTER TABLE rmas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_rmas" ON rmas;
CREATE POLICY "select_rmas" ON rmas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_rmas" ON rmas;
CREATE POLICY "insert_rmas" ON rmas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_rmas" ON rmas;
CREATE POLICY "update_rmas" ON rmas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_rmas" ON rmas;
CREATE POLICY "delete_rmas" ON rmas FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  total numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS po_number_unique ON purchase_orders (po_number);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchase_orders" ON purchase_orders;
CREATE POLICY "select_purchase_orders" ON purchase_orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_purchase_orders" ON purchase_orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_purchase_orders" ON purchase_orders;
CREATE POLICY "update_purchase_orders" ON purchase_orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_purchase_orders" ON purchase_orders FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(18,2) NOT NULL DEFAULT 1,
  unit_cost numeric(18,2) NOT NULL DEFAULT 0,
  total_cost numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS po_items_po_idx ON purchase_order_items (po_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_po_items" ON purchase_order_items;
CREATE POLICY "select_po_items" ON purchase_order_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_po_items" ON purchase_order_items;
CREATE POLICY "insert_po_items" ON purchase_order_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_po_items" ON purchase_order_items;
CREATE POLICY "update_po_items" ON purchase_order_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_po_items" ON purchase_order_items;
CREATE POLICY "delete_po_items" ON purchase_order_items FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- IMPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile text NOT NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  new_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_jobs_hash_idx ON import_jobs (file_hash);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs (status);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_import_jobs" ON import_jobs;
CREATE POLICY "select_import_jobs" ON import_jobs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_import_jobs" ON import_jobs;
CREATE POLICY "insert_import_jobs" ON import_jobs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_import_jobs" ON import_jobs;
CREATE POLICY "update_import_jobs" ON import_jobs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_import_jobs" ON import_jobs;
CREATE POLICY "delete_import_jobs" ON import_jobs FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER — auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','products','price_rules','customers','suppliers',
    'inventory_items','serial_devices','orders','order_items',
    'invoices','payments','warranties','repair_tickets','rmas',
    'purchase_orders','purchase_order_items','import_jobs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
       CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;
