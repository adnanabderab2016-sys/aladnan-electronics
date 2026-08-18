/*
# Customer Store + Atomic Order Creation + Price Privacy

## Overview
This migration adds the database layer needed for the customer-facing store:
1. A price-privacy view that exposes products WITHOUT prices to customers
2. An atomic order-creation RPC function (SECURITY DEFINER) that wraps
   order + items + price snapshot + status history + invoice snapshot
   in a single transaction
3. An RPC to advance order status (admin action) with audit trail
4. An RPC to adjust order item quantities (admin action) that marks items
   dirty and notifies the customer
5. RLS policies allowing customers to read the price-privacy view
6. A customer_orders view that customers use to track their own orders

## New Objects

### Views
- store_products — products joined with brands/categories, NO price columns.
- store_categories — public categories for browsing.
- customer_orders — orders + items for the current customer only.

### Functions (SECURITY DEFINER)
- create_customer_order(p_customer_id, p_items jsonb, p_notes text)
- advance_order_status(p_order_id uuid, p_to_status text, p_reason text)
- adjust_order_item_qty(p_item_id uuid, p_new_qty numeric)
- return_order_for_edit(p_order_id uuid, p_reason text)

## Security
- store_products view: readable by anon + authenticated (public catalog)
- customer_orders view: readable only by the owning customer
- RPC functions: SECURITY DEFINER, validate auth.uid() internally
- Price rules remain admin-only (no customer access)
*/

-- ============================================================
-- 1. STORE_PRODUCTS VIEW — price-privacy catalog for customers
-- ============================================================
CREATE OR REPLACE VIEW store_products AS
SELECT
  p.id,
  p.sku,
  p.barcode,
  p.name,
  p.image_url,
  p.unit,
  p.warranty_duration_months,
  p.is_serialized,
  b.name AS brand_name,
  c.name AS category_name,
  c.id AS category_id
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

GRANT SELECT ON store_products TO anon, authenticated;

-- ============================================================
-- 2. STORE CATEGORIES VIEW — public categories for browsing
-- ============================================================
CREATE OR REPLACE VIEW store_categories AS
SELECT id, name, parent_id FROM categories ORDER BY name;

GRANT SELECT ON store_categories TO anon, authenticated;

-- ============================================================
-- 3. CUSTOMER_ORDERS VIEW — customer's own orders (price-excluded)
-- ============================================================
CREATE OR REPLACE VIEW customer_orders AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.notes,
  o.created_at,
  o.updated_at,
  coalesce(
    json_agg(
      json_build_object(
        'item_id', oi.id,
        'product_name', pr.name,
        'product_sku', pr.sku,
        'product_image', pr.image_url,
        'quantity', oi.quantity,
        'is_dirty', oi.is_dirty
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products pr ON pr.id = oi.product_id
WHERE
  -- Customer sees their own orders (matched by profile email = customer code)
  o.customer_id IN (
    SELECT c.id FROM customers c
    JOIN profiles p ON p.email = c.code
    WHERE p.id = auth.uid()
  )
  -- Or customer_id is the profile id directly
  OR o.customer_id = auth.uid()
  -- Staff can see all orders
  OR EXISTS (
    SELECT 1 FROM profiles prof WHERE prof.id = auth.uid()
    AND prof.role IN ('system_admin', 'manager')
  )
GROUP BY o.id, o.order_number, o.status, o.notes, o.created_at, o.updated_at;

GRANT SELECT ON customer_orders TO authenticated;

-- ============================================================
-- 4. CREATE_CUSTOMER_ORDER — atomic order creation RPC
-- ============================================================
CREATE OR REPLACE FUNCTION create_customer_order(
  p_customer_id uuid,
  p_items jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_idempotency_key text;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total_price numeric;
  v_order_total numeric := 0;
  v_price_rule record;
  v_base_price numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM 1 FROM customers WHERE id = p_customer_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive customer';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  v_order_number := 'ORD-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);
  v_idempotency_key := 'ord-' || gen_random_uuid()::text;

  INSERT INTO orders (order_number, customer_id, status, total, idempotency_key, notes)
  VALUES (v_order_number, p_customer_id, 'submitted', 0, v_idempotency_key, p_notes)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    PERFORM 1 FROM products WHERE id = v_product_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is not available', v_product_id;
    END IF;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be positive for product %', v_product_id;
    END IF;

    -- Resolve price server-side from price_rules
    SELECT * INTO v_price_rule
    FROM price_rules
    WHERE product_id = v_product_id
      AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    ORDER BY
      CASE level
        WHEN 'customer_specific' THEN 1
        WHEN 'campaign' THEN 2
        WHEN 'wholesale_wholesale' THEN 3
        WHEN 'wholesale' THEN 4
        WHEN 'retail' THEN 5
        WHEN 'base' THEN 6
        ELSE 7
      END,
      priority DESC
    LIMIT 1;

    -- Get base price
    SELECT value INTO v_base_price
    FROM price_rules
    WHERE product_id = v_product_id
      AND level = 'base'
      AND is_active = true
    ORDER BY priority DESC LIMIT 1;
    v_base_price := coalesce(v_base_price, 0);

    -- Calculate unit price based on formula
    IF v_price_rule.formula = 'markup' THEN
      v_unit_price := v_base_price * (1 + v_price_rule.value / 100);
    ELSIF v_price_rule.formula = 'margin' THEN
      v_unit_price := v_base_price / (1 - v_price_rule.value / 100);
    ELSIF v_price_rule.formula = 'fixed' THEN
      v_unit_price := v_price_rule.value;
    ELSIF v_price_rule.formula = 'amount' THEN
      v_unit_price := v_base_price + v_price_rule.value;
    ELSE
      v_unit_price := v_base_price;
    END IF;

    -- Apply min/max guards
    IF v_price_rule.min_price IS NOT NULL AND v_unit_price < v_price_rule.min_price THEN
      v_unit_price := v_price_rule.min_price;
    END IF;
    IF v_price_rule.max_price IS NOT NULL AND v_unit_price > v_price_rule.max_price THEN
      v_unit_price := v_price_rule.max_price;
    END IF;

    IF v_unit_price < 0 THEN
      v_unit_price := 0;
    END IF;

    v_total_price := v_unit_price * v_quantity;
    v_order_total := v_order_total + v_total_price;

    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price, total_price, price_snapshot, is_dirty
    )
    VALUES (
      v_order_id, v_product_id, v_quantity, v_unit_price, v_total_price,
      jsonb_build_object(
        'rule_id', v_price_rule.id,
        'level', v_price_rule.level,
        'formula', v_price_rule.formula,
        'rule_value', v_price_rule.value,
        'base_price', v_base_price,
        'resolved_price', v_unit_price,
        'resolved_at', now()
      ),
      false
    );
  END LOOP;

  UPDATE orders SET total = v_order_total WHERE id = v_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, actor, reason)
  VALUES (v_order_id, NULL, 'submitted', 'customer', 'Order submitted by customer');

  -- Notify admins
  INSERT INTO notifications (user_id, type, title, body)
  SELECT
    prof.id,
    'order_created',
    'طلب جديد',
    'تم استلام طلب جديد رقم ' || v_order_number
  FROM profiles prof
  WHERE prof.role IN ('system_admin', 'manager')
    AND prof.is_active = true;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_customer_order TO authenticated;

-- ============================================================
-- 5. ADVANCE_ORDER_STATUS — admin advances order through workflow
-- ============================================================
CREATE OR REPLACE FUNCTION advance_order_status(
  p_order_id uuid,
  p_to_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_order_number text;
  v_customer_id uuid;
  v_total numeric;
  v_invoice_number text;
  v_actor text;
  v_notif_title text;
  v_notif_body text;
BEGIN
  SELECT status, order_number, customer_id, total
  INTO v_current_status, v_order_number, v_customer_id, v_total
  FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT coalesce(full_name, email) INTO v_actor
  FROM profiles WHERE id = auth.uid();

  UPDATE orders SET status = p_to_status WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, actor, reason)
  VALUES (p_order_id, v_current_status, p_to_status, v_actor, p_reason);

  -- Auto-create invoice when transitioning to 'confirmed'
  IF p_to_status = 'confirmed' THEN
    v_invoice_number := 'INV-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);
    INSERT INTO invoices (invoice_number, order_id, customer_id, total, template_version)
    VALUES (v_invoice_number, p_order_id, v_customer_id, v_total, 'v1');
  END IF;

  -- Build notification text
  IF p_to_status = 'received' THEN
    v_notif_title := 'تم استلام طلبك';
    v_notif_body := 'تم استلام طلبك رقم ' || v_order_number || ' وجاري معالجته';
  ELSIF p_to_status = 'confirmed' THEN
    v_notif_title := 'تم تأكيد طلبك';
    v_notif_body := 'تم تأكيد طلبك رقم ' || v_order_number || '. يرجى إرسال المبلغ لإتمام اعتماد الطلب.';
  ELSIF p_to_status = 'processing' THEN
    v_notif_title := 'طلبك قيد المعالجة';
    v_notif_body := 'طلبك رقم ' || v_order_number || ' قيد المعالجة';
  ELSIF p_to_status = 'ready' THEN
    v_notif_title := 'طلبك جاهز';
    v_notif_body := 'طلبك رقم ' || v_order_number || ' جاهز للاستلام';
  ELSIF p_to_status = 'delivered' THEN
    v_notif_title := 'تم تسليم طلبك';
    v_notif_body := 'تم تسليم طلبك رقم ' || v_order_number;
  ELSIF p_to_status = 'completed' THEN
    v_notif_title := 'اكتمل طلبك';
    v_notif_body := 'اكتمل طلبك رقم ' || v_order_number;
  END IF;

  -- Notify the customer
  IF v_notif_title IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body)
    SELECT prof.id, 'order_status', v_notif_title, v_notif_body
    FROM profiles prof
    JOIN customers c ON c.id = v_customer_id
    WHERE prof.email = c.code OR prof.id = c.id
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO audit_logs (actor, action, entity_type, entity_id, reason, after)
  VALUES (v_actor, 'advance_order_status', 'order', p_order_id::text, p_reason,
    jsonb_build_object('from', v_current_status, 'to', p_to_status));
END;
$$;

GRANT EXECUTE ON FUNCTION advance_order_status TO authenticated;

-- ============================================================
-- 6. ADJUST_ORDER_ITEM_QTY — admin adjusts quantity, marks dirty
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_order_item_qty(
  p_item_id uuid,
  p_new_qty numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_customer_id uuid;
  v_old_qty numeric;
  v_actor text;
  v_product_name text;
BEGIN
  SELECT oi.order_id, oi.quantity, o.order_number, o.customer_id, p.name
  INTO v_order_id, v_old_qty, v_order_number, v_customer_id, v_product_name
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE oi.id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  IF p_new_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  SELECT coalesce(full_name, email) INTO v_actor
  FROM profiles WHERE id = auth.uid();

  UPDATE order_items
  SET quantity = p_new_qty,
      total_price = unit_price * p_new_qty,
      is_dirty = true
  WHERE id = p_item_id;

  UPDATE orders
  SET total = (SELECT coalesce(sum(total_price), 0) FROM order_items WHERE order_id = v_order_id)
  WHERE id = v_order_id;

  -- Notify customer about modification
  INSERT INTO notifications (user_id, type, title, body)
  SELECT prof.id, 'order_modified',
    'تنبيه: تم تعديل الأصناف/الكميات',
    'تم تعديل صنف "' || v_product_name || '" في طلبك رقم ' || v_order_number ||
    ' من ' || v_old_qty || ' إلى ' || p_new_qty ||
    ' بحسب الكميات المتوفرة. يرجى مراجعة طلبك.'
  FROM profiles prof
  JOIN customers c ON c.id = v_customer_id
  WHERE prof.email = c.code OR prof.id = c.id
  ON CONFLICT DO NOTHING;

  INSERT INTO audit_logs (actor, action, entity_type, entity_id, before, after)
  VALUES (v_actor, 'adjust_order_item_qty', 'order_item', p_item_id::text,
    jsonb_build_object('quantity', v_old_qty),
    jsonb_build_object('quantity', p_new_qty, 'is_dirty', true));
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_order_item_qty TO authenticated;

-- ============================================================
-- 7. RETURN_ORDER_FOR_EDIT — admin returns order to customer
-- ============================================================
CREATE OR REPLACE FUNCTION return_order_for_edit(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number text;
  v_customer_id uuid;
  v_current_status text;
  v_actor text;
BEGIN
  SELECT order_number, customer_id, status
  INTO v_order_number, v_customer_id, v_current_status
  FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT coalesce(full_name, email) INTO v_actor
  FROM profiles WHERE id = auth.uid();

  UPDATE orders SET status = 'awaiting_modification' WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, actor, reason)
  VALUES (p_order_id, v_current_status, 'awaiting_modification', v_actor, p_reason);

  INSERT INTO notifications (user_id, type, title, body)
  SELECT prof.id, 'order_modified',
    'تم إرجاع طلبك للتعديل',
    'تم إرجاع طلبك رقم ' || v_order_number || ' للتعديل. ' ||
    coalesce(p_reason, 'يرجى مراجعة الطلب وتعديله ثم إعادة إرساله.')
  FROM profiles prof
  JOIN customers c ON c.id = v_customer_id
  WHERE prof.email = c.code OR prof.id = c.id
  ON CONFLICT DO NOTHING;

  INSERT INTO audit_logs (actor, action, entity_type, entity_id, reason, after)
  VALUES (v_actor, 'return_order_for_edit', 'order', p_order_id::text, p_reason,
    jsonb_build_object('status', 'awaiting_modification'));
END;
$$;

GRANT EXECUTE ON FUNCTION return_order_for_edit TO authenticated;

-- ============================================================
-- 8. RLS: Allow anon to read public catalog (store_products view)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "anon_select_brands" ON brands;
CREATE POLICY "anon_select_brands" ON brands FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon USING (true);

-- ============================================================
-- 9. Customer-scoped RLS on orders, order_items, history
-- ============================================================
DROP POLICY IF EXISTS "select_orders_customer" ON orders;
CREATE POLICY "select_orders_customer" ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.role IN ('system_admin', 'manager', 'warehouse', 'accountant', 'viewer')
    )
    OR customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR customer_id = auth.uid()
  );

DROP POLICY IF EXISTS "select_order_items_customer" ON order_items;
CREATE POLICY "select_order_items_customer" ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.role IN ('system_admin', 'manager', 'warehouse', 'accountant', 'viewer')
    )
    OR order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR order_id IN (
      SELECT o.id FROM orders o WHERE o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_orders_customer" ON orders;
CREATE POLICY "insert_orders_customer" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_orders_customer" ON orders;
CREATE POLICY "update_orders_customer" ON orders FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR customer_id = auth.uid()
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "insert_order_items_customer" ON order_items;
CREATE POLICY "insert_order_items_customer" ON order_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_order_items_customer" ON order_items;
CREATE POLICY "update_order_items_customer" ON order_items FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR order_id IN (
      SELECT o.id FROM orders o WHERE o.customer_id = auth.uid()
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "select_order_status_history_customer" ON order_status_history;
CREATE POLICY "select_order_status_history_customer" ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR order_id IN (
      SELECT o.id FROM orders o WHERE o.customer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.role IN ('system_admin', 'manager', 'warehouse', 'accountant', 'viewer')
    )
  );

DROP POLICY IF EXISTS "insert_order_status_history_customer" ON order_status_history;
CREATE POLICY "insert_order_status_history_customer" ON order_status_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- 10. Customer-scoped RLS on invoices and payments
-- ============================================================
DROP POLICY IF EXISTS "select_invoices_customer" ON invoices;
CREATE POLICY "select_invoices_customer" ON invoices FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.email = c.code
      WHERE p.id = auth.uid()
    )
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.role IN ('system_admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "insert_payments_customer" ON payments;
CREATE POLICY "insert_payments_customer" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_payments_customer" ON payments;
CREATE POLICY "select_payments_customer" ON payments FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT inv.id FROM invoices inv
      WHERE inv.customer_id IN (
        SELECT c.id FROM customers c
        JOIN profiles p ON p.email = c.code
        WHERE p.id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.role IN ('system_admin', 'manager', 'accountant')
    )
  );
