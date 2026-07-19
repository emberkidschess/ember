export interface ChatHistoryInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  url: string;
}

interface StreamChatOptions {
  message: string;
  history: ChatHistoryInput[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
  onDone: (sources: ChatSource[]) => void;
}

type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'done'; sources?: ChatSource[] }
  | { type: 'error'; message?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return String(payload.error);
  }
  return fallback;
}

export async function streamAcademyChat({
  message,
  history,
  signal,
  onToken,
  onDone,
}: StreamChatOptions): Promise<void> {
  if (!API_URL) throw new Error('Chat is unavailable right now. Please try again later.');

  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(errorMessage(payload, 'Chat is unavailable right now. Please try again later.'));
  }
  if (!response.body) throw new Error('I couldn’t reply right now. Please try again.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  const handleBlock = (block: string) => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return;

    const event = JSON.parse(data) as StreamEvent;
    if (event.type === 'token' && event.text) onToken(event.text);
    if (event.type === 'done') {
      completed = true;
      onDone(event.sources || []);
    }
    if (event.type === 'error') {
      throw new Error(event.message || 'I couldn’t reply right now. Please try again.');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) handleBlock(block);
    if (done) break;
  }

  if (buffer.trim()) handleBlock(buffer);
  if (!completed) throw new Error('I couldn’t finish that reply. Please try again.');
}
