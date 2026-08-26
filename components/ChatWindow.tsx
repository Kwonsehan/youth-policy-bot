'use client';
// ============================================
// components/ChatWindow.tsx
// 대전서구 청년공간 '청춘스럽 정책안내 AI봇' 100% 전용 컴포넌트
// 브랜드: 딥블루 #1B2A80 | 로고: 청춘's love 공식 실물 로고
// 탭 순서: 💼 일자리·취업 (첫번째 고정)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble, { Message } from './MessageBubble';
import ConsultationModal from './ConsultationModal';
import { Policy } from '@/lib/supabase';

// 청춘스럽 전용 카테고리 탭 타입 (💼 일자리 첫번째 고정)
export type CategoryTab = '일자리' | '주거금융' | '창업복지' | '청년공간';

export interface CategoryTabInfo {
  id: CategoryTab;
  label: string;
  shortLabel: string;
  icon: string;
}

// 탭 순서: 💼 일자리·취업 → 🏠 주거·금융 → 🚀 창업·복지 → 🏛️ 대전 청년공간
export const CATEGORY_TABS: CategoryTabInfo[] = [
  { id: '일자리', label: '일자리·취업', shortLabel: '일자리·취업', icon: '💼' },
  { id: '주거금융', label: '주거·금융', shortLabel: '주거·금융', icon: '🏠' },
  { id: '창업복지', label: '창업·복지', shortLabel: '창업·복지', icon: '🚀' },
  { id: '청년공간', label: '대전 청년공간', shortLabel: '청년공간', icon: '🏛️' },
];

export const CATEGORY_QUESTION_POOLS: Record<CategoryTab, string[]> = {
  '일자리': [
    '취업관련 홈페이지 알려줘',
    '대전 청년 취업 지원 프로그램 알려줘',
    '대전 청년 무료 면접 정장 대여(구해줘! 정장) 신청법',
    '청년내일채움공제 자격 조건 및 신청법',
    '청년 일경험 인턴 지원사업 신청 방법',
    '청년인재DB 등록하고 공공기관 인턴하는 법',
    '국민취업지원제도 구직촉진수당 자격 조건',
    '대전일자리정보망(대전청년인턴) 홈페이지 알려줘',
  ],
  '주거금융': [
    '대전 청년 월세 지원 금액이랑 기간 알려줘',
    '대전 청년 주택 임차보증금 이자 지원 조건',
    '미래두배 청년통장 자격 조건이 뭐야?',
    '청년미래적금 가입 조건 및 혜택 알려줘',
    '대전 청년 전세보증금 반환보증 보증료 지원',
    '대전 무주택 청년 주거 정책 추천해줘',
    '대전 청년부부 결혼 장려금(최대 500만원) 신청 자격',
  ],
  '창업복지': [
    '대전창업온라인 홈페이지 알려줘',
    '국가기술자격증 시험 응시료 50% 할인(Q-Net) 신청법',
    '대전 청년 마음건강 무료 심리상담 신청법',
    '대전 청년 예술인 창작 활동 지원사업 알려줘',
  ],
  '청년공간': [
    '대전 서구 청년공간 청춘스럽 위치와 프로그램',
    '대전 공식 10개 청년공간 전체 리스트 알려줘',
    '대전역 지하 청춘나들목 이용 방법',
    '대덕구 청년벙커 밴드연습실/요가 공간대여 신청',
    '둔산동 청춘너나들이 회의실 예약',
    '갈마동 청춘두두두 활동공간 예약',
    '유성구청년지원센터 위치와 프로그램',
    '서구 청춘포털 이용 방법 및 커뮤니티 공간 안내',
  ],
};

// 현재 탭에서 무작위 3개 질문 추출
function getRandomThreeForCategory(cat: CategoryTab): string[] {
  const pool = CATEGORY_QUESTION_POOLS[cat];
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(3, pool.length));
}

export default function ChatWindow() {
  // 청춘스럽 정책안내 AI봇 전용 첫 인사말
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: `안녕하세요! 👋\n**청춘스럽 정책안내 AI봇**입니다.\n\n대전 청년들을 위해 일자리, 주거, 교육, 창업, 복지, 금융 정책 정보와 대전 10개 청년공간 소식을 정확하고 친절하게 안내해 드려요.\n\n하단 분야별 탭을 클릭하여 궁금한 내용을 바로 물어보세요. 😊`,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 기본 활성 탭: 💼 일자리·취업 (첫번째 고정)
  const [activeCategoryTab, setActiveCategoryTab] = useState<CategoryTab>('일자리');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [sessionId] = useState(() => uuidv4());
  // 정책 상담 신청 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setSuggestedQuestions(getRandomThreeForCategory(activeCategoryTab));
  }, [activeCategoryTab]);

  const handleRefreshQuestions = () => {
    setSuggestedQuestions(getRandomThreeForCategory(activeCategoryTab));
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 질문 클릭/전송 시 추천 질문 탭 자동 접힘
    setIsSuggestionsOpen(false);

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantId = uuidv4();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text.trim() },
          ],
          sessionId,
          filter: {},
        }),
      });

      if (!response.ok) throw new Error('API 오류');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let relatedPolicies: Policy[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'policies') {
              relatedPolicies = parsed.policies;
            } else if (parsed.type === 'text') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.content }
                    : m
                )
              );
            }
          } catch {
            // 파싱 에러 무시
          }
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, isStreaming: false, policies: relatedPolicies }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: '죄송합니다. 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요. 🙏', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, sessionId, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-container">

      {/* ========== 헤더: 청춘스럽 딥블루 #1B2A80 브랜드 고정 ========== */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-title-group">
            {/* 청춘's love 공식 실물 로고 */}
            <div className="header-logo-container">
              <img
                src="/logo.png?v=3000"
                alt="대전서구 청년공간 청춘스럽 로고"
                className="header-logo-img"
              />
            </div>
            <h1 className="header-main-text">
              <span>청춘스럽 정책안내 AI봇</span>
            </h1>
          </div>
        </div>
        {/* 정책 상담 신청 버튼 → 클릭 시 모달 오픈 */}
        <button
          className="filter-toggle"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="btn-full-text">📋 정책 상담 신청</span>
          <span className="btn-short-text">📋 상담 신청</span>
        </button>
      </header>

      {/* 정책 상담 신청 모달 */}
      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* ========== 메시지 대화 영역 ========== */}
      <main className="messages-area">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </main>

      {/* ========== 추천 질문 탭 (질문 클릭 시 자동 접힘) ========== */}
      <div className="suggestions">
        <div className="suggestions-header">
          <button
            type="button"
            className="suggestions-toggle-btn"
            onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
          >
            <span className="suggestions-label">💬 이런 것들을 물어볼 수 있어요</span>
            <span className="toggle-icon">{isSuggestionsOpen ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>

          {isSuggestionsOpen && (
            <button
              type="button"
              className="refresh-btn"
              onClick={handleRefreshQuestions}
              title="현재 분야 질문 새로고침"
            >
              🔄 새로고침
            </button>
          )}
        </div>

        {isSuggestionsOpen && (
          <div className="suggestions-content">
            {/* 탭 순서: 💼 일자리·취업 → 🏠 주거·금융 → 🚀 창업·복지 → 🏛️ 대전 청년공간 */}
            <div className="category-tab-bar">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`category-tab-btn ${activeCategoryTab === tab.id ? 'active-cat-tab' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label-full">{tab.label}</span>
                  <span className="tab-label-short">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className="suggestions-grid-3">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  className="suggestion-chip"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== 입력창 ========== */}
      <footer className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="청년정책에 대해 무엇이든 물어보세요 :)"
            className="input-textarea"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="send-btn"
          >
            {isLoading ? (
              <span className="loading-dots">
                <span /><span /><span />
              </span>
            ) : (
              '↑'
            )}
          </button>
        </div>
        <p className="input-hint">AI 답변은 참고용이며, 정확한 정보는 해당 기관에 확인하세요</p>
      </footer>

    </div>
  );
}
