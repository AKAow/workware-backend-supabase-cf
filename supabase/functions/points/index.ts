import { adminClient, getProfile, requireUser } from '../_shared/supabase.ts';
import { error, json } from '../_shared/http.ts';

type Ctx = { req: Request; supabase: ReturnType<typeof adminClient>; userId: string };

const parsePath = (req: Request) => new URL(req.url).pathname.replace(/\/functions\/v1|\/points/g, '');

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  const path = parsePath(req);
  const ctx: Ctx = { req, supabase: auth.supabase, userId: auth.user!.id };

  if (req.method === 'POST' && path === '/grant') return grant(ctx);
  if (req.method === 'POST' && path === '/deduct') return deduct(ctx);
  if (req.method === 'GET' && path === '/my') return myPoints(ctx);
  if (req.method === 'GET' && path.startsWith('/user/')) return userPoints(ctx, path.split('/').pop()!);
  if (req.method === 'POST' && path === '/dept-allocate') return deptAllocate(ctx);

  return error(404, 'NOT_FOUND', '지원하지 않는 엔드포인트입니다.');
});

async function grant({ req, supabase, userId }: Ctx) {
  const me = await getProfile(supabase, userId);
  if (!me || !['admin', 'department_head'].includes(me.role)) return error(403, 'FORBIDDEN', '권한이 없습니다.');

  const body = await req.json().catch(() => null);
  const targetUserId = body?.user_id as string | undefined;
  const amount = Number(body?.amount);
  const note = body?.note ?? null;
  if (!targetUserId || !Number.isFinite(amount) || amount <= 0) return error(400, 'VALIDATION_ERROR', 'user_id, amount를 확인하세요.');

  const { data, error: rpcError } = await supabase.rpc('grant_points', {
    p_actor: userId,
    p_target: targetUserId,
    p_amount: amount,
    p_note: note,
  });

  if (rpcError) return error(422, 'VALIDATION_ERROR', rpcError.message);
  return json(data);
}

async function deduct({ req, supabase, userId }: Ctx) {
  const me = await getProfile(supabase, userId);
  if (!me || !['admin', 'department_head'].includes(me.role)) return error(403, 'FORBIDDEN', '권한이 없습니다.');

  const body = await req.json().catch(() => null);
  const targetUserId = body?.user_id as string | undefined;
  const amount = Number(body?.amount);
  const note = body?.note ?? null;
  if (!targetUserId || !Number.isFinite(amount) || amount <= 0) return error(400, 'VALIDATION_ERROR', 'user_id, amount를 확인하세요.');

  const { data, error: rpcError } = await supabase.rpc('deduct_points', {
    p_actor: userId,
    p_target: targetUserId,
    p_amount: amount,
    p_note: note,
  });

  if (rpcError) {
    const code = rpcError.message.includes('insufficient points') ? 'INSUFFICIENT_POINTS' : 'VALIDATION_ERROR';
    return error(422, code, rpcError.message);
  }
  return json(data);
}

async function myPoints({ supabase, userId }: Ctx) {
  const profile = await getProfile(supabase, userId);
  if (!profile) return error(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');

  const { data: txs, error: txErr } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (txErr) return error(500, 'INTERNAL_ERROR', txErr.message);
  return json({ balance: profile.point_balance, transactions: txs ?? [] });
}

async function userPoints({ supabase, userId }: Ctx, targetId: string) {
  const me = await getProfile(supabase, userId);
  if (!me || me.role !== 'admin') return error(403, 'FORBIDDEN', '관리자만 조회할 수 있습니다.');

  const profile = await getProfile(supabase, targetId);
  if (!profile) return error(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');

  const { data: txs, error: txErr } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (txErr) return error(500, 'INTERNAL_ERROR', txErr.message);
  return json({ profile, transactions: txs ?? [] });
}

async function deptAllocate({ req, supabase, userId }: Ctx) {
  const me = await getProfile(supabase, userId);
  if (!me || me.role !== 'admin') return error(403, 'FORBIDDEN', '관리자만 수행할 수 있습니다.');

  const body = await req.json().catch(() => null);
  const departmentId = body?.department_id as string | undefined;
  const amount = Number(body?.amount);
  const note = body?.note ?? null;
  if (!departmentId || !Number.isFinite(amount) || amount <= 0) return error(400, 'VALIDATION_ERROR', 'department_id, amount를 확인하세요.');

  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .update({ point_budget: amount })
    .eq('id', departmentId)
    .select('*')
    .single();

  if (deptErr || !dept) return error(404, 'NOT_FOUND', '부서를 찾을 수 없습니다.');

  const { error: txErr } = await supabase.from('point_transactions').insert({
    user_id: userId,
    type: 'dept_allocate',
    amount,
    balance_after: 0,
    note: note ?? `department ${departmentId} budget set`,
    created_by: userId,
  });
  if (txErr) return error(500, 'INTERNAL_ERROR', txErr.message);

  return json(dept);
}
