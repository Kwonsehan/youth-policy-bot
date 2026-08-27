'use client';
// ============================================================
// components/ConsultationModal.tsx
// 청춘스럽 정책 상담 신청 모달 (청년용)
// - 청춘스럽 딥블루 #1B2A80 브랜드 디자인 적용
// - 총 3단계: 분야/방식 선택 → 개인정보/일정 → 제출 완료
// ============================================================

import { useState } from 'react';

// 모달에 필요한 Props 타입 정의
interface ConsultationModalProps {
  isOpen: boolean;       // 모달 열림/닫힘 상태
  onClose: () => void;   // 닫기 함수
}

// 신청 폼 데이터 타입
interface FormData {
  category: string;
  method: string;
  name: string;
  phone: string;
  ageGroup: string;
  region: string;
  preferredDate1: string;
  preferredDate2: string;
  concern: string;
  agreedPrivacy: boolean;
}

// 상담 분야 목록
const CATEGORIES = [
  { id: '일자리', label: '💼 일자리·취업', desc: '취업 지원, 인턴, 일경험' },
  { id: '주거금융', label: '🏠 주거·금융', desc: '월세 지원, 전세, 통장' },
  { id: '창업복지', label: '🚀 창업·복지', desc: '창업 지원, 심리 상담, 복지' },
  { id: '청년공간', label: '🏛️ 청년공간', desc: '공간 예약, 이용 안내' },
];

// 연령대 목록
const AGE_GROUPS = ['10대 후반', '20대 초반', '20대 중반', '20대 후반', '30대 초반', '30대 중후반'];

// 대전 지역 목록
const REGIONS = ['대전 동구', '대전 중구', '대전 서구', '대전 유성구', '대전 대덕구', '기타 지역'];

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  // 현재 단계: 1=분야선택, 2=개인정보, 3=완료
  const [step, setStep] = useState(1);

  // 로딩 상태 (제출 중)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 오류 메시지
  const [errorMsg, setErrorMsg] = useState('');

  // 신청 완료 시 발급된 접수 번호
  const [receiptId, setReceiptId] = useState('');

  // 폼 데이터 (모든 필드 초기값)
  const [form, setForm] = useState<FormData>({
    category: '',
    method: '대면',
    name: '',
    phone: '',
    ageGroup: '',
    region: '',
    preferredDate1: '',
    preferredDate2: '',
    concern: '',
    agreedPrivacy: false,
  });

  // 모달이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  // 모달 닫기 & 폼 초기화
  const handleClose = () => {
    setStep(1);
    setErrorMsg('');
    setReceiptId('');
    setForm({
      category: '',
      method: '대면',
      name: '',
      phone: '',
      ageGroup: '',
      region: '',
      preferredDate1: '',
      preferredDate2: '',
      concern: '',
      agreedPrivacy: false,
    });
    onClose();
  };

  // 1단계 → 2단계 이동 (분야 선택 검증)
  const handleNextStep = () => {
    if (!form.category) {
      setErrorMsg('상담 희망 분야를 선택해 주세요.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  // 2단계에서 제출 처리 (서버 API 호출)
  const handleSubmit = async () => {
    // 필수 항목 검증
    if (!form.name.trim()) { setErrorMsg('이름을 입력해 주세요.'); return; }
    if (!form.phone.trim()) { setErrorMsg('연락처를 입력해 주세요.'); return; }
    if (!form.ageGroup) { setErrorMsg('연령대를 선택해 주세요.'); return; }
    if (!form.region) { setErrorMsg('거주 지역을 선택해 주세요.'); return; }
    if (!form.agreedPrivacy) { setErrorMsg('개인정보 수집·이용에 동의해 주세요.'); return; }

    // 전화번호 형식 간단 검증 (숫자 10~11자리)
    const phoneDigits = form.phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setErrorMsg('올바른 연락처를 입력해 주세요. (예: 010-1234-5678)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/consultation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          method: form.method,
          name: form.name.trim(),
          phone: form.phone.trim(),
          ageGroup: form.ageGroup,
          region: form.region,
          preferredDate1: form.preferredDate1 || null,
          preferredDate2: form.preferredDate2 || null,
          concern: form.concern.trim() || null,
          agreedPrivacy: form.agreedPrivacy,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '신청 중 오류가 발생했습니다.');
      }

      // 제출 성공 → 접수 번호 저장 후 완료 화면으로
      setReceiptId(result.receiptId || '');
      setStep(3);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 오늘 날짜 (날짜 최솟값 설정용)
  const today = new Date().toISOString().split('T')[0];

  return (
    // 배경 딤(Dim) 레이어
    <div className="modal-backdrop" onClick={handleClose}>
      {/* 모달 박스 — 클릭 이벤트가 배경까지 전파되지 않도록 stopPropagation */}
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {/* ===== 모달 헤더 ===== */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-icon">📋</span>
            <div>
              <h2 className="modal-title">정책 상담 신청</h2>
              <p className="modal-subtitle">청춘스럽이 함께 고민해 드릴게요 😊</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="닫기">✕</button>
        </div>

        {/* ===== 단계 표시 바 ===== */}
        {step < 3 && (
          <div className="modal-step-bar">
            <div className={`modal-step ${step >= 1 ? 'modal-step-active' : ''}`}>
              <span className="modal-step-num">1</span>
              <span className="modal-step-label">분야 선택</span>
            </div>
            <div className={`modal-step-line ${step >= 2 ? 'modal-step-line-active' : ''}`} />
            <div className={`modal-step ${step >= 2 ? 'modal-step-active' : ''}`}>
              <span className="modal-step-num">2</span>
              <span className="modal-step-label">신청 정보</span>
            </div>
          </div>
        )}

        {/* ===== 모달 내용 영역 ===== */}
        <div className="modal-body">

          {/* ─── 1단계: 상담 분야 & 방식 선택 ─── */}
          {step === 1 && (
            <div className="modal-section">
              {/* 상담 분야 선택 */}
              <p className="modal-field-label">상담 희망 분야 <span className="required-mark">*</span></p>
              <div className="category-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-card ${form.category === cat.id ? 'category-card-active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, category: cat.id }))}
                  >
                    <span className="category-card-label">{cat.label}</span>
                    <span className="category-card-desc">{cat.desc}</span>
                  </button>
                ))}
              </div>

              {/* 상담 방식 선택 */}
              <p className="modal-field-label" style={{ marginTop: '20px' }}>
                상담 방식 <span className="required-mark">*</span>
              </p>
              <div className="method-row">
                {['대면 (청춘스럽 방문)', '비대면 (zoom)'].map((m) => {
                  const val = m.startsWith('대면') ? '대면' : '비대면';
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`method-btn ${form.method === val ? 'method-btn-active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, method: val }))}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* 오류 메시지 */}
              {errorMsg && <p className="modal-error">{errorMsg}</p>}

              {/* 다음 단계 버튼 */}
              <button className="modal-primary-btn" onClick={handleNextStep}>
                다음 단계 →
              </button>
            </div>
          )}

          {/* ─── 2단계: 개인정보 & 희망 일정 입력 ─── */}
          {step === 2 && (
            <div className="modal-section">
              {/* 이름 */}
              <label className="modal-field-label">
                이름 <span className="required-mark">*</span>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={20}
                />
              </label>

              {/* 연락처 */}
              <label className="modal-field-label">
                연락처 <span className="required-mark">*</span>
                <input
                  type="tel"
                  className="modal-input"
                  placeholder="010-1234-5678"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  maxLength={13}
                />
              </label>

              {/* 연령대 & 거주 지역 (2열 배치) */}
              <div className="modal-row-2col">
                <label className="modal-field-label">
                  연령대 <span className="required-mark">*</span>
                  <select
                    className="modal-select"
                    value={form.ageGroup}
                    onChange={(e) => setForm(prev => ({ ...prev, ageGroup: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {AGE_GROUPS.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </label>
                <label className="modal-field-label">
                  거주 지역 <span className="required-mark">*</span>
                  <select
                    className="modal-select"
                    value={form.region}
                    onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 희망 상담 일시 (1지망 / 2지망) */}
              <div className="modal-row-2col">
                <label className="modal-field-label">
                  희망 일시 1지망
                  <input
                    type="date"
                    className="modal-input"
                    min={today}
                    value={form.preferredDate1}
                    onChange={(e) => setForm(prev => ({ ...prev, preferredDate1: e.target.value }))}
                  />
                </label>
                <label className="modal-field-label">
                  희망 일시 2지망
                  <input
                    type="date"
                    className="modal-input"
                    min={today}
                    value={form.preferredDate2}
                    onChange={(e) => setForm(prev => ({ ...prev, preferredDate2: e.target.value }))}
                  />
                </label>
              </div>

              {/* 고민 내용 (선택) */}
              <label className="modal-field-label">
                고민 내용 <span className="optional-mark">(선택)</span>
                <textarea
                  className="modal-textarea"
                  placeholder="예) 취업 준비 중인데 이력서 첨삭 및 자격증 지원 상담을 받고 싶어요."
                  value={form.concern}
                  onChange={(e) => setForm(prev => ({ ...prev, concern: e.target.value }))}
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{form.concern.length}/500</span>
              </label>

              {/* 개인정보 수집·이용 동의 */}
              <div className="privacy-box">
                <p className="privacy-title">📌 개인정보 수집·이용 동의</p>
                <p className="privacy-content">
                  수집 항목: 이름, 연락처, 연령대, 거주 지역, 상담 내용<br />
                  수집 목적: 정책 상담 서비스 제공 및 상담사 매칭<br />
                  보유 기간: 상담 완료 후 1년간 보유 후 파기<br />
                  제3자 제공: 없음 (내부 담당 상담사 한정 공유)
                </p>
                <label className="privacy-check-label">
                  <input
                    type="checkbox"
                    checked={form.agreedPrivacy}
                    onChange={(e) => setForm(prev => ({ ...prev, agreedPrivacy: e.target.checked }))}
                    className="privacy-checkbox"
                  />
                  위 개인정보 수집·이용에 동의합니다. <span className="required-mark">*</span>
                </label>
              </div>

              {/* 오류 메시지 */}
              {errorMsg && <p className="modal-error">{errorMsg}</p>}

              {/* 버튼 행: 이전 / 신청하기 */}
              <div className="modal-btn-row">
                <button
                  className="modal-secondary-btn"
                  onClick={() => { setStep(1); setErrorMsg(''); }}
                  disabled={isSubmitting}
                >
                  ← 이전
                </button>
                <button
                  className="modal-primary-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '신청 중...' : '상담 신청하기 ✓'}
                </button>
              </div>
            </div>
          )}

          {/* ─── 3단계: 제출 완료 화면 ─── */}
          {step === 3 && (
            <div className="modal-success">
              <div className="success-icon">✅</div>
              <h3 className="success-title">상담 신청이 완료되었습니다!</h3>
              <p className="success-desc">
                접수가 완료되었습니다.<br />
                담당 상담사 배정 후 입력하신 연락처로 안내 드릴게요.
              </p>
              {receiptId && (
                <div className="receipt-box">
                  <span className="receipt-label">접수 번호</span>
                  <span className="receipt-id">{receiptId}</span>
                </div>
              )}
              <p className="success-notice">
                보통 1~2 영업일 내에 연락드립니다.<br />
                문의: 대전서구 청년공간 청춘스럽
              </p>
              <button className="modal-primary-btn" onClick={handleClose}>
                닫기
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
