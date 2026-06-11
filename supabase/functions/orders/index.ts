import { adminClient, getProfile, requireUser } from '../_shared/supabase.ts';
import { error, json } from '../_shared/http.ts';

type Ctx = { req: Request; supabase: ReturnType<typeof adminClient>; userId: string };
const parsePath = (req: Request) => new URL(req.url).pathname.replace(/\/functions\/v1|\/orders/g, '');

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth.response) return auth.response;
  const path = parsePath(req);
  const ctx: Ctx = { req, supabase: auth.supabase, userId: auth.user!.id };

  if (req.method === 'POST' && (path === '' || path === '/')) return createOrder(ctx);
  if (req.method === 'GET' && (path === '' || path === '/')) return listMyOrders(ctx);
  if (req.method === 'GET' && /^\/[0-9a-fA-F-]{36}$/.test(path)) return orderDetail(ctx, path.slice(1));
  if (req.method === 'POST' && /^\/[0-9a-fA-F-]{36}\/approve$/.test(path)) return approveOrder(ctx, path.split('/')[1]);
  if (req.method === 'POST' && /^\/[0-9a-fA-F-]{36}\/reject$/.test(path)) return rejectOrder(ctx, path.split('/')[1]);
  if (req.method === 'POST' && /^\/[0-9a-fA-F-]{36}\/cancel$/.test(path)) return cancelOrder(ctx, path.split('/')[1]);
  if (req.method === 'GET' && path === '/admin/all') return listAllOrders(ctx);

  return error(404, 'NOT_FOUND', '지원하지 않는 엔드포인트입니다.');
});

async function createOrder({ req, supabase, userId }: Ctx) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  const note = body?.note ?? null;
  if (!items || items.length === 0) return error(400, 'VALIDATION_ERROR', 'items가 필요합니다.');

  const profile = await getProfile(supabase, userId);
  if (!profile) return error(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');

  const variantIds = items.map((i: { variant_id: string }) => i.variant_id);
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id,stock_qty,is_active,product_id,products!inner(point_price,is_active)')
    .in('id', variantIds);
  if (vErr) return error(400, 'VALIDATION_ERROR', vErr.message);

  let totalPoints = 0;
  const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
  for (const item of items) {
    const variant = variantMap.get(item.variant_id);
    const qty = Number(item.quantity ?? 1);
    if (!variant || !variant.is_active || !variant.products?.is_active) return error(404, 'NOT_FOUND', '상품 옵션을 찾을 수 없습니다.');
    if (!Number.isFinite(qty) || qty <= 0) return error(400, 'VALIDATION_ERROR', '수량이 올바르지 않습니다.');
    if (variant.stock_qty < qty) return error(422, 'OUT_OF_STOCK', `재고 부족: ${item.variant_id}`);
    totalPoints += Number(variant.products.point_price) * qty;
  }

  if (profile.point_balance < totalPoints) return error(422, 'INSUFFICIENT_POINTS', `포인트 부족 (보유: ${profile.point_balance}, 필요: ${totalPoints})`);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({ user_id: userId, total_points: totalPoints, note })
    .select('*')
    .single();
  if (orderErr || !order) return error(500, 'INTERNAL_ERROR', orderErr?.message ?? '주문 생성 실패');

  const orderItems = items.map((item: any) => {
    const variant = variantMap.get(item.variant_id);
    return {
      order_id: order.id,
      variant_id: item.variant_id,
      quantity: Number(item.quantity ?? 1),
      point_price: Number(variant.products.point_price),
    };
  });
  const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
  if (oiErr) return error(500, 'INTERNAL_ERROR', oiErr.message);

  for (const item of items) {
    const qty = Number(item.quantity ?? 1);
    const { data: updated, error: stockErr } = await supabase
      .from('product_variants')
      .update({ stock_qty: (variantMap.get(item.variant_id).stock_qty - qty) })
      .eq('id', item.variant_id)
      .gte('stock_qty', qty)
      .select('id')
      .single();
    if (stockErr || !updated) return error(422, 'OUT_OF_STOCK', '재고 갱신 중 충돌이 발생했습니다.');
  }

  const newBalance = profile.point_balance - totalPoints;
  const { error: balErr } = await supabase.from('profiles').update({ point_balance: newBalance }).eq('id', userId);
  if (balErr) return error(500, 'INTERNAL_ERROR', balErr.message);

  const { error: txErr } = await supabase.from('point_transactions').insert({
    user_id: userId,
    type: 'purchase',
    amount: -totalPoints,
    balance_after: newBalance,
    order_id: order.id,
    note: 'order purchase',
    created_by: userId,
  });
  if (txErr) return error(500, 'INTERNAL_ERROR', txErr.message);

  return json(order, 201);
}

async function listMyOrders({ supabase, userId }: Ctx) {
  const { data, error: listErr } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (listErr) return error(500, 'INTERNAL_ERROR', listErr.message);
  return json(data ?? []);
}

async function orderDetail({ supabase, userId }: Ctx, orderId: string) {
  const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (oErr || !order) return error(404, 'NOT_FOUND', '주문을 찾을 수 없습니다.');

  const me = await getProfile(supabase, userId);
  if (!me) return error(401, 'UNAUTHORIZED', '인증 실패');

  if (order.user_id !== userId && me.role !== 'admin') return error(403, 'FORBIDDEN', '조회 권한이 없습니다.');

  const { data: items, error: iErr } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  if (iErr) return error(500, 'INTERNAL_ERROR', iErr.message);

  return json({ ...order, items: items ?? [] });
}

async function approveOrder({ supabase, userId }: Ctx, orderId: string) {
  const me = await getProfile(supabase, userId);
  if (!me || !['department_head', 'admin'].includes(me.role)) return error(403, 'FORBIDDEN', '승인 권한이 없습니다.');

  const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (oErr || !order) return error(404, 'NOT_FOUND', '주문을 찾을 수 없습니다.');

  if (me.role === 'department_head' && order.status === 'pending') {
    const { data, error: uErr } = await supabase
      .from('orders')
      .update({ status: 'dept_approved', dept_approved_by: userId, dept_approved_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single();
    if (uErr) return error(500, 'INTERNAL_ERROR', uErr.message);
    return json(data);
  }

  if (me.role === 'admin' && ['pending', 'dept_approved'].includes(order.status)) {
    const { data, error: uErr } = await supabase
      .from('orders')
      .update({ status: 'completed', admin_approved_by: userId, admin_approved_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single();
    if (uErr) return error(500, 'INTERNAL_ERROR', uErr.message);
    return json(data);
  }

  return error(422, 'INVALID_STATUS', '현재 상태에서 승인할 수 없습니다.');
}

async function rejectOrder({ req, supabase, userId }: Ctx, orderId: string) {
  const me = await getProfile(supabase, userId);
  if (!me || !['department_head', 'admin'].includes(me.role)) return error(403, 'FORBIDDEN', '반려 권한이 없습니다.');

  const body = await req.json().catch(() => null);
  const reason = body?.reason ?? 'rejected';

  const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (oErr || !order) return error(404, 'NOT_FOUND', '주문을 찾을 수 없습니다.');
  if (!['pending', 'dept_approved'].includes(order.status)) return error(422, 'INVALID_STATUS', '반려 가능한 상태가 아닙니다.');

  const requester = await getProfile(supabase, order.user_id);
  if (!requester) return error(404, 'NOT_FOUND', '주문자를 찾을 수 없습니다.');

  const refundedBalance = requester.point_balance + order.total_points;
  const { error: refundBalErr } = await supabase.from('profiles').update({ point_balance: refundedBalance }).eq('id', order.user_id);
  if (refundBalErr) return error(500, 'INTERNAL_ERROR', refundBalErr.message);

  await supabase.from('point_transactions').insert({
    user_id: order.user_id,
    type: 'refund',
    amount: order.total_points,
    balance_after: refundedBalance,
    order_id: order.id,
    note: 'order rejected refund',
    created_by: userId,
  });

  const { data, error: uErr } = await supabase
    .from('orders')
    .update({ status: 'rejected', reject_reason: reason })
    .eq('id', orderId)
    .select('*')
    .single();
  if (uErr) return error(500, 'INTERNAL_ERROR', uErr.message);
  return json(data);
}

async function cancelOrder({ supabase, userId }: Ctx, orderId: string) {
  const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (oErr || !order) return error(404, 'NOT_FOUND', '주문을 찾을 수 없습니다.');
  if (order.user_id !== userId) return error(403, 'FORBIDDEN', '본인 주문만 취소할 수 있습니다.');
  if (order.status !== 'pending') return error(422, 'INVALID_STATUS', 'pending 상태에서만 취소할 수 있습니다.');

  const requester = await getProfile(supabase, userId);
  if (!requester) return error(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');

  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  for (const item of items ?? []) {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('stock_qty')
      .eq('id', item.variant_id)
      .single();
    await supabase
      .from('product_variants')
      .update({ stock_qty: Number(variant?.stock_qty ?? 0) + Number(item.quantity) })
      .eq('id', item.variant_id);
  }

  const refundedBalance = requester.point_balance + order.total_points;
  await supabase.from('profiles').update({ point_balance: refundedBalance }).eq('id', userId);
  await supabase.from('point_transactions').insert({
    user_id: userId,
    type: 'refund',
    amount: order.total_points,
    balance_after: refundedBalance,
    order_id: order.id,
    note: 'order cancelled refund',
    created_by: userId,
  });

  const { data, error: uErr } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).select('*').single();
  if (uErr) return error(500, 'INTERNAL_ERROR', uErr.message);
  return json(data);
}

async function listAllOrders({ supabase, userId }: Ctx) {
  const me = await getProfile(supabase, userId);
  if (!me || me.role !== 'admin') return error(403, 'FORBIDDEN', '관리자만 조회할 수 있습니다.');

  const { data, error: listErr } = await supabase
    .from('orders')
    .select('*, profiles!inner(id,email,full_name,department_id)')
    .order('created_at', { ascending: false });
  if (listErr) return error(500, 'INTERNAL_ERROR', listErr.message);
  return json(data ?? []);
}
