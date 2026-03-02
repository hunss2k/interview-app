// Telegram Bot 응답 처리 유틸
import { getPersons, getRecentInterviews, getInterviews } from './notion';

export async function handleTelegramCommand(text: string): Promise<string> {
  const trimmed = text.trim();

  if (trimmed.startsWith('/질문')) {
    const name = trimmed.replace('/질문', '').trim();
    return await handleQuestionCommand(name);
  }
  if (trimmed.startsWith('/요약')) {
    const name = trimmed.replace('/요약', '').trim();
    return await handleSummaryCommand(name);
  }
  if (trimmed.startsWith('/목록')) {
    return await handleListCommand();
  }
  if (trimmed.startsWith('/최근')) {
    return await handleRecentCommand();
  }
  if (trimmed.startsWith('/start') || trimmed.startsWith('/help')) {
    return getHelpText();
  }

  return '알 수 없는 명령어입니다.\n\n' + getHelpText();
}

async function handleQuestionCommand(name: string): Promise<string> {
  if (!name) return '사용법: /질문 홍길동';

  const persons = await getPersons();
  const person = persons.find((p) => p.name === name);
  if (!person) return `"${name}"을(를) 찾을 수 없습니다.`;
  if (!person.nextQuestions) return `${name}님의 다음 질문이 아직 없습니다.`;

  return `📋 ${name}님 다음 면담 질문:\n\n${person.nextQuestions}`;
}

async function handleSummaryCommand(name: string): Promise<string> {
  if (!name) return '사용법: /요약 홍길동';

  const persons = await getPersons();
  const person = persons.find((p) => p.name === name);
  if (!person) return `"${name}"을(를) 찾을 수 없습니다.`;

  const interviews = await getInterviews(person.id);
  if (interviews.length === 0) return `${name}님의 면담 기록이 없습니다.`;

  const latest = interviews[0];
  return `📝 ${name}님 최근 면담 (${latest.date}):\n\n${latest.summary}`;
}

async function handleListCommand(): Promise<string> {
  const persons = await getPersons();
  const leaders = persons.filter((p) => p.type !== '대외미팅' && p.status === '재직');
  const clients = persons.filter((p) => p.type === '대외미팅' && p.status === '거래중');

  let msg = '👥 직원 목록:\n';
  leaders.forEach((p) => { msg += `  • ${p.name} (${p.department})\n`; });
  msg += `\n🏢 대외미팅 목록:\n`;
  clients.forEach((p) => { msg += `  • ${p.name} (${p.department})\n`; });

  return msg || '등록된 인원이 없습니다.';
}

async function handleRecentCommand(): Promise<string> {
  const interviews = await getRecentInterviews(5);
  if (interviews.length === 0) return '면담 기록이 없습니다.';

  let msg = '📋 최근 면담:\n\n';
  interviews.forEach((iv) => {
    const summaryLine = iv.summary.split('\n')[0].slice(0, 50);
    msg += `• ${iv.personName} (${iv.date})\n  ${summaryLine}\n\n`;
  });

  return msg;
}

function getHelpText(): string {
  return `45SPACE 회의록 관리 봇 🤖\n\n명령어:\n/질문 [이름] - 다음 면담 추천 질문\n/요약 [이름] - 최근 면담 요약\n/목록 - 활성 인원 리스트\n/최근 - 최근 5개 면담`;
}

/**
 * 텔레그램으로 알림 메시지 전송
 * TELEGRAM_CHAT_ID 환경변수에 CEO 채팅 ID 설정 필요
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('텔레그램 알림 전송 불가: TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('텔레그램 알림 전송 실패:', err);
  }
}
