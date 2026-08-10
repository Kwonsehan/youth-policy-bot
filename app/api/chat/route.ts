// ============================================
// app/api/chat/route.ts — AI 대화 스트리밍 & 다채로운 무작위 추천 정책 카드 API
// - 특정 구청 데이터 독점 방지: 대전시 대표 정책, 청년공간, 자치구 정책 15개 셔플
// - 맞춤 설정 안함 ➔ '💡 추천 정책 TOP 2' (매번 다채로운 2개 노출)
// - 맞춤 설정 함 ➔ '💡 맞춤 추천 정책 TOP 2' (맞춤 조건 2개 노출)
// ============================================

import { getOpenAIClient } from '@/lib/openai';
import { searchPolicies, buildSystemPrompt } from '@/lib/rag';
import { UserSituationFilter } from '@/components/PolicyFilter';
import { Policy } from '@/lib/supabase';

export const runtime = 'nodejs';

// 배열 요소를 무작위 셔플하는 Fisher-Yates 알고리즘
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 사용자가 맞춤 필터를 설정했는지 여부 검사 함수
function isCustomFilterApplied(filter?: UserSituationFilter): boolean {
  if (!filter) return false;
  const isRegionSet = filter.region && filter.region !== '선택하세요.';
  const isMaritalSet = filter.maritalStatus && filter.maritalStatus !== '선택하세요.';
  const isAgeSet = Boolean(filter.age && filter.age.trim() !== '');
  const isIncomeSet = Boolean((filter.incomeMin && filter.incomeMin.trim() !== '') || (filter.incomeMax && filter.incomeMax.trim() !== ''));
  const isEduSet = filter.education && filter.education !== '제한없음';
  const isMajorSet = filter.major && filter.major !== '제한없음';
  const isEmpSet = filter.employmentStatus && filter.employmentStatus !== '제한없음';
  const isSpecSet = filter.specialty && filter.specialty !== '제한없음';

  return Boolean(
    isRegionSet || isMaritalSet || isAgeSet || isIncomeSet ||
    isEduSet || isMajorSet || isEmpSet || isSpecSet
  );
}

export async function POST(req: Request) {
  try {
    const { messages, filter } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '메시지가 비어있습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const isCustomFiltered = isCustomFilterApplied(filter);

    // RAG 정책 검색 (풍부한 셔플을 위해 15개까지 폭넓게 수집)
    const rawPolicies = await searchPolicies(lastUserMessage, {
      category: filter?.category && filter.category !== '전체' ? filter.category : undefined,
      region: filter?.region && filter.region !== '선택하세요.' ? filter.region : undefined,
      limit: 15,
    });

    // 특정 카드가 고정 노출되는 현상을 완전히 해결하기 위한 강력한 무작위 셔플
    let top2Policies: Policy[] = [];

    if (rawPolicies.length > 0) {
      const shuffled = shuffleArray(rawPolicies);
      top2Policies = shuffled.slice(0, 2);
    }

    const systemPrompt = buildSystemPrompt(rawPolicies);
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 600,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // 1. 매번 다채롭게 무작위 셔플된 추천 정책 카드 2개 클라이언트로 전달
        const policyEvent = `data: ${JSON.stringify({
          type: 'policies',
          policies: top2Policies,
          isCustomFiltered,
        })}\n\n`;
        controller.enqueue(encoder.encode(policyEvent));

        // 2. OpenAI 스트리밍 텍스트 전달
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            const textEvent = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
            controller.enqueue(encoder.encode(textEvent));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('채팅 API 오류:', error);
    return new Response(JSON.stringify({ error: '서버 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
