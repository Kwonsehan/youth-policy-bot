'use client';
// ============================================================
// app/admin/page.tsx
// 청춘스럽 정책 상담 관리자 매칭 대시보드
// - 비밀번호 입력 → 신청 목록 조회 → 상담사 배정 → 상태 관리
// ============================================================

import { useState } from 'react';

// ─── 타입 정의 ───
interface ConsultationRequest {
  id: string;
  name: string;
  phone: string;
  age_group: string;
  region: string;
  category: string;
  method: string;
  preferred_date1?: string;
  preferred_date2?: string;
  concern?: string;
  status: string;
  counselor_id?: string;
  confirmed_date?: string;
  admin_memo?: string;
  created_at: string;
}

interface Counselor {
  id: string;
  name: string;
  specialty: string[];
  available: boolean;
}

// ─── 상태 배지 색상 설정 ───
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  '접수대기': { bg: '#FEF9C3', color: '#854D0E', label: '🟡 접수대기' },
  '매칭완료': { bg: '#DCFCE7', color: '#166534', label: '🟢 매칭완료' },
  '상담완료': { bg: '#E0F2FE', color: '#0C4A6E', label: '✅ 상담완료' },
  '취소':     { bg: '#FEE2E2', color: '#991B1B', label: '❌ 취소' },
};

// ─── 날짜 포맷 헬퍼 ───
function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  // 선택된 신청 (상세 패널용)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 필터 상태
  const [filterStatus, setFilterStatus] = useState<string>('전체');

  // 매칭 폼 임시 상태
  const [assignData, setAssignData] = useState<{
    counselorId: string;
    confirmedDate: string;
    memo: string;
  }>({ counselorId: '', confirmedDate: '', memo: '' });

  // 업데이트 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // ── 로그인: 비밀번호로 데이터 조회 ──
  const handleLogin = async () => {
    if (!password.trim()) { setLoginError('비밀번호를 입력해 주세요.'); return; }
    setIsLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`);
      if (res.status === 401) { setLoginError('비밀번호가 올바르지 않습니다.'); return; }
      if (!res.ok) { setLoginError('서버 오류가 발생했습니다.'); return; }

      const data = await res.json();
      setRequests(data.requests || []);
      setCounselors(data.counselors || []);
      setIsLoggedIn(true);
    } catch {
      setLoginError('연결 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 목록 새로고침 ──
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`);
      const data = await res.json();
      setRequests(data.requests || []);
      setCounselors(data.counselors || []);
    } finally {
      setIsLoading(false);
    }
  };

  // ── 상담사 배정 및 저장 ──
  const handleSaveAssign = async (reqId: string, newStatus: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reqId,
          counselor_id: assignData.counselorId || null,
          status: newStatus,
          confirmed_date: assignData.confirmedDate || null,
          admin_memo: assignData.memo,
        }),
      });
      if (res.ok) {
        await handleRefresh();
        setSelectedId(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 현재 보여줄 신청 목록 (필터 적용)
  const filteredRequests = filterStatus === '전체'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const selectedReq = requests.find(r => r.id === selectedId);
  const selectedCounselor = counselors.find(c => c.id === selectedReq?.counselor_id);

  // ──────────────────────────────────────────────
  // ① 비밀번호 로그인 화면
  // ──────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>🏛️</div>
          <h1 style={styles.loginTitle}>청춘스럽 정책상담<br />관리자 대시보드</h1>
          <p style={styles.loginDesc}>관리자 비밀번호를 입력하세요</p>
          <input
            type="password"
            style={styles.loginInput}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          {loginError && <p style={styles.loginError}>{loginError}</p>}
          <button
            style={styles.loginBtn}
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? '확인 중...' : '로그인'}
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // ② 관리자 대시보드 화면
  // ──────────────────────────────────────────────
  return (
    <div style={styles.dashWrap}>

      {/* ===== 상단 헤더 ===== */}
      <header style={styles.dashHeader}>
        <div style={styles.dashHeaderLeft}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div>
            <h1 style={styles.dashTitle}>정책상담 매칭 대시보드</h1>
            <p style={styles.dashSubtitle}>청춘스럽 관리자 전용 — 총 {requests.length}건 접수</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.refreshBtn} onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? '로딩 중...' : '🔄 새로고침'}
          </button>
          <button style={styles.logoutBtn} onClick={() => { setIsLoggedIn(false); setRequests([]); setPassword(''); }}>
            로그아웃
          </button>
        </div>
      </header>

      {/* ===== 요약 통계 카드 ===== */}
      <div style={styles.statsRow}>
        {['접수대기', '매칭완료', '상담완료', '취소'].map((s) => {
          const cnt = requests.filter(r => r.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <div key={s} style={{ ...styles.statCard, borderTop: `3px solid ${st.color}` }}>
              <p style={{ ...styles.statLabel, color: st.color }}>{st.label}</p>
              <p style={styles.statNum}>{cnt}건</p>
            </div>
          );
        })}
      </div>

      {/* ===== 필터 탭 + 목록 & 상세 패널 ===== */}
      <div style={styles.mainArea}>

        {/* 왼쪽: 필터 + 신청 목록 */}
        <div style={styles.listPanel}>
          {/* 상태 필터 탭 */}
          <div style={styles.filterRow}>
            {['전체', '접수대기', '매칭완료', '상담완료', '취소'].map((s) => (
              <button
                key={s}
                style={{ ...styles.filterTab, ...(filterStatus === s ? styles.filterTabActive : {}) }}
                onClick={() => setFilterStatus(s)}
              >
                {s} ({s === '전체' ? requests.length : requests.filter(r => r.status === s).length})
              </button>
            ))}
          </div>

          {/* 신청 목록 */}
          {filteredRequests.length === 0 ? (
            <p style={styles.emptyMsg}>신청 내역이 없습니다.</p>
          ) : (
            filteredRequests.map((r) => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE['접수대기'];
              const counselorName = counselors.find(c => c.id === r.counselor_id)?.name || '-';
              return (
                <div
                  key={r.id}
                  style={{
                    ...styles.reqCard,
                    ...(selectedId === r.id ? styles.reqCardSelected : {}),
                  }}
                  onClick={() => {
                    setSelectedId(r.id);
                    setAssignData({
                      counselorId: r.counselor_id || '',
                      confirmedDate: r.confirmed_date ? r.confirmed_date.slice(0, 16) : '',
                      memo: r.admin_memo || '',
                    });
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ ...styles.badge, background: st.bg, color: st.color }}>{r.status}</span>
                      <span style={styles.categoryBadge}>{r.category}</span>
                    </div>
                    <span style={styles.dateSmall}>{formatDate(r.created_at)}</span>
                  </div>
                  <p style={styles.reqName}>{r.name} <span style={styles.reqSub}>{r.age_group} · {r.region}</span></p>
                  <p style={styles.reqMeta}>📞 {r.phone} · {r.method} · 상담사: {counselorName}</p>
                  {r.concern && <p style={styles.reqConcern}>"{r.concern.slice(0, 60)}{r.concern.length > 60 ? '...' : ''}"</p>}
                </div>
              );
            })
          )}
        </div>

        {/* 오른쪽: 신청 상세 & 매칭 패널 */}
        {selectedReq ? (
          <div style={styles.detailPanel}>
            <h3 style={styles.detailTitle}>📄 신청 상세 / 매칭 처리</h3>

            {/* 기본 정보 */}
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}><span style={styles.infoKey}>이름</span><span>{selectedReq.name}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>연락처</span><span>{selectedReq.phone}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>연령대</span><span>{selectedReq.age_group}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>지역</span><span>{selectedReq.region}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>분야</span><span>{selectedReq.category}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>방식</span><span>{selectedReq.method}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>1지망</span><span>{formatDate(selectedReq.preferred_date1)}</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>2지망</span><span>{formatDate(selectedReq.preferred_date2)}</span></div>
            </div>

            {selectedReq.concern && (
              <div style={styles.concernBox}>
                <p style={styles.infoKey}>고민 내용</p>
                <p style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.6 }}>{selectedReq.concern}</p>
              </div>
            )}

            {/* 매칭 처리 폼 */}
            <div style={styles.assignSection}>
              <p style={styles.assignTitle}>상담사 배정</p>
              <select
                style={styles.assignSelect}
                value={assignData.counselorId}
                onChange={(e) => setAssignData(prev => ({ ...prev, counselorId: e.target.value }))}
              >
                <option value="">상담사 선택 (미배정)</option>
                {counselors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.specialty.join(', ')} {!c.available ? '(비활성)' : ''}
                  </option>
                ))}
              </select>

              <p style={{ ...styles.assignTitle, marginTop: 12 }}>확정 상담 일시</p>
              <input
                type="datetime-local"
                style={styles.assignInput}
                value={assignData.confirmedDate}
                onChange={(e) => setAssignData(prev => ({ ...prev, confirmedDate: e.target.value }))}
              />

              <p style={{ ...styles.assignTitle, marginTop: 12 }}>관리자 메모</p>
              <textarea
                style={styles.assignTextarea}
                rows={3}
                placeholder="상담 결과, 연락 이력 등 메모"
                value={assignData.memo}
                onChange={(e) => setAssignData(prev => ({ ...prev, memo: e.target.value }))}
              />
            </div>

            {/* 상태 변경 버튼들 */}
            <div style={styles.actionBtnRow}>
              <button
                style={{ ...styles.actionBtn, background: '#166534', color: '#fff' }}
                onClick={() => handleSaveAssign(selectedReq.id, '매칭완료')}
                disabled={isSaving || !assignData.counselorId}
              >
                {isSaving ? '저장 중...' : '✅ 매칭 완료 처리'}
              </button>
              <button
                style={{ ...styles.actionBtn, background: '#0C4A6E', color: '#fff' }}
                onClick={() => handleSaveAssign(selectedReq.id, '상담완료')}
                disabled={isSaving}
              >
                📋 상담 완료 처리
              </button>
              <button
                style={{ ...styles.actionBtn, background: '#991B1B', color: '#fff' }}
                onClick={() => handleSaveAssign(selectedReq.id, '취소')}
                disabled={isSaving}
              >
                ❌ 취소 처리
              </button>
            </div>

            <p style={styles.currentStatus}>
              현재 상태: <span style={{ color: STATUS_STYLE[selectedReq.status]?.color || '#333', fontWeight: 700 }}>
                {STATUS_STYLE[selectedReq.status]?.label || selectedReq.status}
              </span>
              {selectedCounselor && ` · 배정 상담사: ${selectedCounselor.name}`}
            </p>
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            <p>← 왼쪽 목록에서<br />신청 건을 선택해 주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 인라인 스타일 상수 (별도 CSS 없이 동작) ───
const PRIMARY = '#1B2A80';
const styles: Record<string, React.CSSProperties> = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF4FA' },
  loginBox: { background: '#fff', borderRadius: 20, padding: '40px 32px', width: 340, boxShadow: '0 8px 32px rgba(27,42,128,0.10)', textAlign: 'center' },
  loginLogo: { fontSize: 40, marginBottom: 12 },
  loginTitle: { fontSize: 20, fontWeight: 800, color: PRIMARY, lineHeight: 1.4, marginBottom: 8 },
  loginDesc: { fontSize: 13.5, color: '#586788', marginBottom: 20 },
  loginInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #DCE4F0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 8 },
  loginError: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  loginBtn: { width: '100%', padding: '12px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  dashWrap: { minHeight: '100vh', background: '#F1F5F9' },
  dashHeader: { background: '#fff', borderBottom: '1px solid #DCE4F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
  dashHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  dashTitle: { fontSize: 17, fontWeight: 800, color: PRIMARY },
  dashSubtitle: { fontSize: 12.5, color: '#586788', marginTop: 2 },
  refreshBtn: { padding: '7px 14px', background: '#EFF4FA', border: '1px solid #DCE4F0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: PRIMARY },
  logoutBtn: { padding: '7px 14px', background: '#FEE2E2', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#991B1B' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px' },
  statCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  statLabel: { fontSize: 12.5, fontWeight: 700, marginBottom: 6 },
  statNum: { fontSize: 24, fontWeight: 800, color: PRIMARY },
  mainArea: { display: 'flex', gap: 16, padding: '0 24px 24px', alignItems: 'flex-start' },
  listPanel: { flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  filterTab: { padding: '5px 12px', background: '#fff', border: '1px solid #DCE4F0', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', color: '#586788', fontWeight: 600 },
  filterTabActive: { background: PRIMARY, color: '#F5B800', border: `1px solid ${PRIMARY}` },
  emptyMsg: { color: '#94A3B8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  reqCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #DCE4F0', cursor: 'pointer', transition: 'all 0.15s' },
  reqCardSelected: { borderColor: PRIMARY, boxShadow: `0 0 0 2px ${PRIMARY}22` },
  badge: { fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999 },
  categoryBadge: { fontSize: 11.5, background: '#EFF4FA', color: PRIMARY, fontWeight: 700, padding: '2px 8px', borderRadius: 999 },
  dateSmall: { fontSize: 11.5, color: '#94A3B8' },
  reqName: { fontSize: 14.5, fontWeight: 700, color: '#1E2538', marginBottom: 4 },
  reqSub: { fontSize: 12.5, color: '#586788', fontWeight: 400 },
  reqMeta: { fontSize: 12.5, color: '#586788', marginBottom: 4 },
  reqConcern: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  detailPanel: { flex: '0 0 360px', background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #DCE4F0', position: 'sticky', top: 80 },
  detailPlaceholder: { flex: '0 0 360px', background: '#F8FAFD', borderRadius: 16, padding: 40, border: '1.5px dashed #DCE4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 1.8 },
  detailTitle: { fontSize: 15, fontWeight: 800, color: PRIMARY, marginBottom: 14 },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  infoRow: { display: 'flex', gap: 8, fontSize: 13.5, alignItems: 'baseline' },
  infoKey: { fontSize: 12.5, color: '#586788', fontWeight: 700, width: 50, flexShrink: 0 },
  concernBox: { background: '#F8FAFD', borderRadius: 8, padding: '10px 12px', marginBottom: 12, border: '1px solid #DCE4F0' },
  assignSection: { borderTop: '1px solid #DCE4F0', paddingTop: 14, marginTop: 4 },
  assignTitle: { fontSize: 12.5, fontWeight: 700, color: '#586788', marginBottom: 6 },
  assignSelect: { width: '100%', padding: '8px 10px', border: '1.5px solid #DCE4F0', borderRadius: 8, fontSize: 13.5, outline: 'none' },
  assignInput: { width: '100%', padding: '8px 10px', border: '1.5px solid #DCE4F0', borderRadius: 8, fontSize: 13.5, outline: 'none' },
  assignTextarea: { width: '100%', padding: '8px 10px', border: '1.5px solid #DCE4F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none' },
  actionBtnRow: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 },
  actionBtn: { padding: '10px', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' },
  currentStatus: { marginTop: 12, fontSize: 12.5, color: '#586788', textAlign: 'center' },
};
