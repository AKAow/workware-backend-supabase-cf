import { adminClient, getProfile, requireUser } from '../_shared/supabase.ts';
import { error, json } from '../_shared/http.ts';

type Ctx = { req: Request; supabase: ReturnType<typeof adminClient>; userId: string };
const parsePath = (req: Request) => new URL(req.url).pathname.replace(/\/functions\/v1|\/admin/g, '');

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth.response) return auth.response;
  const ctx: Ctx = { req, supabase: auth.supabase, userId: auth.user!.id };

  const me = await getProfile(ctx.supabase, ctx.userId);
  if (!me || me.role !== 'admin') return error(403, 'FORBIDDEN', '관리자만 접근할 수 있습니다.');

  const path = parsePath(req);
  if (req.method === 'GET' && path === '/stats') return stats(ctx);
  if (req.method === 'GET' && path === '/users') return users(ctx);
  if (req.method === 'PUT' && /^\/users\/[0-9a-fA-F-]{36}\/role$/.test(path)) return updateUserRole(ctx, path.split('/')[2]);
  if (req.method === 'GET' && path === '/departments') return departments(ctx);
  if (req.method === 'POST' && path === '/departments') return createDepartment(ctx);
  if (req.method === 'PUT' && /^\/departments\/[0-9a-fA-F-]{36}$/.test(path)) return updateDepartment(ctx, path.split('/')[2]);
  if (req.method === 'GET' && path === '/orders') return orders(ctx);
  if (req.method === 'GET' && path === '/points/report') return pointsReport(ctx);

  return error(404, 'NOT_FOUND', '지원하지 않는 엔드포인트입니다.');
});

async function stats({ supabase }: Ctx) {
  const [{ count: userCount }, { count: orderCount }, { data: txs }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('point_transactions').select('amount'),
  ]);
  const totalPointDelta = (txs ?? []).reduce((acc: number, row: any) => acc + Number(row.amount ?? 0), 0);
  return json({ users: userCount ?? 0, orders: orderCount ?? 0, point_delta: totalPointDelta });
}

async function users({ supabase }: Ctx) {
  const { data, error: e } = await supabase.from('profiles').select('id,email,full_name,role,department_id,point_balance').order('created_at', { ascending: false });
  if (e) return error(500, 'INTERNAL_ERROR', e.message);
  return json(data ?? []);
}

async function updateUserRole({ req, supabase }: Ctx, userId: string) {
  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (!['employee', 'department_head', 'admin'].includes(role)) return error(400, 'VALIDATION_ERROR', 'role 값이 올바르지 않습니다.');

  const { data, error: e } = await supabase.from('profiles').update({ role }).eq('id', userId).select('*').single();
  if (e) return error(400, 'VALIDATION_ERROR', e.message);
  return json(data);
}

async function departments({ supabase }: Ctx) {
  const { data, error: e } = await supabase.from('departments').select('*').order('created_at', { ascending: false });
  if (e) return error(500, 'INTERNAL_ERROR', e.message);
  return json(data ?? []);
}

async function createDepartment({ req, supabase }: Ctx) {
  const body = await req.json().catch(() => null);
  if (!body?.name) return error(400, 'VALIDATION_ERROR', 'name은 필수입니다.');
  const payload = { name: body.name, point_budget: Number(body.point_budget ?? 0), head_user_id: body.head_user_id ?? null };

  const { data, error: e } = await supabase.from('departments').insert(payload).select('*').single();
  if (e) return error(400, 'VALIDATION_ERROR', e.message);
  return json(data, 201);
}

async function updateDepartment({ req, supabase }: Ctx, departmentId: string) {
  const body = await req.json().catch(() => null);
  const patch = {
    name: body?.name,
    point_budget: body?.point_budget,
    head_user_id: body?.head_user_id,
  };
  const { data, error: e } = await supabase.from('departments').update(patch).eq('id', departmentId).select('*').single();
  if (e) return error(400, 'VALIDATION_ERROR', e.message);
  return json(data);
}

async function orders({ req, supabase }: Ctx) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  let q = supabase
    .from('orders')
    .select('*, profiles!orders_user_id_fkey(id,email,full_name,department_id)')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error: e } = await q;
  if (e) return error(500, 'INTERNAL_ERROR', e.message);
  return json(data ?? []);
}

async function pointsReport({ req, supabase }: Ctx) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let q = supabase.from('point_transactions').select('type,amount,created_at');
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error: e } = await q;
  if (e) return error(500, 'INTERNAL_ERROR', e.message);

  const grouped = (data ?? []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.type] = (acc[row.type] ?? 0) + Number(row.amount ?? 0);
    return acc;
  }, {});

  return json({ totals_by_type: grouped, rows: data ?? [] });
}
