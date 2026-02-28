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
    scenario: "Someone claiming to be the 'prosecutor's office' is pressuring you to transfer money. What do you do?",
    choices: [
      { text: "Hang up and verify via the official hotline", isCorrect: true },
      { text: "Transfer as requested", isCorrect: false },
      { text: "Share personal information", isCorrect: false },
    ],
    explanation: "Real prosecutors and police never ask for money over the phone. Always verify through the official hotline.",
    summary: "When someone impersonates an agency, verify via the official number first.",
    difficulty: 'easy',
  },
  {
    id: 2,
    scenario: "'Financial Supervisory Service' says your account is linked to crime and asks you to transfer to a 'safe account'.",
    choices: [
      { text: "Transfer to the safe account immediately", isCorrect: false },
      { text: "Hang up and verify via the official number (1332)", isCorrect: true },
      { text: "Give account number and password", isCorrect: false },
    ],
    explanation: "'Safe accounts' do not exist. The FSS never asks for transfers over the phone.",
    summary: "There is no 'safe account'—always verify with the agency's official number.",
    difficulty: 'easy',
  },
  {
    id: 3,
    scenario: "You got a text about an undelivered package with a link. Should you click it?",
    choices: [
      { text: "Click the link to check", isCorrect: false },
      { text: "Check via the courier's official app", isCorrect: true },
      { text: "Reply with personal information", isCorrect: false },
    ],
    explanation: "Links in texts can lead to malicious app installs. Always check via the official app or website.",
    summary: "Never click links in texts—verify through official channels.",
    difficulty: 'medium',
  },
  {
    id: 4,
    scenario: "Someone pretending to be your child says 'my phone broke' and asks for money via messaging app.",
    choices: [
      { text: "Send money right away", isCorrect: false },
      { text: "Call your child directly to confirm", isCorrect: true },
      { text: "Send a photo of your ID", isCorrect: false },
    ],
    explanation: "Family impersonation scams via messaging are on the rise. Always confirm identity with a direct call.",
    summary: "If someone claims to be family, always verify with a direct call.",
    difficulty: 'medium',
  },
  {
    id: 5,
    scenario: "They say you must repay your loan first to get a 'lower interest rate' and ask for a transfer.",
    choices: [
      { text: "Repay then switch to lower rate", isCorrect: false },
      { text: "Share personal and account details", isCorrect: false },
      { text: "Visit the financial institution in person to verify", isCorrect: true },
    ],
    explanation: "Legitimate lenders do not ask for upfront payment to refinance.",
    summary: "Any request for upfront payment for loan changes is a scam.",
    difficulty: 'hard',
  },
  {
    id: 6,
    scenario: "Someone claiming to be police says 'your data was leaked' and tells you to install a remote-control app.",
    choices: [
      { text: "Install the app and allow remote access", isCorrect: false },
      { text: "Hang up and verify by calling the police directly", isCorrect: true },
      { text: "Provide all requested information", isCorrect: false },
    ],
    explanation: "Police never ask you to install remote-control apps. Allowing access can lead to financial theft.",
    summary: "Authorities do not ask you to install remote-control apps.",
    difficulty: 'hard',
  },
];

export const guardianAlerts: GuardianAlert[] = [
  {
    id: '1',
    riskLevel: 91,
    type: 'Call',
    title: 'Suspected agency impersonation call detected',
    time: 'Just now',
    description: 'Caller ID resembles the prosecutor\'s office but does not match the real number. Multiple transfer-related keywords detected.',
    recommendedAction: 'End the call immediately and verify with the agency\'s official hotline (1301).',
    riskType: 'Agency impersonation',
  },
  {
    id: '2',
    riskLevel: 78,
    type: 'Smishing',
    title: 'Courier impersonation smishing text detected',
    time: '32 min ago',
    description: 'A text with a URL link about delivery was received from an unknown number.',
    recommendedAction: 'Do not click any link in the text. Check via the courier\'s official app.',
    riskType: 'Smishing',
  },
  {
    id: '3',
    riskLevel: 85,
    type: 'Transfer',
    title: 'Risky account transfer blocked',
    time: '2 hours ago',
    description: 'A transfer to an account with voice phishing reports was attempted and automatically blocked.',
    recommendedAction: 'Stop transfers to that account and re-verify the recipient.',
    riskType: 'Risky transfer',
  },
  {
    id: '4',
    riskLevel: 45,
    type: 'Call',
    title: 'Suspicious keywords detected in call',
    time: 'Yesterday',
    description: 'Financial keywords such as "account number" and "transfer" were repeatedly detected during the call.',
    recommendedAction: 'Review the call. If suspicious, consult family or the police.',
    riskType: 'Suspicious call',
  },
];

export const chatbotQuickReplies = [
  'Seems like agency impersonation',
  'They\'re asking for money',
  'Suspicious text link',
  'I\'m on a call with them',
  'I already sent money',
];

export const chatbotInitialMessage: ChatMessage = {
  id: '0',
  text: 'Describe your situation briefly and we\'ll help you with what to say when reporting and what to do next.',
  isBot: true,
  timestamp: 'Now',
};

export const chatbotResponses: Record<string, ChatMessage[]> = {
  'Seems like agency impersonation': [
    {
      id: 'r1',
      text: 'Agency impersonation phishing is suspected. See the report summary below.',
      isBot: true,
      timestamp: 'Now',
      card: {
        title: 'Report summary',
        items: [
          'Type: Agency impersonation (prosecutor/police/FSS)',
          'Situation: Phone demand for money or personal information',
          'Recommended action: End call immediately → Report to police',
        ],
        keywords: ['Agency impersonation', 'Phone financial fraud', 'Prosecutor impersonation'],
      },
    },
  ],
  'They\'re asking for money': [
    {
      id: 'r2',
      text: 'You were asked to send money. Do not send any money. Check the information below.',
      isBot: true,
      timestamp: 'Now',
      card: {
        title: 'Report summary',
        items: [
          'Type: Transfer demand scam',
          'Situation: Urgent transfer demand by phone or text',
          'Recommended action: Stop transfer → Report to police or FSS 1332',
        ],
        keywords: ['Transfer demand', 'Urgent transfer', 'Safe account'],
      },
    },
  ],
  'Suspicious text link': [
    {
      id: 'r3',
      text: 'Smishing is suspected. Do not click the link.',
      isBot: true,
      timestamp: 'Now',
      card: {
        title: 'Report summary',
        items: [
          'Type: Smishing (text phishing)',
          'Situation: Text containing suspicious URL link',
          'Recommended action: Do not click link → Delete text → Report',
        ],
        keywords: ['Smishing', 'Malicious link', 'Courier impersonation'],
      },
    },
  ],
  'I\'m on a call with them': [
    {
      id: 'r4',
      text: 'If you\'re on a call with them now, stay calm and hang up. A real agency will contact you again.',
      isBot: true,
      timestamp: 'Now',
    },
  ],
  'I already sent money': [
    {
      id: 'r5',
      text: 'You need to act quickly. Follow these steps immediately.',
      isBot: true,
      timestamp: 'Now',
      card: {
        title: 'Emergency response guide',
        items: [
          '1. Call your bank immediately → Request payment freeze',
          '2. Call the police to report the incident',
          '3. Contact FSS 1332 for victim support',
          '4. Visit a police station to file a report',
        ],
        keywords: ['Payment freeze', 'Incident report', 'Emergency response'],
      },
    },
  ],
};
