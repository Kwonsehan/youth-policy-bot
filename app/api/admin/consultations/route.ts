// ============================================================
// app/api/admin/consultations/route.ts
// 관리자 전용 상담 신청 목록 조회 & 매칭 처리 API
// - GET: 전체 신청 목록 + 상담사 목록 조회 (service_role 키 사용)
// - PATCH: 상담사 배정 / 상태 변경 / 메모 저장 (안정적인 날짜 처리 및 상세 에러 반환)
// ============================================================

import { createDecipheriv } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// AES-256-CBC 복호화 함수
function decrypt(encryptedText: string): string {
  try {
    const secretKey = process.env.CONSULTATION_ENCRYPT_KEY || '';
    const key = Buffer.from(secretKey.padEnd(32, '0').slice(0, 32), 'utf8');
    const [ivHex, dataHex] = encryptedText.split(':');
    if (!ivHex || !dataHex) return encryptedText;
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

  const authHeader = req.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) === adminPw;
  }

  const url = new URL(req.url);
  const pwParam = url.searchParams.get('pw') || '';
  return pwParam === adminPw;
}

// ── GET: 상담 신청 목록 조회 ──
export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: '비밀번호 인증이 필요합니다.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: 'Supabase 연결 설정이 필요합니다.' }, { status: 503 });
  }

  // 신청 목록 최신순 조회
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
    console.error('[Admin GET Error]', reqErr);
    return Response.json({ error: '신청 목록 조회 오류: ' + reqErr.message }, { status: 500 });
  }

  // 상담사 목록 조회
  const { data: counselors, error: counErr } = await supabase
    .from('counselors')
    .select('id, name, specialty, available')
    .order('name');

  if (counErr) {
    console.error('[Admin Counselors Error]', counErr);
    return Response.json({ error: '상담사 조회 오류: ' + counErr.message }, { status: 500 });
  }

  // 이름·전화번호 복호화
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

// ── PATCH: 상담사 배정 / 상태 변경 / 일정 확정 ──
export async function PATCH(req: Request) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: '비밀번호 인증이 필요합니다.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: 'Supabase 연결 설정이 필요합니다.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { id, counselor_id, status, confirmed_date, admin_memo } = body;

    if (!id) {
      return Response.json({ error: '신청 ID가 누락되었습니다.' }, { status: 400 });
    }

    // ─── 날짜 안전 변환: 한국시간(KST) 기준 유지 ───
    // 프론트에서 "YYYY-MM-DDTHH:mm:00" 형태로 넘어오는 로컬 시간 문자열을
    // new Date() + toISOString()으로 변환하면 UTC 기준으로 -9시간 되어 저장됨.
    // 따라서 KST 오프셋(+09:00)을 직접 붙여서 저장하면 시간이 정확하게 유지됨.
    let safeConfirmedDate: string | null = null;
    if (confirmed_date && typeof confirmed_date === 'string' && confirmed_date.trim() !== '') {
      // "YYYY-MM-DDTHH:mm:00" 형태면 +09:00 오프셋을 붙여서 저장
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(confirmed_date.trim())) {
        // 초(秒) 부분이 없으면 :00 추가
        const base = confirmed_date.trim().length === 16
          ? confirmed_date.trim() + ':00'
          : confirmed_date.trim();
        safeConfirmedDate = `${base}+09:00`; // KST 명시
      } else {
        // 이미 timezone이 포함된 ISO 형식이면 그대로 파싱
        const parsed = new Date(confirmed_date);
        if (!isNaN(parsed.getTime())) {
          safeConfirmedDate = parsed.toISOString();
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (counselor_id !== undefined) updateData.counselor_id = counselor_id || null;
    if (status !== undefined) updateData.status = status;
    if (confirmed_date !== undefined) updateData.confirmed_date = safeConfirmedDate;
    if (admin_memo !== undefined) updateData.admin_memo = admin_memo || '';

    const { data, error } = await supabase
      .from('consultation_requests')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Admin PATCH Supabase Error]', error);
      return Response.json({ error: 'DB 업데이트 실패: ' + error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[Admin PATCH Server Error]', err);
    return Response.json({ error: '서버 처리 오류: ' + msg }, { status: 500 });
  }
}
