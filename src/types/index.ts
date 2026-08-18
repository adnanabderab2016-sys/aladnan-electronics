export type UserRole = 'system_admin' | 'manager' | 'warehouse' | 'accountant' | 'viewer' | 'customer';

export type CustomerTier = 'wholesale_wholesale' | 'wholesale' | 'retail';

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'received'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'returned'
  | 'cancelled'
  | 'rejected'
  | 'payment_pending'
  | 'awaiting_modification'
  | 'partially_fulfilled';

export type ReservationStatus =
  | 'available'
  | 'reserved'
  | 'confirmed'
  | 'picked'
  | 'delivered'
  | 'cancelled'
  | 'partially_fulfilled'
  | 'returned'
  | 'reservation_expired'
  | 'payment_failed';

export type RmaStatus =
  | 'requested'
  | 'approved'
  | 'received'
  | 'diagnosed'
  | 'repair'
  | 'replace'
  | 'refund'
  | 'completed'
  | 'rejected';

export type RepairStatus =
  | 'open'
  | 'diagnosed'
  | 'in_progress'
  | 'parts_ordered'
  | 'repaired'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type WarrantyStatus = 'active' | 'expired' | 'void' | 'claimed';

export type PaymentStatus =
  | 'pending'
  | 'requested'
  | 'evidence_uploaded'
  | 'verified'
  | 'allocated'
  | 'rejected'
  | 'refunded';

export type ImportJobStatus =
  | 'uploaded'
  | 'detecting'
  | 'mapping'
  | 'validating'
  | 'previewing'
  | 'committing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DataFreshness = 'fresh' | 'warning' | 'stale' | 'critical' | 'unknown';

export type PricingFormula = 'markup' | 'margin' | 'fixed' | 'amount';

export type PriceLevel = 'base' | 'wholesale_wholesale' | 'wholesale' | 'retail' | 'customer_specific' | 'campaign' | 'quantity_tier' | 'branch' | 'variant' | 'bundle';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  country_of_origin: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  unit: string;
  warranty_duration_months: number;
  warranty_type: string | null;
  is_serialized: boolean;
  is_imei: boolean;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color: string | null;
  storage: string | null;
  ram: string | null;
  network: string | null;
  sku: string;
  barcode: string | null;
  created_at: string;
}

export interface PriceRule {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  level: PriceLevel;
  formula: PricingFormula;
  value: number;
  min_price: number | null;
  max_price: number | null;
  customer_id: string | null;
  campaign_id: string | null;
  min_qty: number | null;
  branch_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  tier: CustomerTier;
  credit_limit: number;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
  row_version: number;
  updated_at: string;
}

export interface SerialDevice {
  id: string;
  product_id: string;
  variant_id: string | null;
  serial_number: string;
  imei_1: string | null;
  imei_2: string | null;
  status: string;
  warehouse_id: string | null;
  customer_id: string | null;
  purchase_ref: string | null;
  sale_ref: string | null;
  warranty_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  idempotency_key: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  price_snapshot: Record<string, unknown>;
  is_dirty: boolean;
  created_at: string;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor: string;
  reason: string | null;
  correlation_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string;
  total: number;
  template_version: string;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  status: PaymentStatus;
  evidence_url: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface Warranty {
  id: string;
  serial_id: string;
  customer_id: string;
  product_id: string;
  start_date: string;
  end_date: string;
  status: WarrantyStatus;
  claim_count: number;
  created_at: string;
}

export interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  serial_id: string | null;
  product_id: string;
  symptoms: string | null;
  diagnosis: string | null;
  technician: string | null;
  status: RepairStatus;
  labor_cost: number;
  parts_cost: number;
  sla_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rma {
  id: string;
  rma_number: string;
  order_id: string | null;
  customer_id: string;
  product_id: string;
  serial_id: string | null;
  status: RmaStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJob {
  id: string;
  profile: string;
  file_name: string;
  file_hash: string;
  status: ImportJobStatus;
  total_rows: number;
  processed_rows: number;
  new_rows: number;
  updated_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  correlation_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
