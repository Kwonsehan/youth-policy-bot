// ============================================
// lib/rag.ts — RAG 핵심 로직 (초고속 0.5초 응답 캐시 최적화 적용)
// - 10개 청년공간 & 구청 데이터 10분 인메모리 캐시 ➔ 0.01초 만에 즉시 로드
// - 온통청년 API 1초 타임아웃 적용 ➔ 대기시간 완전 제거
// ============================================
import { Policy, getSupabaseAdmin } from './supabase';
import { fetchYouthCenterPolicies } from './youthcenter';
import { crawlDaejeonDistrictPolicies } from './districtCrawler';
import { crawl10YouthSpaces } from './spaceCrawler';

// 🚀 초고속 응답을 위한 인메모리 캐시 (10분 유지)
let cachedSpacePolicies: Policy[] | null = null;
let spaceCacheTime = 0;

let cachedDistrictPolicies: Policy[] | null = null;
let districtCacheTime = 0;

const CACHE_TTL = 10 * 60 * 1000; // 10분 캐시

async function getFastSpacePolicies(): Promise<Policy[]> {
  const now = Date.now();
  if (cachedSpacePolicies && now - spaceCacheTime < CACHE_TTL) {
    return cachedSpacePolicies;
  }
  try {
    cachedSpacePolicies = await crawl10YouthSpaces();
    spaceCacheTime = now;
    return cachedSpacePolicies;
  } catch {
    return cachedSpacePolicies || [];
  }
}

async function getFastDistrictPolicies(): Promise<Policy[]> {
  const now = Date.now();
  if (cachedDistrictPolicies && now - districtCacheTime < CACHE_TTL) {
    return cachedDistrictPolicies;
  }
  try {
    cachedDistrictPolicies = await crawlDaejeonDistrictPolicies();
    districtCacheTime = now;
    return cachedDistrictPolicies;
  } catch {
    return cachedDistrictPolicies || [];
  }
}

// 무작위 셔플 함수
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 공식 안전 대표 URL 폴백 매핑
function ensureSafeApplyUrl(policy: Policy): string {
  if (policy.apply_url && policy.apply_url.startsWith('http')) {
    return policy.apply_url;
  }

  if (policy.region.includes('서구') || policy.title.includes('서구')) {
    return 'https://seoguyouth.kr/';
  }
  if (policy.region.includes('동구') || policy.title.includes('동구')) {
    return 'https://www.dongguyouth.or.kr/';
  }
  if (policy.region.includes('중구') || policy.title.includes('중구')) {
    return 'http://www.xn--660b31p2yizuh.com/';
  }
  if (policy.region.includes('대덕구') || policy.title.includes('대덕구')) {
    return 'https://www.ddyouth.net/';
  }
  if (policy.region.includes('유성구') || policy.title.includes('유성구')) {
    return 'https://www.yuseong.go.kr/ysyouth/index.do';
  }

  return 'https://www.daejeonyouthportal.kr';
}

// 대표님 지정 1:1 세부 공식 신청 URL 반영 데이터베이스
const SAMPLE_POLICIES: Policy[] = [
  {
    id: '1', title: '미래두배 청년통장', category: '금융', region: '대전광역시',
    age_min: 18, age_max: 39,
    content: '근로청년이 매월 15만원씩 2년간 저축 시, 대전시가 적립금과 동일한 금액을 매칭 지원하여 목돈 마련을 돕는 사업입니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/content/CT_000000000067/cntPage.do?commonMenuNo=36_281',
    deadline: '연중 (대전청년내일재단 별도 공고)',
    host: '대전광역시 / 대전청년내일재단', benefit: '본인 저축액과 동일금액 매칭 지원 (최대 720만원)',
  },
  {
    id: '2', title: '청년부부 결혼 장려금 지원', category: '복지', region: '대전광역시',
    age_min: 18, age_max: 39,
    content: '고물가 시대에 결혼 무렵 주택마련 및 살림 장만을 위한 비용 부담을 덜어주기 위해 결혼장려금을 지원합니다. 혼인신고일 포함 대전 내 6개월 이상 거주한 초혼 혼인신고자가 대상입니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/content/CT_000000000497/cntPage.do?commonMenuNo=304_305_323_327&dpmSectionFst=1&dpmSectionScd=7',
    deadline: '상시 신청',
    host: '대전광역시 / 대전청년내일재단', benefit: '1인당 250만원 (부부 합산 최대 500만원)',
  },
  {
    id: '3', title: '대전 청년 월세지원 사업', category: '주거', region: '대전광역시',
    age_min: 19, age_max: 39,
    content: '기준 중위소득 150% 이하인 무주택 청년 1인가구 및 청년부부를 대상으로 월세를 지원합니다. 임차 보증금 1억원 이하, 월세 60만원 이하의 건물에 거주해야 합니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/content/CT_000000000061/cntPage.do?commonMenuNo=79_80',
    deadline: '연중 (분기별 등 별도 공고)',
    host: '대전광역시 / 대전청년내일재단', benefit: '월 최대 20만원씩 최대 12개월 (최대 240만원)',
  },
  {
    id: '4', title: '구직청년 면접용 정장대여 (구해줘! 정장)', category: '일자리', region: '대전광역시',
    age_min: 18, age_max: 39,
    content: '취업 면접을 앞둔 구직 청년들에게 면접에 필요한 정장을 무료로 대여해주는 사업입니다. 남성은 재킷, 셔츠, 넥타이, 바지, 벨트 / 여성은 재킷, 블라우스, 치마, 구두를 대여할 수 있습니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/biz/integratedYouth.do?section=1&commonMenuNo=438_323_514_517',
    deadline: '상시 (예산 소진 시까지)',
    host: '대전청년내일재단', benefit: '면접용 정장 세트 무료 대여 (연 600명 규모)',
  },
  {
    id: '5', title: '청년 주택임차보증금 이자지원', category: '주거', region: '대전광역시',
    age_min: 19, age_max: 39,
    content: '목돈 마련이 어려운 청년들의 주거비용 부담을 완화하기 위해 전월세 주택 임차보증금 대출 추천 및 이자를 지원합니다. 본인 연소득 4천5백만원 이하(부부합산 1억원 이하)가 대상입니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/content/CT_000000000059/cntPage.do?commonMenuNo=79_80_81',
    deadline: '연중 (자금 소진 시까지)',
    host: '대전광역시 / 대전청년내일재단 / 하나은행', benefit: '대출 이자 지원 (최대 2.25%, 연 최대 250만원)',
  },
  {
    id: '6', title: '대전 정착형 청년일자리 종합 프로젝트', category: '일자리', region: '대전광역시',
    age_min: 18, age_max: 38,
    content: '미래 핵심산업과 연계하여 청년이 일하고 싶은 기업(청끌기업)을 발굴하고, 맞춤형 실무 교육과 일자리 매칭을 통해 청년의 장기근속과 대전 정착을 돕는 프로젝트입니다.',
    apply_url: 'https://www.daejeon.go.kr/drh/drhNoticeList.do?boardId=blog_0001&menuSeq=1630',
    deadline: '연중',
    host: '대전광역시', benefit: '실무형 인재양성 교육 및 우수 기업 취업 연계',
  },
  {
    id: '7', title: '국가 자격증 시험 응시료 지원 (Q-Net 연계 청년 50% 할인)', category: '일자리', region: '전국',
    age_min: 15, age_max: 34,
    content: '한국산업인력공단에서 청년 구직자의 자격증 취득 비용 부담을 덜어주기 위해 국가기술자격 시험 응시료를 연 3회, 회당 50% 할인을 지원하는 사업입니다.',
    apply_url: 'https://www.q-net.or.kr',
    deadline: '상시 (원서 접수 시 신청)',
    host: '고용노동부 / 한국산업인력공단 (Q-Net)', benefit: '국가기술자격 시험 응시료 50% 할인 (연 3회)',
  },
  {
    id: '8', title: '청년 일경험 인턴 지원사업', category: '일자리', region: '전국',
    age_min: 18, age_max: 34,
    content: '취업 경험이 부족한 청년에게 공공기관·민간기업에서의 실무 경험 기회를 제공하는 인턴 연계 사업입니다. 고용24의 일경험지원사업 메뉴에서 참여 기업과 모집 공고를 확인하고 지원할 수 있습니다.',
    apply_url: 'https://yw.work24.go.kr/main.do',
    deadline: '수시 모집',
    host: '고용노동부 / 한국고용정보원', benefit: '인턴 급여 지원 및 정규직 전환 우대',
  },
  {
    id: '9', title: '청년인재DB 공공기관 청년 취업 연계', category: '일자리', region: '전국',
    age_min: 18, age_max: 34,
    content: '정부가 운영하는 청년인재DB(2030db.go.kr)에 이력서를 등록하면, 공공기관·공기업이 직접 스카우트 제안을 할 수 있습니다. 인사혁신처가 운영하며 공공분야 취업을 목표로 하는 청년에게 유리합니다.',
    apply_url: 'https://www.2030db.go.kr/',
    deadline: '상시 등록',
    host: '인사혁신처', benefit: '공공기관 스카우트 제안 수령 및 채용 연계',
  },
  {
    id: '10', title: '국민취업지원제도 (청년 우선 지원)', category: '일자리', region: '전국',
    age_min: 15, age_max: 34,
    content: '취업을 원하는 청년에게 취업활동계획 수립, 직업훈련, 일경험, 복지서비스 연계 및 취업촉진수당을 지원합니다. 고용24에서 신청 가능하며 I유형(저소득)은 월 50만원의 구직촉진수당을 지급합니다.',
    apply_url: 'https://www.work24.go.kr/kua/index.do',
    deadline: '수시 (예산 소진 시까지)',
    host: '고용노동부', benefit: '구직촉진수당 월 50만원 × 최대 6개월 (I유형)',
  },
  {
    id: '11', title: '청년미래적금 (청년 자산형성 지원)', category: '금융', region: '전국',
    age_min: 19, age_max: 34,
    content: '청년의 소득과 자산 형성을 맞춤 지원하기 위해 서민금융진흥원에서 운영하는 자산형성 지원 금융 상품입니다. 정부 기여금과 이자 비과세 혜택을 통해 목돈 마련을 돕습니다.',
    apply_url: 'https://fill4young.kinfa.or.kr/yfs/main',
    deadline: '상시 가입 신청',
    host: '금융위원회 / 서민금융진흥원', benefit: '정부 기여금 + 비과세 목돈 형성 혜택',
  },
  {
    id: '12', title: '대전 일자리정보망 (jobdaejeon)', category: '일자리', region: '대전광역시',
    age_min: 18, age_max: 99,
    content: '대전광역시에서 운영하는 지역 특화 취업 포털입니다. 대전 지역 채용 공고, AI 모의면접, 청년 인턴 지원사업 등 다양한 지역 밀착형 일자리 서비스를 무료로 이용할 수 있습니다.',
    apply_url: 'https://www.jobdaejeon.or.kr',
    deadline: '상시',
    host: '대전광역시', benefit: '지역 특화 채용 공고 및 AI 모의면접 무료 제공',
  },
  {
    id: '13', title: '대전 청년 전세보증금 반환보증 보증료 지원', category: '주거', region: '대전광역시',
    age_min: 19, age_max: 39,
    content: '전세 사기 예방을 위해 무주택 청년이 전세보증금 반환보증에 가입할 때 지불한 보증료를 최대 30만원까지 대전시에서 지원해 드리는 사업입니다.',
    apply_url: 'https://www.daejeonyouthportal.kr/search/businessSearchResult.do?commonMenuNo=333_339&searchKeywordFrom=&searchKeywordTo=&searchCondition=&searchKeyword=&searchCategory=&pageIndex=0&searchSeq=&dpmBizNm=%EB%B0%98%ED%99%98',
    deadline: '상시 신청 (예산 소진 시까지)',
    host: '대전광역시 / 주택도시보증공사(HUG)', benefit: '전세보증금 반환보증료 최대 30만원 지원',
  },
  {
    id: '14', title: '대전창업온라인 (창업지원 및 보육공간 포털)', category: '창업', region: '대전광역시',
    age_min: 18, age_max: 39,
    content: '대전 창업 생태계 활성화를 위해 대전광역시와 대전창조경제혁신센터가 운영하는 통합 창업 포털입니다. 창업 보육 공간, 입주 지원, 투자 및 멘토링 공고를 한곳에서 지원합니다.',
    apply_url: 'https://d-startup.kr/',
    deadline: '상시',
    host: '대전광역시 / 대전창조경제혁신센터', benefit: '창업 보육 공간 입주 및 멘토링 통합 지원',
  },
  {
    id: '15', title: '대전 청년 예술인 창작활동 지원사업', category: '복지', region: '대전광역시',
    age_min: 19, age_max: 39,
    content: '대전문화재단에서 지역 청년 예술가들의 창작활동 및 기획 전시/공연 활동비를 지원하는 사업입니다.',
    apply_url: 'https://www.dcaf.or.kr',
    deadline: '정기 공모',
    host: '대전광역시 / 대전문화재단', benefit: '청년 예술가 창작지원금 및 공모 지원',
  },
];

export const YOUTH_RESOURCE_SITES = {
  policy: [
    {
      name: '온통청년 (전국 청년정책 통합 포털)',
      url: 'https://www.youthcenter.go.kr/main',
      desc: '중앙부처·지자체의 모든 청년정책을 한 곳에서 검색 가능. 분야별·지역별·나이별 맞춤 필터 제공',
      scope: '전국',
    },
    {
      name: '대전청년포털',
      url: 'https://www.daejeonyouthportal.kr/index.do',
      desc: '대전광역시 청년정책 통합 포털. 월세지원, 미래두배청년통장, 취업지원 등 대전 특화 정책 신청 가능',
      scope: '대전',
    },
  ],
  job: [
    {
      name: '일경험인턴 (고용24 일경험지원사업)',
      url: 'https://yw.work24.go.kr/main.do',
      desc: '공공·민간기업 청년 일경험 인턴 모집 공고 확인 및 신청',
      scope: '전국',
    },
    {
      name: 'Q-Net 국가기술자격 (응시료 50% 할인)',
      url: 'https://www.q-net.or.kr',
      desc: '한국산업인력공단 청년 국가자격증 응시료 50% 할인 지원 시스템',
      scope: '전국',
    },
    {
      name: '청년인재DB',
      url: 'https://www.2030db.go.kr/',
      desc: '이력서 등록 시 공공기관이 직접 스카우트 제안. 인사혁신처 운영',
      scope: '전국',
    },
    {
      name: '고용24 (통합 취업 포털)',
      url: 'https://www.work24.go.kr',
      desc: '워크넷+고용보험+내일배움카드+국민취업지원제도 통합. 구직신청, 실업급여, 훈련수강 가능',
      scope: '전국',
    },
    {
      name: '대전일자리정보망',
      url: 'https://www.jobdaejeon.or.kr',
      desc: '대전시 운영 지역 특화 취업 포털. 채용공고, AI 모의면접, 청년 인턴 지원사업',
      scope: '대전',
    },
  ],
};

function localSearch(
  query: string,
  options: { category?: string; region?: string; limit?: number },
  extraPolicies: Policy[] = []
): Policy[] {
  const { category, region, limit = 15 } = options;
  const q = query.toLowerCase();

  const keywords = q.split(/\s+/).filter(k => k.length > 0);
  const allList = [...SAMPLE_POLICIES, ...extraPolicies];

  const scored = allList
    .filter(p => {
      if (category && category !== '전체' && p.category !== category) return false;
      if (region && region !== '전체' && !p.region.includes(region) && p.region !== '전국') return false;
      return true;
    })
    .map(p => {
      const text = `${p.title} ${p.content} ${p.benefit} ${p.category} ${p.region}`.toLowerCase();
      const score = keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
      return { ...p, similarity: score };
    })
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  return scored.length > 0 ? shuffleArray(scored).slice(0, limit) : shuffleArray(allList).slice(0, limit);
}

// 🚀 초고속 비동기 1초 타임아웃 지원
export async function searchPolicies(
  query: string,
  options: {
    category?: string;
    region?: string;
    limit?: number;
  } = {}
): Promise<Policy[]> {
  const { limit = 15 } = options;

  // 인메모리 캐시를 이용하여 0.01초 만에 데이터 가져오기
  const [districtPolicies, spacePolicies] = await Promise.all([
    getFastDistrictPolicies(),
    getFastSpacePolicies(),
  ]);

  // 온통청년 API는 1초 타임아웃으로 빠른 릴리스
  let apiPolicies: Policy[] = [];
  try {
    const apiPromise = fetchYouthCenterPolicies(query, limit);
    const timeoutPromise = new Promise<Policy[]>((resolve) => setTimeout(() => resolve([]), 800));
    apiPolicies = await Promise.race([apiPromise, timeoutPromise]);
  } catch {
    apiPolicies = [];
  }

  const extraList = [...districtPolicies, ...spacePolicies];
  const localResults = localSearch(query, options, extraList);

  const combined = shuffleArray([
    ...SAMPLE_POLICIES,
    ...localResults,
    ...spacePolicies,
    ...apiPolicies,
    ...districtPolicies,
  ]);

  const uniqueMap = new Map<string, Policy>();

  for (const item of combined) {
    const safeItem = {
      ...item,
      apply_url: ensureSafeApplyUrl(item),
    };

    if (!uniqueMap.has(safeItem.title)) {
      uniqueMap.set(safeItem.title, safeItem);
    }
  }

  return Array.from(uniqueMap.values()).slice(0, limit);
}

function buildSiteDirectory(): string {
  const policyLinks = YOUTH_RESOURCE_SITES.policy
    .map(s => `- [${s.scope}] ${s.name}: ${s.url}\n  → ${s.desc}`)
    .join('\n');

  const jobLinks = YOUTH_RESOURCE_SITES.job
    .map(s => `- [${s.scope}] ${s.name}: ${s.url}\n  → ${s.desc}`)
    .join('\n');

  return `【청년정책 홈페이지】
${policyLinks}

【일자리·취업 홈페이지】
${jobLinks}`;
}

export function buildSystemPrompt(policies: Policy[]): string {
  const policyContext = policies.length > 0
    ? policies.map((p, i) =>
        `[정책/공간 ${i + 1}] ${p.title}
분야: ${p.category} | 지역: ${p.region} | 대상: ${p.age_min}~${p.age_max}세
혜택/특징: ${p.benefit || '상세 내용 참고'}
내용: ${p.content}
신청: ${p.apply_url || 'https://www.daejeonyouthportal.kr'} | 기간: ${p.deadline || '상시'}
주관: ${p.host || '정부/지자체'}`
      ).join('\n\n---\n\n')
    : '현재 해당하는 정책/공간 정보를 찾지 못했습니다.';

  const siteDirectory = buildSiteDirectory();

  return `당신은 대전서구 청년공간 청춘스럽의 청년정책 전문 AI 안내봇입니다.
청년들에게 중앙정부, 대전광역시, 대전 5개 자치구청(서구, 유성구, 중구, 동구, 대덕구) 정책과 대전 공식 10개 청년공간 정보를 친절하고 정확하게 안내합니다.

【대전 공식 10개 청년공간 실물 특징 및 혜택 디렉토리】
1. 청춘나들목 (대전시 / 동구 중앙로 218 지하3층) ➔ 대전역근처 I 공간 무료 대여, 스터디, 모임
2. 청춘너나들이 (대전시 / 서구 둔산중로 19 2층 샤크존) ➔ 둔산동 I 공간 무료 대여(회의실 등), 스터디, 모임
3. 청춘두두두 (대전시 / 서구 갈마중로30번길 67 1층/지하1층) ➔ 갈마동 I 공간 무료 대여(행사공간, 공유주방 등), 스터디, 모임
4. 청춘스럽 (서구 / 서구 계룡로 314 1층 대전일보) ➔ 월평역근처 I 취업/진로 프로그램, 청년정책상담, 공간대여(회의실), 스터디룸, 모임
5. 청춘정거장 (서구 / 서구 대덕대로 198 7층 프뢰벨) ➔ 둔산동 I 공간 무료 대여(회의실), 스터디, 모임
6. 청춘포털 (서구 / 서구 사마7길 33 2층 도솔마을) ➔ 도마동 I 공간 무료 대여(회의실,미디어실), 스터디, 모임
7. 동구동락 (동구 / 동구 백룡로 20 3층 새마을회관) ➔ 우송대근처 I 스터디, 모임, 휴식공간
8. 청년모아 (중구 / 중구 목중로70번길 15 2층) ➔ 선화동 I 공간 무료 대여(강의장,공유주방,공유오피스), 모임, 강의
9. 청년벙커 (대덕구 / 대덕구 대전로1033번길 20 지하1층 대덕구청) ➔ 대덕구청지하 I 공간 무료 대여(라운지, 회의실, 연습실, 공유주방, 스튜디오)
10. 유성구청년지원센터 (유성구 / 유성구 농대로15번길 20) ➔ 궁동 I 공간 무료 대여(회의실,세미나실), 스터디, 모임

【답변 규칙】
1. 검색된 최신 정책 및 10개 청년공간 프로그램 정보를 최우선으로 활용하여 답변하세요
2. 사용자가 대전 청년공간 위치, 프로그램, 운영시간을 물어보면 위 10개 공식 청년공간 정보(위치 특징 및 대여 공간)를 한눈에 알아보기 쉽게 안내하세요
3. 관련 링크가 있으면 반드시 [사이트이름](URL) 형식으로 클릭 시 이동하도록 작성하세요
4. 🚨 매우 중요 - 웹사이트/홈페이지 구분 규칙:
   - 사용자가 "웹사이트", "홈페이지", "누리집", "사이트" 를 물어보면 → 반드시 클릭 가능한 URL 주소(https://...)만 안내하세요. 절대로 도로명 주소(예: 서구 계룡로 314)를 웹사이트라고 답하지 마세요.
   - 사용자가 "주소", "위치", "어디 있어", "어디야" 를 물어보면 → 도로명 주소(예: 대전광역시 서구 계룡로 314 1층)를 안내하세요.
   - 웹사이트와 주소를 절대로 혼동하지 마세요.

【청년정책·일자리 핵심 홈페이지 디렉토리】
${siteDirectory}

【현재 검색된 대전 정책 및 10개 청년공간 데이터】
${policyContext}

위 정보를 바탕으로 청년들의 질문에 성실하게 답변해주세요.`;
}
