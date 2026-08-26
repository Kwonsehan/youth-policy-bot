'use client';
// ============================================================
// app/admin/page.tsx
// 청춘스럽 정책 상담 관리자 매칭 대시보드
// - 브라우저 네모(ㅁ) 폰트 깨짐 100% 원천 차단
// - [연도 / 월 / 일] + [시간] 완전 한글 드롭다운 + 퀵 선택 버튼 UI
// ============================================================

import React, { useState, useMemo } from 'react';

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

// ─── 상태 배지 스타일 ───
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  '접수대기': { bg: '#FEF9C3', color: '#854D0E', label: '🟡 접수대기' },
  '매칭완료': { bg: '#DCFCE7', color: '#166534', label: '🟢 매칭완료' },
  '상담완료': { bg: '#E0F2FE', color: '#0C4A6E', label: '✅ 상담완료' },
  '취소':     { bg: '#FEE2E2', color: '#991B1B', label: '❌ 취소' },
};

// ─── 시간 옵션 목록 (09:00 ~ 20:00) ───
const TIME_OPTIONS = [
  { value: '09:00', label: '오전 09:00' },
  { value: '09:30', label: '오전 09:30' },
  { value: '10:00', label: '오전 10:00' },
  { value: '10:30', label: '오전 10:30' },
  { value: '11:00', label: '오전 11:00' },
  { value: '11:30', label: '오전 11:30' },
  { value: '12:00', label: '오후 12:00 (정오)' },
  { value: '12:30', label: '오후 12:30' },
  { value: '13:00', label: '오후 01:00 (13시)' },
  { value: '13:30', label: '오후 01:30' },
  { value: '14:00', label: '오후 02:00 (14시)' },
  { value: '14:30', label: '오후 02:30' },
  { value: '15:00', label: '오후 03:00 (15시)' },
  { value: '15:30', label: '오후 03:30' },
  { value: '16:00', label: '오후 04:00 (16시)' },
  { value: '16:30', label: '오후 04:30' },
  { value: '17:00', label: '오후 05:00 (17시)' },
  { value: '17:30', label: '오후 05:30' },
  { value: '18:00', label: '오후 06:00 (18시)' },
  { value: '18:30', label: '오후 06:30' },
  { value: '19:00', label: '오후 07:00 (19시)' },
  { value: '19:30', label: '오후 07:30' },
  { value: '20:00', label: '오후 08:00 (20시)' },
];

// ─── 날짜 헬퍼 ───
function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(dateStr)} ${hours}:${mins}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  // 모달 대상
  const [selectedReq, setSelectedReq] = useState<ConsultationRequest | null>(null);

  // 필터 및 검색
  const [filterStatus, setFilterStatus] = useState<string>('전체');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ── [한글 100% 안전 드롭다운 상태] ──
  const [assignCounselorId, setAssignCounselorId] = useState('');
  const [assignYear, setAssignYear] = useState('2026');
  const [assignMonth, setAssignMonth] = useState('08');
  const [assignDay, setAssignDay] = useState('26');
  const [assignTime, setAssignTime] = useState('14:00');
  const [assignMemo, setAssignMemo] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 캘린더 연월 상태
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // ── 로그인 ──
  const handleLogin = async () => {
    if (!password.trim()) { setLoginError('비밀번호를 입력해 주세요.'); return; }
    setIsLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`);
      if (res.status === 401) { setLoginError('비밀번호가 올바르지 않습니다.'); return; }
      if (!res.ok) { setLoginError('서버 연결 오류가 발생했습니다.'); return; }

      const data = await res.json();
      setRequests(data.requests || []);
      setCounselors(data.counselors || []);
      setIsLoggedIn(true);
    } catch {
      setLoginError('인터넷 연결을 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 새로고침 ──
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`);
      const data = await res.json();
      setRequests(data.requests || []);
      setCounselors(data.counselors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── 특정 날짜 문자열(YYYY-MM-DD)을 드롭다운에 세팅하는 헬퍼 ──
  const setDropdownDate = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      setAssignYear(parts[0]);
      setAssignMonth(parts[1].padStart(2, '0'));
      setAssignDay(parts[2].padStart(2, '0'));
    }
  };

  // ── 모달 열기 ──
  const openDetailModal = (req: ConsultationRequest) => {
    setSelectedReq(req);
    setFeedbackMsg(null);
    setAssignCounselorId(req.counselor_id || '');
    setAssignMemo(req.admin_memo || '');

    // 기존 확정일이 있으면 해당 일시 세팅, 없으면 1지망 희망일 세팅
    if (req.confirmed_date) {
      const d = new Date(req.confirmed_date);
      if (!isNaN(d.getTime())) {
        setAssignYear(String(d.getFullYear()));
        setAssignMonth(String(d.getMonth() + 1).padStart(2, '0'));
        setAssignDay(String(d.getDate()).padStart(2, '0'));
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setAssignTime(`${h}:${min}`);
      }
    } else if (req.preferred_date1) {
      setDropdownDate(req.preferred_date1);
      setAssignTime('14:00');
    } else {
      const now = new Date();
      setAssignYear(String(now.getFullYear()));
      setAssignMonth(String(now.getMonth() + 1).padStart(2, '0'));
      setAssignDay(String(now.getDate()).padStart(2, '0'));
      setAssignTime('14:00');
    }
  };

  const closeDetailModal = () => {
    setSelectedReq(null);
    setFeedbackMsg(null);
  };

  // ── 해당 연/월의 일(Day) 개수 계산 (28~31일) ──
  const daysInSelectedMonth = useMemo(() => {
    const y = parseInt(assignYear, 10) || 2026;
    const m = parseInt(assignMonth, 10) || 1;
    return new Date(y, m, 0).getDate();
  }, [assignYear, assignMonth]);

  // ── 저장 실행 ──
  const handleSaveAssign = async (targetStatus: string) => {
    if (!selectedReq) return;

    if (targetStatus === '매칭완료' && !assignCounselorId) {
      setFeedbackMsg({ type: 'error', text: '매칭할 담당 상담사를 선택해 주세요.' });
      return;
    }

    // YYYY-MM-DDTHH:mm:00 포맷 결합
    const combinedDateStr = `${assignYear}-${assignMonth.padStart(2, '0')}-${assignDay.padStart(2, '0')}`;
    const combinedDateTime = `${combinedDateStr}T${assignTime || '14:00'}:00`;

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/admin/consultations?pw=${encodeURIComponent(password)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReq.id,
          counselor_id: assignCounselorId || null,
          status: targetStatus,
          confirmed_date: combinedDateTime,
          admin_memo: assignMemo,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || '저장에 실패했습니다.');
      }

      setFeedbackMsg({ type: 'success', text: `✅ [${targetStatus}] 상태로 저장되었습니다!` });
      await handleRefresh();

      setSelectedReq(prev => prev ? {
        ...prev,
        status: targetStatus,
        counselor_id: assignCounselorId || undefined,
        confirmed_date: combinedDateTime || undefined,
        admin_memo: assignMemo,
      } : null);

      setTimeout(() => {
        closeDetailModal();
      }, 1200);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장 중 오류 발생';
      setFeedbackMsg({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setIsSaving(false);
    }
  };

  // ── 필터링된 신청 목록 ──
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchStatus = filterStatus === '전체' || r.status === filterStatus;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [requests, filterStatus, searchTerm]);

  // ── 캘린더 날짜 계산 ──
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const days: Array<{ dayNum: number | null; dateStr: string | null }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ dayNum: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, dateStr: `${calYear}-${mStr}-${dStr}` });
    }
    return days;
  }, [calYear, calMonth]);

  // ── 1. 로그인 뷰 ──
  if (!isLoggedIn) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏛️</div>
          <h1 style={styles.loginTitle}>청춘스럽 정책상담<br />관리자 대시보드</h1>
          <p style={styles.loginDesc}>관리자 비밀번호를 입력해 주세요</p>
          <input
            type="password"
            style={styles.loginInput}
            placeholder="비밀번호 입력"
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
            {isLoading ? '확인 중...' : '대시보드 입장'}
          </button>
        </div>
      </div>
    );
  }

  // ── 2. 메인 대시보드 ──
  return (
    <div style={styles.dashContainer}>

      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: 26 }}>🏛️</span>
          <div>
            <h1 style={styles.headerTitle}>청춘스럽 정책상담 매칭 관리 시스템</h1>
            <p style={styles.headerSub}>총 {requests.length}건 접수 · 대전 서구 청년공간 청춘스럽</p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.viewToggleGroup}>
            <button
              style={{ ...styles.viewToggleBtn, ...(viewMode === 'list' ? styles.viewToggleBtnActive : {}) }}
              onClick={() => setViewMode('list')}
            >
              📋 신청 목록 보기
            </button>
            <button
              style={{ ...styles.viewToggleBtn, ...(viewMode === 'calendar' ? styles.viewToggleBtnActive : {}) }}
              onClick={() => setViewMode('calendar')}
            >
              📅 상담 일정 캘린더
            </button>
          </div>

          <button style={styles.refreshBtn} onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? '로딩...' : '🔄 새로고침'}
          </button>

          <button
            style={styles.logoutBtn}
            onClick={() => { setIsLoggedIn(false); setRequests([]); setPassword(''); }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 통계 바 */}
      <section style={styles.statsGrid}>
        {['접수대기', '매칭완료', '상담완료', '취소'].map((s) => {
          const cnt = requests.filter(r => r.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <div
              key={s}
              style={{ ...styles.statCard, borderTop: `4px solid ${st.color}` }}
              onClick={() => { setFilterStatus(s); setViewMode('list'); }}
            >
              <span style={{ ...styles.statLabel, color: st.color }}>{st.label}</span>
              <span style={styles.statNumber}>{cnt}<span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>건</span></span>
            </div>
          );
        })}
      </section>

      {/* 메인 컨텐츠 */}
      <main style={styles.mainContent}>

        {/* 📋 신청 목록 뷰 */}
        {viewMode === 'list' && (
          <div style={styles.cardContainer}>
            <div style={styles.toolbar}>
              <div style={styles.filterButtonGroup}>
                {['전체', '접수대기', '매칭완료', '상담완료', '취소'].map((s) => (
                  <button
                    key={s}
                    style={{ ...styles.filterTabBtn, ...(filterStatus === s ? styles.filterTabBtnActive : {}) }}
                    onClick={() => setFilterStatus(s)}
                  >
                    {s} ({s === '전체' ? requests.length : requests.filter(r => r.status === s).length})
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="🔍 신청자 이름, 연락처, 분야 검색"
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredRequests.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: 36 }}>📭</span>
                <p style={{ marginTop: 12, color: '#64748B', fontWeight: 600 }}>해당 조건의 신청 내역이 없습니다.</p>
              </div>
            ) : (
              <div style={styles.requestGrid}>
                {filteredRequests.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE['접수대기'];
                  const counselorName = counselors.find(c => c.id === r.counselor_id)?.name || '미배정';
                  return (
                    <div
                      key={r.id}
                      style={styles.requestCard}
                      onClick={() => openDetailModal(r)}
                    >
                      <div style={styles.cardTopRow}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ ...styles.badge, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          <span style={styles.catBadge}>{r.category}</span>
                        </div>
                        <span style={styles.dateText}>신청: {formatDate(r.created_at)}</span>
                      </div>

                      <div style={styles.cardMainInfo}>
                        <h3 style={styles.applicantName}>
                          {r.name} <span style={styles.subText}>({r.age_group} · {r.region})</span>
                        </h3>
                        <p style={styles.contactText}>📞 {r.phone} · 방식: <b>{r.method}</b></p>
                      </div>

                      <div style={styles.cardDetailBox}>
                        <p style={styles.detailLine}>
                          <span style={styles.detailKey}>희망일:</span> 1지망({formatDate(r.preferred_date1)}) / 2지망({formatDate(r.preferred_date2)})
                        </p>
                        <p style={styles.detailLine}>
                          <span style={styles.detailKey}>상담사:</span> <b>{counselorName}</b>
                          {r.confirmed_date && <span style={{ marginLeft: 6, color: '#166534', fontWeight: 700 }}>({formatDateTime(r.confirmed_date)})</span>}
                        </p>
                        {r.concern && (
                          <p style={styles.concernPreview}>
                            💭 "{r.concern}"
                          </p>
                        )}
                      </div>

                      <button style={styles.cardActionBtn}>
                        상세 확인 & 상담사 매칭하기 →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 📅 캘린더 뷰 */}
        {viewMode === 'calendar' && (
          <div style={styles.calendarContainer}>
            <div style={styles.calHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  style={styles.calNavBtn}
                  onClick={() => {
                    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                    else { setCalMonth(m => m - 1); }
                  }}
                >
                  ◀ 이전달
                </button>
                <h2 style={styles.calMonthTitle}>
                  {calYear}년 {calMonth + 1}월 상담 일정
                </h2>
                <button
                  style={styles.calNavBtn}
                  onClick={() => {
                    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                    else { setCalMonth(m => m + 1); }
                  }}
                >
                  다음달 ▶
                </button>
                <button
                  style={styles.calTodayBtn}
                  onClick={() => {
                    const now = new Date();
                    setCalYear(now.getFullYear());
                    setCalMonth(now.getMonth());
                  }}
                >
                  오늘
                </button>
              </div>

              <div style={styles.calLegend}>
                <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#166534' }} /> 매칭완료</span>
                <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#0C4A6E' }} /> 상담완료</span>
              </div>
            </div>

            <div style={styles.calWeekdays}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w, idx) => (
                <div key={w} style={{ ...styles.calWeekdayCol, color: idx === 0 ? '#DC2626' : idx === 6 ? '#2563EB' : '#475569' }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={styles.calGrid}>
              {calendarDays.map((item, idx) => {
                if (!item.dateStr || item.dayNum === null) {
                  return <div key={`empty-${idx}`} style={styles.calEmptyCell} />;
                }

                const dayEvents = requests.filter(r => {
                  if (!r.confirmed_date) return false;
                  return r.confirmed_date.startsWith(item.dateStr!);
                });

                const isToday = item.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div key={item.dateStr} style={{ ...styles.calCell, ...(isToday ? styles.calCellToday : {}) }}>
                    <div style={styles.calDayNumRow}>
                      <span style={{ ...styles.calDayNum, ...(isToday ? styles.calDayNumToday : {}) }}>
                        {item.dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={styles.dayEventCount}>{dayEvents.length}건</span>
                      )}
                    </div>

                    <div style={styles.calEventList}>
                      {dayEvents.map(ev => {
                        const counselor = counselors.find(c => c.id === ev.counselor_id);
                        const timeStr = ev.confirmed_date ? new Date(ev.confirmed_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                        const isDone = ev.status === '상담완료';

                        return (
                          <div
                            key={ev.id}
                            style={{
                              ...styles.calEventCard,
                              background: isDone ? '#E0F2FE' : '#DCFCE7',
                              borderLeft: `3px solid ${isDone ? '#0C4A6E' : '#166534'}`,
                            }}
                            onClick={() => openDetailModal(ev)}
                            title="클릭하여 상세 정보 및 일정 변경"
                          >
                            <p style={styles.eventTime}>{timeStr} ({ev.method})</p>
                            <p style={styles.eventName}>{ev.name} ({ev.category})</p>
                            <p style={styles.eventCounselor}>👤 {counselor?.name || '담당자'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ───────────────────────────────────────────────────
          [중앙 모달] 📋 상담 상세 정보 & 매칭 처리 창
          (한글 100% 드롭다운으로 네모 깨짐 완전 차단)
         ─────────────────────────────────────────────────── */}
      {selectedReq && (
        <div style={styles.modalOverlay} onClick={closeDetailModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>

            <div style={styles.modalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...styles.badge, ...STATUS_STYLE[selectedReq.status] }}>
                    {STATUS_STYLE[selectedReq.status]?.label || selectedReq.status}
                  </span>
                  <span style={styles.catBadge}>{selectedReq.category}</span>
                  <span style={{ fontSize: 13, color: '#64748B' }}>접수일: {formatDate(selectedReq.created_at)}</span>
                </div>
                <h2 style={styles.modalTitle}>{selectedReq.name} 청년 상담 신청서</h2>
              </div>
              <button style={styles.modalCloseBtn} onClick={closeDetailModal}>✕</button>
            </div>

            {feedbackMsg && (
              <div style={{
                ...styles.feedbackAlert,
                background: feedbackMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: feedbackMsg.type === 'success' ? '#166534' : '#991B1B',
                borderColor: feedbackMsg.type === 'success' ? '#86EFAC' : '#FCA5A5',
              }}>
                {feedbackMsg.text}
              </div>
            )}

            <div style={styles.modalBodyGrid}>

              {/* 신청자 정보 */}
              <div style={styles.infoCol}>
                <h4 style={styles.sectionHeading}>👤 신청자 정보</h4>
                <div style={styles.infoTable}>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>이름</span><b>{selectedReq.name}</b></div>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>연락처</span><b style={{ color: '#1B2A80' }}>📞 {selectedReq.phone}</b></div>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>연령 / 지역</span><span>{selectedReq.age_group} · {selectedReq.region}</span></div>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>상담 방식</span><span>{selectedReq.method} (청춘스럽)</span></div>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>1지망 희망일</span><span>{formatDate(selectedReq.preferred_date1)}</span></div>
                  <div style={styles.infoTableRow}><span style={styles.infoLabel}>2지망 희망일</span><span>{formatDate(selectedReq.preferred_date2)}</span></div>
                </div>

                {selectedReq.concern && (
                  <div style={styles.concernBoxModal}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>💬 청년의 고민 내용</p>
                    <p style={{ fontSize: 13.5, color: '#1E293B', lineHeight: 1.6 }}>{selectedReq.concern}</p>
                  </div>
                )}
              </div>

              {/* 상담사 배정 및 [연/월/일 드롭다운] 매칭 폼 */}
              <div style={styles.assignCol}>
                <h4 style={styles.sectionHeading}>⚙️ 상담사 매칭 & 일정 확정</h4>

                <label style={styles.formFieldLabel}>
                  담당 상담사 배정 <span style={{ color: '#DC2626' }}>*</span>
                  <select
                    style={styles.modalSelect}
                    value={assignCounselorId}
                    onChange={(e) => setAssignCounselorId(e.target.value)}
                  >
                    <option value="">상담사를 선택해 주세요</option>
                    {counselors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} 선생님 ({c.specialty.join(', ')}) {!c.available ? '(부재중)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 확정 상담 일시 (연/월/일 한글 드롭다운 + 퀵 선택 버튼) */}
                <div style={styles.formFieldLabel}>
                  <span>확정 상담 일시 <span style={{ color: '#166534', fontWeight: 700 }}>[캘린더 자동 연동]</span></span>

                  {/* 퀵 선택 버튼 */}
                  <div style={styles.quickDateRow}>
                    {selectedReq.preferred_date1 && (
                      <button
                        type="button"
                        style={styles.quickDateBtn}
                        onClick={() => setDropdownDate(selectedReq.preferred_date1!)}
                      >
                        ⚡ 1지망({formatDate(selectedReq.preferred_date1)})
                      </button>
                    )}
                    {selectedReq.preferred_date2 && (
                      <button
                        type="button"
                        style={styles.quickDateBtn}
                        onClick={() => setDropdownDate(selectedReq.preferred_date2!)}
                      >
                        ⚡ 2지망({formatDate(selectedReq.preferred_date2)})
                      </button>
                    )}
                  </div>

                  {/* ── 100% 한글 [연도 / 월 / 일] 드롭다운 ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 6, marginTop: 4 }}>
                    <select
                      style={styles.dateDropdown}
                      value={assignYear}
                      onChange={(e) => setAssignYear(e.target.value)}
                    >
                      <option value="2026">2026년</option>
                      <option value="2027">2027년</option>
                    </select>

                    <select
                      style={styles.dateDropdown}
                      value={assignMonth}
                      onChange={(e) => setAssignMonth(e.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{parseInt(m, 10)}월</option>
                      ))}
                    </select>

                    <select
                      style={styles.dateDropdown}
                      value={assignDay}
                      onChange={(e) => setAssignDay(e.target.value)}
                    >
                      {Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                        <option key={d} value={d}>{parseInt(d, 10)}일</option>
                      ))}
                    </select>
                  </div>

                  {/* ── 100% 한글 [상담 시간] 드롭다운 ── */}
                  <div style={{ marginTop: 8 }}>
                    <span style={styles.subFieldLabel}>⏰ 상담 시작 시간</span>
                    <select
                      style={styles.modalSelect}
                      value={assignTime}
                      onChange={(e) => setAssignTime(e.target.value)}
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 선택된 날짜 실시간 텍스트 미리보기 */}
                  <div style={styles.selectedPreviewText}>
                    📌 최종 확정: <b>{assignYear}년 {parseInt(assignMonth, 10)}월 {parseInt(assignDay, 10)}일 ({TIME_OPTIONS.find(t => t.value === assignTime)?.label || assignTime})</b>
                  </div>
                </div>

                <label style={styles.formFieldLabel}>
                  상담 관리 메모
                  <textarea
                    rows={3}
                    placeholder="상담 준비사항, 청년과의 통화 내용, 상담 후기 등"
                    style={styles.modalTextarea}
                    value={assignMemo}
                    onChange={(e) => setAssignMemo(e.target.value)}
                  />
                </label>

                <div style={styles.modalActionRow}>
                  <button
                    style={{ ...styles.actionBtnPrimary, background: '#166534', color: '#fff' }}
                    onClick={() => handleSaveAssign('매칭완료')}
                    disabled={isSaving}
                  >
                    {isSaving ? '저장 중...' : '✅ [매칭 완료] 저장하기'}
                  </button>

                  <button
                    style={{ ...styles.actionBtnPrimary, background: '#0C4A6E', color: '#fff' }}
                    onClick={() => handleSaveAssign('상담완료')}
                    disabled={isSaving}
                  >
                    📋 [상담 완료] 처리
                  </button>

                  <button
                    style={{ ...styles.actionBtnPrimary, background: '#991B1B', color: '#fff' }}
                    onClick={() => handleSaveAssign('취소')}
                    disabled={isSaving}
                  >
                    ❌ 신청 취소
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ─── 스타일 상수 ───
const THEME_BLUE = '#1B2A80';
const styles: Record<string, React.CSSProperties> = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF4FA' },
  loginBox: { background: '#fff', borderRadius: 24, padding: '48px 36px', width: 380, boxShadow: '0 20px 40px rgba(27,42,128,0.12)', textAlign: 'center' },
  loginTitle: { fontSize: 22, fontWeight: 800, color: THEME_BLUE, lineHeight: 1.35, marginBottom: 8 },
  loginDesc: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  loginInput: { width: '100%', padding: '12px 16px', border: '1.5px solid #CBD5E1', borderRadius: 12, fontSize: 15, outline: 'none', marginBottom: 12 },
  loginError: { color: '#DC2626', fontSize: 13.5, marginBottom: 12, fontWeight: 600 },
  loginBtn: { width: '100%', padding: '14px', background: THEME_BLUE, color: '#F5B800', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer' },

  dashContainer: { minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' },
  header: { background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'sticky', top: 0, zIndex: 50 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerTitle: { fontSize: 19, fontWeight: 800, color: THEME_BLUE },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  viewToggleGroup: { display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: 4, gap: 4 },
  viewToggleBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: '#64748B', background: 'transparent', cursor: 'pointer', transition: 'all 0.15s' },
  viewToggleBtnActive: { background: THEME_BLUE, color: '#F5B800', boxShadow: '0 2px 6px rgba(27,42,128,0.2)' },

  refreshBtn: { padding: '8px 16px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: THEME_BLUE, cursor: 'pointer' },
  logoutBtn: { padding: '8px 14px', background: '#FEE2E2', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#991B1B', cursor: 'pointer' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '20px 32px 0' },
  statCard: { background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.15s' },
  statLabel: { fontSize: 13.5, fontWeight: 800 },
  statNumber: { fontSize: 26, fontWeight: 900, color: THEME_BLUE },

  mainContent: { padding: '20px 32px 40px' },

  cardContainer: { background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  filterButtonGroup: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterTabBtn: { padding: '6px 14px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 999, fontSize: 13, fontWeight: 700, color: '#64748B', cursor: 'pointer' },
  filterTabBtnActive: { background: THEME_BLUE, color: '#F5B800', borderColor: THEME_BLUE },
  searchInput: { padding: '8px 16px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 13.5, minWidth: 260, outline: 'none' },

  emptyState: { textAlign: 'center', padding: '60px 0' },
  requestGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  requestCard: { background: '#F8FAFC', borderRadius: 16, padding: 18, border: '1.5px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999 },
  catBadge: { fontSize: 12, background: '#EEF2FF', color: THEME_BLUE, fontWeight: 800, padding: '3px 10px', borderRadius: 999 },
  dateText: { fontSize: 12, color: '#94A3B8' },
  cardMainInfo: { borderBottom: '1px solid #E2E8F0', paddingBottom: 8 },
  applicantName: { fontSize: 16, fontWeight: 800, color: '#0F172A' },
  subText: { fontSize: 13, color: '#64748B', fontWeight: 500 },
  contactText: { fontSize: 13, color: '#475569', marginTop: 4 },
  cardDetailBox: { fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 },
  detailLine: { lineHeight: 1.4 },
  detailKey: { color: '#64748B', fontWeight: 600, marginRight: 4 },
  concernPreview: { fontSize: 12.5, color: '#64748B', fontStyle: 'italic', background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', marginTop: 4 },
  cardActionBtn: { marginTop: 'auto', padding: '9px', background: '#fff', border: `1.5px solid ${THEME_BLUE}`, borderRadius: 10, color: THEME_BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'center' },

  calendarContainer: { background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0' },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  calNavBtn: { padding: '7px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer' },
  calTodayBtn: { padding: '7px 14px', background: THEME_BLUE, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#F5B800', cursor: 'pointer' },
  calMonthTitle: { fontSize: 20, fontWeight: 900, color: THEME_BLUE },
  calLegend: { display: 'flex', gap: 12, fontSize: 13, fontWeight: 700, color: '#475569' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: '50%' },

  calWeekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 800, fontSize: 14, padding: '10px 0', borderBottom: '2px solid #E2E8F0' },
  calWeekdayCol: { padding: 4 },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: '1px solid #E2E8F0', borderTop: '1px solid #E2E8F0' },
  calCell: { minHeight: 110, borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: 6, background: '#fff', display: 'flex', flexDirection: 'column' },
  calCellToday: { background: '#FFFDF5' },
  calEmptyCell: { minHeight: 110, borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' },
  calDayNumRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  calDayNum: { fontSize: 13, fontWeight: 800, color: '#334155', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' },
  calDayNumToday: { background: THEME_BLUE, color: '#F5B800' },
  dayEventCount: { fontSize: 11, fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '1px 6px', borderRadius: 999 },
  calEventList: { display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' },
  calEventCard: { padding: '5px 8px', borderRadius: 6, cursor: 'pointer', transition: 'transform 0.1s' },
  eventTime: { fontSize: 11, fontWeight: 800, color: '#1E293B' },
  eventName: { fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 1 },
  eventCounselor: { fontSize: 11, color: '#475569', marginTop: 1 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', padding: 28 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #F1F5F9', paddingBottom: 16, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 900, color: THEME_BLUE },
  modalCloseBtn: { background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: '50%', fontSize: 16, color: '#64748B', cursor: 'pointer', fontWeight: 800 },
  feedbackAlert: { padding: '10px 16px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, border: '1px solid', marginBottom: 16 },

  modalBodyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 },
  infoCol: { background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid #E2E8F0' },
  assignCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  sectionHeading: { fontSize: 15, fontWeight: 800, color: THEME_BLUE, marginBottom: 12 },
  infoTable: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 },
  infoTableRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 6 },
  infoLabel: { color: '#64748B', fontWeight: 600 },
  concernBoxModal: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginTop: 14 },

  formFieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#334155' },
  subFieldLabel: { fontSize: 12, color: '#64748B', fontWeight: 700, marginBottom: 4, display: 'block' },
  modalSelect: { width: '100%', padding: '10px 14px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 14, outline: 'none', background: '#FAFCFF' },
  dateDropdown: { width: '100%', padding: '10px 8px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 14, outline: 'none', background: '#FAFCFF', fontWeight: 600, color: '#1E293B' },
  modalInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 14, outline: 'none', background: '#FAFCFF' },
  modalTextarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 13.5, outline: 'none', resize: 'none', background: '#FAFCFF' },

  quickDateRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  quickDateBtn: { padding: '4px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, fontSize: 12, color: THEME_BLUE, fontWeight: 700, cursor: 'pointer' },
  selectedPreviewText: { fontSize: 12.5, color: '#166534', background: '#DCFCE7', padding: '8px 12px', borderRadius: 8, marginTop: 8, border: '1px solid #86EFAC' },

  modalActionRow: { display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 },
  actionBtnPrimary: { padding: '12px', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.15s' },
};
