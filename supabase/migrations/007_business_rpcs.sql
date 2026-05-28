CREATE OR REPLACE FUNCTION grant_points(
  p_actor UUID,
  p_target UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(tx_id UUID, balance_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_role user_role;
  v_actor_dept UUID;
  v_target_dept UUID;
  v_dept departments%ROWTYPE;
  v_balance INTEGER;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT role, department_id INTO v_actor_role, v_actor_dept FROM profiles WHERE id = p_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'department_head') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT department_id INTO v_target_dept FROM profiles WHERE id = p_target;
  IF v_target_dept IS NULL THEN
    RAISE EXCEPTION 'target not found';
  END IF;

  IF v_actor_role = 'department_head' AND v_actor_dept IS DISTINCT FROM v_target_dept THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dept FROM departments WHERE id = v_target_dept FOR UPDATE;
  IF v_dept.id IS NULL THEN
    RAISE EXCEPTION 'department not found';
  END IF;

  IF (v_dept.point_budget - v_dept.point_used) < p_amount THEN
    RAISE EXCEPTION 'insufficient department budget';
  END IF;

  UPDATE profiles
  SET point_balance = point_balance + p_amount
  WHERE id = p_target
  RETURNING point_balance INTO v_balance;

  UPDATE departments
  SET point_used = point_used + p_amount
  WHERE id = v_dept.id;

  INSERT INTO point_transactions (user_id, type, amount, balance_after, note, created_by)
  VALUES (p_target, 'grant', p_amount, v_balance, p_note, p_actor)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_tx_id, v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_points(
  p_actor UUID,
  p_target UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(tx_id UUID, balance_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_role user_role;
  v_actor_dept UUID;
  v_target_dept UUID;
  v_balance INTEGER;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT role, department_id INTO v_actor_role, v_actor_dept FROM profiles WHERE id = p_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'department_head') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT department_id INTO v_target_dept FROM profiles WHERE id = p_target;
  IF v_target_dept IS NULL THEN
    RAISE EXCEPTION 'target not found';
  END IF;

  IF v_actor_role = 'department_head' AND v_actor_dept IS DISTINCT FROM v_target_dept THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE profiles
  SET point_balance = point_balance - p_amount
  WHERE id = p_target AND point_balance >= p_amount
  RETURNING point_balance INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  INSERT INTO point_transactions (user_id, type, amount, balance_after, note, created_by)
  VALUES (p_target, 'deduct', -p_amount, v_balance, p_note, p_actor)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_tx_id, v_balance;
END;
$$;
