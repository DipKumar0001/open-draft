import { OpenDraftConfig } from '../config';
import { ChatMessage, ChatResponse } from './types';
import { ollamaProvider } from './ollama';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getProvider(config: OpenDraftConfig) {
  switch (config.provider) {
    case 'ollama':    return ollamaProvider;
    case 'anthropic': return anthropicProvider;
    case 'openai':
    case 'custom':    return openaiProvider;
    default:          return ollamaProvider;
  }
}

/** Standard (non-streaming) chat with automatic retry */
export async function chat(messages: ChatMessage[], config: OpenDraftConfig): Promise<ChatResponse> {
  const provider = getProvider(config);
  let attempt = 0;
  let lastError: any;

  while (attempt < 2) {
    try {
      if (attempt > 0) logger.debug(`Retrying ${config.provider} (attempt ${attempt + 1})`);
      return await provider.chat(messages, config);
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt < 2) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`LLM failed: ${err.message}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  throw new Error(`Provider ${config.provider} failed after retries: ${lastError?.message || lastError}`);
}

/** Streaming chat: emits tokens via onToken callback, returns full response at end */
export async function streamChat(
  messages: ChatMessage[],
  config: OpenDraftConfig,
  onToken: (token: string) => void
): Promise<ChatResponse> {
  const provider = getProvider(config);

  if (provider.streamChat) {
    try {
      return await provider.streamChat(messages, config, onToken);
    } catch (err: any) {
      // Streaming failed — fall back to non-streaming
      logger.debug(`Stream failed, falling back to blocking chat: ${err.message}`);
    }
  }

  // Fallback: blocking chat, emit full content at once
  const response = await provider.chat(messages, config);
  onToken(response.content);
  return response;
}
