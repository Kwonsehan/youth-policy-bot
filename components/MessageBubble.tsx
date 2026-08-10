'use client';
// ============================================
// components/MessageBubble.tsx
// 개별 대화 말풍선 컴포넌트
// - 맞춤 설정 안함 ➔ '💡 추천 정책 TOP 2'
// - 맞춤 설정 함 ➔ '💡 맞춤 추천 정책 TOP 2'
// ============================================

import PolicyCard from './PolicyCard';
import { Policy } from '@/lib/supabase';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  policies?: Policy[];
  isStreaming?: boolean;
  isCustomFiltered?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

// 텍스트 내 URL 링크 및 마크다운 링크 파싱 처리
function formatContent(text: string) {
  if (!text) return null;

  // [텍스트](URL) 마크다운 링크 변환
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-link"
      >
        {label}
      </a>
    );
    lastIndex = markdownLinkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.length > 0 ? parts : text}
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-assistant'}`}>
      {/* 아바타 아이콘 */}
      <div className={`avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        {isUser ? '👤' : <img src="/logo.png" alt="루미 캐릭터 로고" className="avatar-logo-img" />}
      </div>

      <div className="message-content-area">
        {/* 대화 말풍선 */}
        <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
          {/* AI 응답 스트리밍 전 바운싱 로딩 표시 */}
          {!isUser && !message.content && message.isStreaming ? (
            <div className="ai-loading-container">
              <span className="loading-text">정책 정보를 찾고 있어요</span>
              <div className="typing-dots">
                <span className="dot dot1" />
                <span className="dot dot2" />
                <span className="dot dot3" />
              </div>
            </div>
          ) : (
            formatContent(message.content)
          )}

          {/* 스트리밍 작성 커서 */}
          {!isUser && message.isStreaming && message.content && (
            <span className="streaming-pulse-cursor" />
          )}
        </div>

        {/* 조건부 추천 정책 카드 렌더링 */}
        {!isUser && message.policies && message.policies.length > 0 && (
          <div className="related-policies">
            <h4 className="related-title">
              {message.isCustomFiltered ? '💡 맞춤 추천 정책 TOP 2' : '💡 추천 정책 TOP 2'}
            </h4>
            <div className="policy-cards-grid">
              {message.policies.slice(0, 2).map((policy, idx) => (
                <PolicyCard key={policy.id || idx} policy={policy} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
