-- Development seed data
INSERT INTO departments (id, name, point_budget, point_used)
VALUES
  ('11111111-1111-1111-1111-111111111111', '생산팀', 500000, 0),
  ('22222222-2222-2222-2222-222222222222', '정비팀', 350000, 0),
  ('33333333-3333-3333-3333-333333333333', '안전팀', 300000, 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (id, name, description, point_price, category, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '방염 작업복 상의', '난연 소재 상의', 8000, '상의', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '방염 작업복 하의', '난연 소재 하의', 9000, '하의', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '안전화 PRO', '미끄럼 방지 안전화', 15000, '신발', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '안전 헬멧', '충격 완화 헬멧', 6000, '안전장비', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '절연 장갑', '전기 작업용 장갑', 4000, '안전장비', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (product_id, size, color, stock_qty)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'M', 'navy', 50),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'L', 'navy', 50),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'M', 'navy', 50),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'L', 'navy', 50),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '260', 'black', 20),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '270', 'black', 20),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'FREE', 'white', 30),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'L', 'gray', 40)
ON CONFLICT (product_id, size, color) DO NOTHING;
