// ============================================================
// app/api/consultation/submit/route.ts
// 청춘스럽 정책 상담 신청 접수 API
// - 이름, 연락처를 AES-256-CBC 방식으로 암호화하여 Supabase에 저장
// - 암호화 키: 환경변수 CONSULTATION_ENCRYPT_KEY (32자)
// ============================================================

import { createCipheriv, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// AES-256-CBC 암호화 함수
// - 매번 랜덤 IV를 생성하여 같은 값을 넣어도 다른 결과가 나오도록 처리
function encrypt(plainText: string): string {
  const secretKey = process.env.CONSULTATION_ENCRYPT_KEY || '';

  // 키를 정확히 32바이트(256비트)로 맞춤 (부족하면 0으로 채우고, 넘치면 자름)
  const key = Buffer.from(secretKey.padEnd(32, '0').slice(0, 32), 'utf8');

  // 16바이트(128비트) 랜덤 초기화 벡터 생성
  const iv = randomBytes(16);

  const cipher = createCipheriv('aes-256-cbc', key, iv);

  // 암호화 수행 후 hex 문자열로 변환
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  // "iv(hex):암호화된값(hex)" 형태로 저장 → 복호화 시 IV가 필요하기 때문
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 짧은 접수 번호 생성 (예: RQ-A3F2B)
function generateReceiptId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'RQ-';
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      category,
      method,
      name,
      phone,
      ageGroup,
      region,
      preferredDate1,
      preferredDate2,
      concern,
      agreedPrivacy,
    } = body;

    // ── 서버 측 필수 항목 재검증 ──
    if (!name || !phone || !category || !ageGroup || !region) {
      return Response.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!agreedPrivacy) {
      return Response.json(
        { error: '개인정보 수집·이용 동의가 필요합니다.' },
        { status: 400 }
      );
    }

    // ── 전화번호 형식 검증 ──
    const phoneDigits = String(phone).replace(/[^0-9]/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return Response.json(
        { error: '올바른 연락처 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // ── 이름·전화번호 AES-256 암호화 ──
    const nameEncrypted = encrypt(String(name).trim());
    const phoneEncrypted = encrypt(phoneDigits);

    // ── 접수 번호 생성 ──
    const receiptId = generateReceiptId();

    // ── Supabase Admin 클라이언트 획득 ──
    const supabaseAdmin = getSupabaseAdmin();

    // Supabase 미설정 환경에서도 크래시 없이 동작 (개발/테스트용)
    if (!supabaseAdmin) {
      console.warn('[consultation/submit] Supabase Admin 미설정 상태 — 신청 데이터를 DB에 저장하지 못했습니다.');
      // 개발 환경에서도 성공 응답을 반환하여 프론트엔드 테스트 가능
      return Response.json({ receiptId }, { status: 200 });
    }

    // ── Supabase INSERT ──
    const { error } = await supabaseAdmin
      .from('consultation_requests')
      .insert({
        name_encrypted: nameEncrypted,
        phone_encrypted: phoneEncrypted,
        age_group: ageGroup,
        region,
        category,
        method: method || '대면',
        preferred_date1: preferredDate1 || null,
        preferred_date2: preferredDate2 || null,
        concern: concern || null,
        status: '접수대기',
        agreed_privacy: true,
      });

    if (error) {
      console.error('[consultation/submit] Supabase INSERT 오류:', error);
      return Response.json(
        { error: '신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 }
      );
    }

    return Response.json({ receiptId }, { status: 200 });

  } catch (err) {
    console.error('[consultation/submit] 서버 오류:', err);
    return Response.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
