import { ChatMessage, ChatResponse, LLMProvider } from './types';
import { OpenDraftConfig } from '../config';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

function toOllamaMessages(messages: ChatMessage[]): OllamaMessage[] {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({ role: m.role, content: m.content }));
}

async function ensureOllamaRunning(baseUrl: string): Promise<void> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  } catch (err: any) {
    throw new Error(
      `Ollama is not running or unreachable at ${baseUrl}.\nStart it with: ollama serve`
    );
  }
}

export const ollamaProvider: LLMProvider = {
  async chat(messages: ChatMessage[], config: OpenDraftConfig): Promise<ChatResponse> {
    const url = `${config.ollamaBaseUrl.replace(/\/$/, '')}/api/chat`;
    await ensureOllamaRunning(config.ollamaBaseUrl);

    const body = {
      model: config.ollamaModel,
      messages: toOllamaMessages(messages),
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    return {
      content: data.message.content,
      model: data.model || config.ollamaModel,
      provider: 'ollama',
    };
  },

  async streamChat(
    messages: ChatMessage[],
    config: OpenDraftConfig,
    onToken: (token: string) => void
  ): Promise<ChatResponse> {
    const url = `${config.ollamaBaseUrl.replace(/\/$/, '')}/api/chat`;
    await ensureOllamaRunning(config.ollamaBaseUrl);

    const body = {
      model: config.ollamaModel,
      messages: toOllamaMessages(messages),
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama stream error ${response.status}: ${text}`);
    }

    let fullContent = '';
    let finalModel = config.ollamaModel;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as OllamaChatResponse;
          if (chunk.message?.content) {
            onToken(chunk.message.content);
            fullContent += chunk.message.content;
          }
          if (chunk.model) finalModel = chunk.model;
        } catch {
          // Malformed chunk — skip
        }
      }
    }

    return {
      content: fullContent,
      model: finalModel,
      provider: 'ollama',
    };
  },
};

/** Fetch list of locally available Ollama models */
export async function listOllamaModels(baseUrl: string): Promise<{ name: string; size: string }[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: { name: string; size: number }[] };
    return (data.models || []).map((m) => ({
      name: m.name,
      size: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : 'unknown',
    }));
  } catch {
    return [];
  }
}
