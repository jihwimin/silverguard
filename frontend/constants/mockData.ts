export interface TrainingQuestion {
  id: number;
  scenario: string;
  choices: { text: string; isCorrect: boolean }[];
  explanation: string;
  summary: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GuardianAlert {
  id: string;
  riskLevel: number;
  type: string;
  title: string;
  time: string;
  description: string;
  recommendedAction: string;
  riskType: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
  card?: {
    title: string;
    items: string[];
    keywords?: string[];
  };
}

export const trainingQuestions: TrainingQuestion[] = [
  {
    id: 1,
    scenario: "지금 '검찰'이라며 송금을 재촉해요. 어떻게 할까요?",
    choices: [
      { text: "전화를 끊고 대표번호로 확인", isCorrect: true },
      { text: "요구대로 송금", isCorrect: false },
      { text: "개인정보 전달", isCorrect: false },
    ],
    explanation: "검찰, 경찰 등 기관은 전화로 송금을 요구하지 않습니다. 반드시 대표번호로 직접 확인하세요.",
    summary: "기관을 사칭하면 대표번호로 직접 확인이 기본입니다.",
    difficulty: 'easy',
  },
  {
    id: 2,
    scenario: "'금융감독원'에서 계좌가 범죄에 연루됐다며 '안전계좌'로 이체하라고 합니다.",
    choices: [
      { text: "즉시 안전계좌로 이체", isCorrect: false },
      { text: "전화 끊고 금감원 1332로 확인", isCorrect: true },
      { text: "계좌번호와 비밀번호 알려줌", isCorrect: false },
    ],
    explanation: "'안전계좌'라는 것은 존재하지 않습니다. 금감원은 전화로 계좌이체를 요구하지 않습니다.",
    summary: "'안전계좌'는 존재하지 않으며, 기관의 공식 번호로 직접 확인하세요.",
    difficulty: 'easy',
  },
  {
    id: 3,
    scenario: "택배 미수령 문자와 함께 링크가 왔어요. 클릭해볼까요?",
    choices: [
      { text: "링크를 눌러 확인", isCorrect: false },
      { text: "택배사 공식 앱에서 직접 확인", isCorrect: true },
      { text: "답장으로 개인정보 전달", isCorrect: false },
    ],
    explanation: "문자 속 링크는 악성 앱 설치로 이어질 수 있습니다. 항상 공식 앱이나 홈페이지에서 확인하세요.",
    summary: "문자 속 링크는 절대 누르지 말고, 공식 경로로 확인하세요.",
    difficulty: 'medium',
  },
  {
    id: 4,
    scenario: "자녀를 사칭해 '폰이 고장났다'며 카카오톡으로 송금을 요청합니다.",
    choices: [
      { text: "바로 송금", isCorrect: false },
      { text: "자녀에게 직접 전화해서 확인", isCorrect: true },
      { text: "신분증 사진 전송", isCorrect: false },
    ],
    explanation: "가족을 사칭하는 메신저 피싱이 급증하고 있습니다. 반드시 직접 전화로 본인 확인을 하세요.",
    summary: "가족 사칭 메시지는 반드시 직접 통화로 확인하세요.",
    difficulty: 'medium',
  },
  {
    id: 5,
    scenario: "'대출 금리 인하'를 위해 기존 대출을 먼저 상환하라며 송금을 요구합니다.",
    choices: [
      { text: "대출 상환 후 저금리 전환", isCorrect: false },
      { text: "개인정보와 계좌정보 전달", isCorrect: false },
      { text: "해당 금융기관에 직접 방문하여 확인", isCorrect: true },
    ],
    explanation: "정상적인 금융기관은 대출 전환을 위해 선입금을 요구하지 않습니다.",
    summary: "대출 관련 선입금 요구는 100% 사기입니다.",
    difficulty: 'hard',
  },
  {
    id: 6,
    scenario: "경찰이라며 '개인정보가 유출됐으니 원격제어 앱을 설치하라'고 합니다.",
    choices: [
      { text: "앱을 설치하고 원격 접속 허용", isCorrect: false },
      { text: "전화를 끊고 112에 직접 확인", isCorrect: true },
      { text: "요구하는 정보 모두 전달", isCorrect: false },
    ],
    explanation: "경찰은 원격제어 앱 설치를 절대 요구하지 않습니다. 원격 접속을 허용하면 금융정보가 탈취됩니다.",
    summary: "수사기관은 원격제어 앱 설치를 요구하지 않습니다.",
    difficulty: 'hard',
  },
];

export const guardianAlerts: GuardianAlert[] = [
  {
    id: '1',
    riskLevel: 91,
    type: '통화',
    title: '기관 사칭 의심 통화 감지',
    time: '방금',
    description: '발신번호가 검찰청 대표번호와 유사하나, 실제 기관 번호와 불일치합니다. 송금 요구 키워드가 다수 감지되었습니다.',
    recommendedAction: '통화를 즉시 종료하고, 해당 기관의 대표번호(1301)로 직접 확인하세요.',
    riskType: '기관 사칭',
  },
  {
    id: '2',
    riskLevel: 78,
    type: '스미싱',
    title: '택배 사칭 스미싱 문자 감지',
    time: '32분 전',
    description: '알 수 없는 발신번호에서 URL 링크가 포함된 택배 안내 문자가 수신되었습니다.',
    recommendedAction: '문자 내 링크를 절대 클릭하지 마시고, 택배사 공식 앱에서 확인하세요.',
    riskType: '스미싱',
  },
  {
    id: '3',
    riskLevel: 85,
    type: '송금',
    title: '위험 계좌 송금 시도 차단',
    time: '2시간 전',
    description: '보이스피싱 신고 이력이 있는 계좌로의 송금이 시도되어 자동 차단되었습니다.',
    recommendedAction: '해당 계좌로의 송금을 중단하고, 거래 상대방을 재확인하세요.',
    riskType: '위험 송금',
  },
  {
    id: '4',
    riskLevel: 45,
    type: '통화',
    title: '의심 키워드 감지 통화',
    time: '어제',
    description: '통화 중 "계좌번호", "이체" 등 금융 관련 키워드가 반복 감지되었습니다.',
    recommendedAction: '통화 내용을 재확인하고, 의심스러운 경우 가족이나 경찰에 상담하세요.',
    riskType: '의심 통화',
  },
];

export const chatbotQuickReplies = [
  '기관 사칭 같아요',
  '송금 요구',
  '문자 링크',
  '통화 중이에요',
  '이미 송금했어요',
];

export const chatbotInitialMessage: ChatMessage = {
  id: '0',
  text: '상황을 간단히 알려주시면 신고에 필요한 문구와 다음 행동을 정리해 드립니다.',
  isBot: true,
  timestamp: '지금',
};

export const chatbotResponses: Record<string, ChatMessage[]> = {
  '기관 사칭 같아요': [
    {
      id: 'r1',
      text: '기관 사칭 피싱이 의심됩니다. 아래 신고 요약을 확인해 주세요.',
      isBot: true,
      timestamp: '지금',
      card: {
        title: '신고 요약',
        items: [
          '유형: 기관 사칭 (검찰/경찰/금감원)',
          '상황: 전화로 금전 요구 또는 개인정보 요청',
          '권장 조치: 즉시 통화 종료 → 112 신고',
        ],
        keywords: ['기관사칭', '전화금융사기', '검찰사칭'],
      },
    },
  ],
  '송금 요구': [
    {
      id: 'r2',
      text: '송금 요구를 받으셨군요. 절대 송금하지 마세요. 아래 내용을 확인해 주세요.',
      isBot: true,
      timestamp: '지금',
      card: {
        title: '신고 요약',
        items: [
          '유형: 송금 요구 사기',
          '상황: 전화/문자로 긴급 송금 요구',
          '권장 조치: 송금 중단 → 112 또는 금감원 1332 신고',
        ],
        keywords: ['송금요구', '긴급이체', '안전계좌'],
      },
    },
  ],
  '문자 링크': [
    {
      id: 'r3',
      text: '스미싱 문자가 의심됩니다. 링크를 클릭하지 마세요.',
      isBot: true,
      timestamp: '지금',
      card: {
        title: '신고 요약',
        items: [
          '유형: 스미싱 (문자 피싱)',
          '상황: 의심스러운 URL 링크 포함 문자',
          '권장 조치: 링크 미클릭 → 문자 삭제 → 118 신고',
        ],
        keywords: ['스미싱', '악성링크', '택배사칭'],
      },
    },
  ],
  '통화 중이에요': [
    {
      id: 'r4',
      text: '지금 통화 중이시라면, 침착하게 전화를 끊으세요. 진짜 기관이라면 다시 연락이 옵니다.',
      isBot: true,
      timestamp: '지금',
    },
  ],
  '이미 송금했어요': [
    {
      id: 'r5',
      text: '빠른 대응이 필요합니다. 아래 단계를 즉시 따라해 주세요.',
      isBot: true,
      timestamp: '지금',
      card: {
        title: '긴급 대응 가이드',
        items: [
          '1. 즉시 해당 은행 고객센터에 전화 → 지급정지 요청',
          '2. 112에 전화하여 피해 신고',
          '3. 금감원 1332에 피해 상담',
          '4. 경찰서 방문하여 피해 신고서 작성',
        ],
        keywords: ['지급정지', '피해신고', '긴급대응'],
      },
    },
  ],
};
