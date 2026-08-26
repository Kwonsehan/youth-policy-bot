// ============================================================
// app/api/admin/consultations/route.ts
// 관리자 전용 상담 신청 목록 조회 & 매칭 처리 API
// - GET: 전체 신청 목록 + 상담사 목록 조회 (service_role 키 사용)
// - PATCH: 상담사 배정 / 상태 변경 / 메모 저장
// - 관리자 비밀번호: Authorization 헤더 또는 쿼리 파라미터로 검증
// ============================================================

import { createDecipheriv } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// AES-256-CBC 복호화 함수 (암호화 때의 역과정)
function decrypt(encryptedText: string): string {
  try {
    const secretKey = process.env.CONSULTATION_ENCRYPT_KEY || '';
    const key = Buffer.from(secretKey.padEnd(32, '0').slice(0, 32), 'utf8');
    const [ivHex, dataHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '(복호화 실패)';
  }
}

// 관리자 비밀번호 검증 함수
function isAdminAuthorized(req: Request): boolean {
  const adminPw = process.env.ADMIN_PASSWORD || '';
  if (!adminPw) return false;

  // Authorization 헤더에서 비밀번호 확인 (Bearer 토큰 방식)
  const authHeader = req.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) === adminPw;
  }

  // 쿼리 파라미터에서 확인
  const url = new URL(req.url);
  const pwParam = url.searchParams.get('pw') || '';
  return pwParam === adminPw;
}

// ── GET: 상담 신청 목록 조회 ──
export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: 'Supabase 미설정 상태입니다.' }, { status: 503 });
  }

  // 신청 목록 최신순 조회 (상담사 정보 JOIN)
  const { data: requests, error: reqErr } = await supabase
    .from('consultation_requests')
    .select(`
      id, age_group, region, category, method,
      preferred_date1, preferred_date2, concern,
      status, counselor_id, confirmed_date, admin_memo,
      agreed_privacy, created_at,
      name_encrypted, phone_encrypted
    `)
    .order('created_at', { ascending: false });

  if (reqErr) {
    return Response.json({ error: '조회 오류: ' + reqErr.message }, { status: 500 });
  }

  // 상담사 목록 조회
  const { data: counselors, error: counErr } = await supabase
    .from('counselors')
    .select('id, name, specialty, available')
    .order('name');

  if (counErr) {
    return Response.json({ error: '상담사 조회 오류: ' + counErr.message }, { status: 500 });
  }

  // 이름·전화번호 복호화하여 반환
  const decryptedRequests = (requests || []).map((r) => ({
    ...r,
    name: decrypt(r.name_encrypted),
    phone: decrypt(r.phone_encrypted),
    name_encrypted: undefined,
    phone_encrypted: undefined,
  }));

  return Response.json({
    requests: decryptedRequests,
    counselors: counselors || [],
  });
}

// ── PATCH: 상담사 배정 / 상태 변경 ──
export async function PATCH(req: Request) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: 'Supabase 미설정 상태입니다.' }, { status: 503 });
  }

  const body = await req.json();
  const { id, counselor_id, status, confirmed_date, admin_memo } = body;

  if (!id) {
    return Response.json({ error: '신청 ID가 필요합니다.' }, { status: 400 });
  }

  // 업데이트할 필드만 모아서 처리
  const updateData: Record<string, unknown> = {};
  if (counselor_id !== undefined) updateData.counselor_id = counselor_id || null;
  if (status !== undefined) updateData.status = status;
  if (confirmed_date !== undefined) updateData.confirmed_date = confirmed_date || null;
  if (admin_memo !== undefined) updateData.admin_memo = admin_memo;

  const { error } = await supabase
    .from('consultation_requests')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return Response.json({ error: '업데이트 오류: ' + error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
