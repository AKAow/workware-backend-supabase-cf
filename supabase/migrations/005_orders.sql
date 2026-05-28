CREATE TYPE order_status AS ENUM ('pending', 'dept_approved', 'admin_approved', 'completed', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status order_status NOT NULL DEFAULT 'pending',
  total_points INTEGER NOT NULL CHECK (total_points >= 0),
  dept_approved_by UUID REFERENCES profiles(id),
  dept_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  point_price INTEGER NOT NULL CHECK (point_price > 0)
);

ALTER TABLE point_transactions
  ADD CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON orders(user_id, created_at DESC);
