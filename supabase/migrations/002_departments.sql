CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  head_user_id UUID REFERENCES profiles(id),
  point_budget INTEGER NOT NULL DEFAULT 0 CHECK (point_budget >= 0),
  point_used INTEGER NOT NULL DEFAULT 0 CHECK (point_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_budget_used CHECK (point_used <= point_budget)
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_department
  FOREIGN KEY (department_id) REFERENCES departments(id);
