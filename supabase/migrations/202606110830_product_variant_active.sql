ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_product_variants_active
  ON product_variants(product_id, is_active);
