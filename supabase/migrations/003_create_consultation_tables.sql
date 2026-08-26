-- ============================================================
-- 003_create_consultation_tables.sql
-- 청춘스럽 정책 상담 신청 & 상담사 매칭 시스템 테이블 생성
-- 실행: Supabase 대시보드 > SQL Editor에 이 파일 전체 붙여넣고 실행
-- ============================================================

-- ① 상담사(counselors) 테이블
--    관리자가 등록하는 상담사 목록
CREATE TABLE IF NOT EXISTS counselors (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  specialty   text[]      DEFAULT '{}',  -- 예: ['일자리', '주거']
  available   boolean     DEFAULT true,   -- 현재 매칭 가능 여부
  created_at  timestamptz DEFAULT now()
);

-- ② 상담 신청(consultation_requests) 테이블
--    청년이 제출한 상담 신청서 (이름·연락처는 암호화 저장)
CREATE TABLE IF NOT EXISTS consultation_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_encrypted   text        NOT NULL,     -- 이름 (AES-256 암호화)
  phone_encrypted  text        NOT NULL,     -- 연락처 (AES-256 암호화)
  age_group        text        NOT NULL,     -- 연령대 (예: 20대 초반)
  region           text        NOT NULL,     -- 거주 지역
  category         text        NOT NULL,     -- 상담 희망 분야
  method           text        NOT NULL DEFAULT '대면',  -- 대면/비대면
  preferred_date1  date,                    -- 희망 일시 1지망
  preferred_date2  date,                    -- 희망 일시 2지망
  concern          text,                    -- 고민 내용 (선택)
  status           text        NOT NULL DEFAULT '접수대기',
  -- 상태값: '접수대기' | '매칭완료' | '상담완료' | '취소'
  counselor_id     uuid        REFERENCES counselors(id) ON DELETE SET NULL,
  confirmed_date   timestamptz,             -- 확정된 상담 일시
  admin_memo       text,                    -- 관리자 메모
  agreed_privacy   boolean     NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- ③ 샘플 상담사 데이터 삽입 (운영 시 실제 이름으로 수정하세요)
INSERT INTO counselors (name, specialty, available) VALUES
  ('김상담', ARRAY['일자리', '취업'], true),
  ('이정책', ARRAY['주거', '금융'], true),
  ('박청춘', ARRAY['창업', '복지', '청년공간'], true)
ON CONFLICT DO NOTHING;

-- ④ 보안 정책 설정 (Row Level Security)
--    anon 키: 신청 INSERT만 허용
--    service_role 키: 관리자(서버)만 전체 조회/수정 가능

ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "anon_insert_consultation" ON consultation_requests;
DROP POLICY IF EXISTS "service_select_consultation" ON consultation_requests;
DROP POLICY IF EXISTS "service_update_consultation" ON consultation_requests;
DROP POLICY IF EXISTS "service_manage_counselors" ON counselors;
DROP POLICY IF EXISTS "anon_select_counselors" ON counselors;

-- 청년(익명 사용자)은 신청서 INSERT만 허용
CREATE POLICY "anon_insert_consultation"
  ON consultation_requests FOR INSERT
  WITH CHECK (true);

-- 관리자(service_role)만 신청서 조회 가능
CREATE POLICY "service_select_consultation"
  ON consultation_requests FOR SELECT
  USING (auth.role() = 'service_role');

-- 관리자(service_role)만 신청서 업데이트(매칭 처리) 가능
CREATE POLICY "service_update_consultation"
  ON consultation_requests FOR UPDATE
  USING (auth.role() = 'service_role');

-- 상담사 목록: 서비스롤만 전체 관리, 익명은 목록 조회만 허용
CREATE POLICY "anon_select_counselors"
  ON counselors FOR SELECT
  USING (true);

CREATE POLICY "service_manage_counselors"
  ON counselors FOR ALL
  USING (auth.role() = 'service_role');
