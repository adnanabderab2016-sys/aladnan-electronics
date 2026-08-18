export interface StoreProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  image_url: string | null;
  unit: string;
  warranty_duration_months: number;
  is_serialized: boolean;
  brand_name: string | null;
  category_name: string | null;
  category_id: string | null;
}

export interface StoreCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface CustomerOrderView {
  id: string;
  order_number: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: {
    item_id: string;
    product_name: string;
    product_sku: string;
    product_image: string | null;
    quantity: number;
    is_dirty: boolean;
  }[];
}
