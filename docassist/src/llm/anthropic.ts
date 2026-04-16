import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage, ChatResponse, LLMProvider } from './types';
import { OpenDraftConfig } from '../config';

export const anthropicProvider: LLMProvider = {
  async chat(messages: ChatMessage[], config: OpenDraftConfig): Promise<ChatResponse> {
    if (!config.apiKey) {
      throw new Error(
        'Anthropic requires an API key. Set ANTHROPIC_API_KEY or use --api-key flag.'
      );
    }

    const anthropic = new Anthropic({ apiKey: config.apiKey });
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const response = await anthropic.messages.create({
      model: config.anthropicModel,
      system: systemMsg,
      messages: userMessages,
      max_tokens: 8192,
    });

    return {
      content: response.content.map((c) => ('text' in c ? c.text : '')).join(''),
      model: config.anthropicModel,
      provider: 'anthropic',
    };
  },

  async streamChat(
    messages: ChatMessage[],
    config: OpenDraftConfig,
    onToken: (token: string) => void
  ): Promise<ChatResponse> {
    if (!config.apiKey) {
      throw new Error(
        'Anthropic requires an API key. Set ANTHROPIC_API_KEY or use --api-key flag.'
      );
    }

    const anthropic = new Anthropic({ apiKey: config.apiKey });
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    let fullContent = '';

    const stream = anthropic.messages.stream({
      model: config.anthropicModel,
      system: systemMsg,
      messages: userMessages,
      max_tokens: 8192,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onToken(event.delta.text);
        fullContent += event.delta.text;
      }
    }

    return {
      content: fullContent,
      model: config.anthropicModel,
      provider: 'anthropic',
    };
  },
};
