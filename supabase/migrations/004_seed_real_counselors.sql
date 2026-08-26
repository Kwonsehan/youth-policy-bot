-- ============================================================
-- 004_seed_real_counselors.sql
-- 청춘스럽 공식 전담 상담사 설정 (권세한, 윤정욱)
-- ============================================================

-- 기존 상담사 데이터 정리
DELETE FROM counselors;

-- 권세한, 윤정욱 상담사 2명 등록 (전분야 상담)
INSERT INTO counselors (name, specialty, available) VALUES
  ('권세한', ARRAY['전분야'], true),
  ('윤정욱', ARRAY['전분야'], true);
