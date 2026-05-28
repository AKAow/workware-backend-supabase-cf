ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_department()
RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY profiles_select ON profiles FOR SELECT
USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY profiles_update ON profiles FOR UPDATE
USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY departments_select ON departments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY departments_admin_all ON departments FOR ALL
USING (get_my_role() = 'admin');

CREATE POLICY products_select ON products FOR SELECT
USING ((auth.role() = 'authenticated' AND is_active = true) OR get_my_role() = 'admin');

CREATE POLICY products_admin_all ON products FOR ALL
USING (get_my_role() = 'admin');

CREATE POLICY product_variants_select ON product_variants FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY product_variants_admin_all ON product_variants FOR ALL
USING (get_my_role() = 'admin');

CREATE POLICY orders_select ON orders FOR SELECT
USING (
  user_id = auth.uid()
  OR get_my_role() = 'admin'
  OR (
    get_my_role() = 'department_head'
    AND user_id IN (SELECT id FROM profiles WHERE department_id = get_my_department())
  )
);

CREATE POLICY orders_insert_own ON orders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_update_admin_dept_head ON orders FOR UPDATE
USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() = 'department_head'
    AND user_id IN (SELECT id FROM profiles WHERE department_id = get_my_department())
  )
);

CREATE POLICY order_items_select ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders WHERE
      user_id = auth.uid()
      OR get_my_role() = 'admin'
      OR (
        get_my_role() = 'department_head'
        AND user_id IN (SELECT id FROM profiles WHERE department_id = get_my_department())
      )
  )
);

CREATE POLICY order_items_insert_own ON order_items FOR INSERT
WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

CREATE POLICY points_select ON point_transactions FOR SELECT
USING (user_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY points_admin_all ON point_transactions FOR ALL
USING (get_my_role() = 'admin');
