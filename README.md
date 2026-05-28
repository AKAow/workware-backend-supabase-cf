# WorkWare Backend

Supabase + Cloudflare 기반의 사내 포인트 작업복 구매 시스템 백엔드입니다.

## Structure

- `supabase/migrations`: DB 스키마 및 RLS
- `supabase/functions`: Edge Functions (`points`, `orders`, `products`, `admin`)
- `supabase/seed.sql`: 개발 초기 데이터
- `cloudflare/worker`: API Gateway (CORS + rate limit + proxy)
- `frontend/workwear`: WorkWear 프론트엔드 정적 앱 (Pages 배포 대상)

## Prerequisites

- Supabase CLI
- Wrangler CLI

## Deploy

```bash
supabase db push
supabase functions deploy points
supabase functions deploy orders
supabase functions deploy products
supabase functions deploy admin

cd cloudflare/worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler deploy
```

## Notes

- 포인트 지급/차감은 `grant_points`, `deduct_points` RPC를 통해 트랜잭션 보장
- 주문 생성은 현재 함수 레벨에서 순차 처리되며, 고트래픽 환경에서는 단일 RPC 트랜잭션 전환 권장

## Frontend (Cloudflare Pages)

`frontend/workwear`를 Cloudflare Pages 정적 사이트로 배포합니다.

### Required Config

`frontend/workwear/supabase-config.js`

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PROJECT_REF`
- `API_BASE` (Cloudflare Worker `/api` 엔드포인트)

### Deploy Steps

1. Pages 프로젝트 생성 (예: `workwear-v5-nike`)
2. `frontend/workwear` 디렉토리를 정적 파일로 업로드
3. 배포 URL 확인 후 `index.html` 진입 경로 점검
4. 로그인/주문/관리자 기능이 Worker API와 정상 연동되는지 확인
