import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { error } from './http.ts';

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export async function requireUser(req: Request, supabase = adminClient()) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { response: error(401, 'UNAUTHORIZED', '인증 토큰이 없습니다.') };

  const { data, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !data.user) {
    return { response: error(401, 'UNAUTHORIZED', '유효하지 않은 토큰입니다.') };
  }
  return { user: data.user, supabase };
}

export async function getProfile(supabase: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,department_id,point_balance')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}
