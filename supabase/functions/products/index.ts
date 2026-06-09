import { adminClient, getProfile, requireUser } from '../_shared/supabase.ts';
import { error, json } from '../_shared/http.ts';

type Ctx = { req: Request; supabase: ReturnType<typeof adminClient>; userId: string };
const parsePath = (req: Request) => new URL(req.url).pathname.replace(/\/functions\/v1|\/products/g, '');

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  const path = parsePath(req);
  const ctx: Ctx = { req, supabase: auth.supabase, userId: auth.user!.id };

  if (req.method === 'GET' && (path === '' || path === '/')) return listProducts(ctx);
  if (req.method === 'GET' && /^\/[0-9a-fA-F-]{36}$/.test(path)) return productDetail(ctx, path.slice(1));
  if (req.method === 'POST' && (path === '' || path === '/')) return createProduct(ctx);
  if (req.method === 'PUT' && /^\/[0-9a-fA-F-]{36}$/.test(path)) return updateProduct(ctx, path.slice(1));
  if (req.method === 'DELETE' && /^\/[0-9a-fA-F-]{36}$/.test(path)) return deactivateProduct(ctx, path.slice(1));
  if (req.method === 'POST' && /^\/[0-9a-fA-F-]{36}\/variants$/.test(path)) return createVariant(ctx, path.split('/')[1]);
  if (req.method === 'PUT' && /^\/variants\/[0-9a-fA-F-]{36}$/.test(path)) return updateVariantStock(ctx, path.split('/')[2]);

  return error(404, 'NOT_FOUND', '지원하지 않는 엔드포인트입니다.');
});

async function requireAdmin(supabase: ReturnType<typeof adminClient>, userId: string) {
  const me = await getProfile(supabase, userId);
  return me?.role === 'admin';
}

async function listProducts({ req, supabase }: Ctx) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '20');
  const category = url.searchParams.get('category');

  let q = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error: listErr } = await q.range(from, to);
  if (listErr) return error(500, 'INTERNAL_ERROR', listErr.message);
  return json(data ?? [], 200, { page, total: count ?? 0 });
}

async function productDetail({ supabase }: Ctx, productId: string) {
  const { data: product, error: pErr } = await supabase.from('products').select('*').eq('id', productId).single();
  if (pErr || !product) return error(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.');

  const { data: variants, error: vErr } = await supabase.from('product_variants').select('*').eq('product_id', productId);
  if (vErr) return error(500, 'INTERNAL_ERROR', vErr.message);

  return json({ ...product, variants: variants ?? [] });
}

async function createProduct({ req, supabase, userId }: Ctx) {
  if (!(await requireAdmin(supabase, userId))) return error(403, 'FORBIDDEN', '관리자만 등록할 수 있습니다.');

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.point_price) return error(400, 'VALIDATION_ERROR', 'name, point_price는 필수입니다.');

  const { data, error: createErr } = await supabase.from('products').insert(productPayload(body)).select('*').single();
  if (createErr) return error(400, 'VALIDATION_ERROR', createErr.message);
  return json(data, 201);
}

async function updateProduct({ req, supabase, userId }: Ctx, productId: string) {
  if (!(await requireAdmin(supabase, userId))) return error(403, 'FORBIDDEN', '관리자만 수정할 수 있습니다.');
  const body = await req.json().catch(() => null);
  const { data, error: updateErr } = await supabase.from('products').update(productPayload(body ?? {}, false)).eq('id', productId).select('*').single();
  if (updateErr) return error(400, 'VALIDATION_ERROR', updateErr.message);
  return json(data);
}

function productPayload(body: Record<string, unknown>, requirePrice = true) {
  const payload: Record<string, unknown> = {};
  const textFields = ['name', 'description', 'image_url', 'category', 'detail_info', 'shipping_info', 'return_info', 'thumbnail', 'badge'];
  textFields.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key] === '' ? null : body[key];
  });
  if (Object.prototype.hasOwnProperty.call(body, 'point_price') || requirePrice) payload.point_price = Number(body.point_price);
  if (Object.prototype.hasOwnProperty.call(body, 'is_active')) payload.is_active = Boolean(body.is_active);
  if (Object.prototype.hasOwnProperty.call(body, 'is_featured')) payload.is_featured = Boolean(body.is_featured);
  return payload;
}

async function deactivateProduct({ supabase, userId }: Ctx, productId: string) {
  if (!(await requireAdmin(supabase, userId))) return error(403, 'FORBIDDEN', '관리자만 비활성화할 수 있습니다.');
  const { data, error: updateErr } = await supabase.from('products').update({ is_active: false }).eq('id', productId).select('*').single();
  if (updateErr) return error(400, 'VALIDATION_ERROR', updateErr.message);
  return json(data);
}

async function createVariant({ req, supabase, userId }: Ctx, productId: string) {
  if (!(await requireAdmin(supabase, userId))) return error(403, 'FORBIDDEN', '관리자만 수정할 수 있습니다.');
  const body = await req.json().catch(() => null);
  const payload = { product_id: productId, size: body?.size, color: body?.color ?? null, stock_qty: Number(body?.stock_qty ?? 0) };
  if (!payload.size) return error(400, 'VALIDATION_ERROR', 'size는 필수입니다.');

  const { data, error: createErr } = await supabase.from('product_variants').insert(payload).select('*').single();
  if (createErr) return error(400, 'VALIDATION_ERROR', createErr.message);
  return json(data, 201);
}

async function updateVariantStock({ req, supabase, userId }: Ctx, variantId: string) {
  if (!(await requireAdmin(supabase, userId))) return error(403, 'FORBIDDEN', '관리자만 수정할 수 있습니다.');
  const body = await req.json().catch(() => null);
  const stockQty = Number(body?.stock_qty);
  if (!Number.isFinite(stockQty) || stockQty < 0) return error(400, 'VALIDATION_ERROR', 'stock_qty는 0 이상 숫자여야 합니다.');

  const { data, error: updateErr } = await supabase.from('product_variants').update({ stock_qty: stockQty }).eq('id', variantId).select('*').single();
  if (updateErr) return error(400, 'VALIDATION_ERROR', updateErr.message);
  return json(data);
}
