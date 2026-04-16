import OpenAI from 'openai';
import { ChatMessage, ChatResponse, LLMProvider } from './types';
import { OpenDraftConfig } from '../config';

export const openaiProvider: LLMProvider = {
  async chat(messages: ChatMessage[], config: OpenDraftConfig): Promise<ChatResponse> {
    if (!config.apiKey && config.provider === 'openai') {
      throw new Error(
        'OpenAI requires an API key. Set OPENAI_API_KEY or use --api-key flag.'
      );
    }

    const clientArgs: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: config.apiKey || 'custom-no-key',
    };
    if (config.apiUrl) clientArgs.baseURL = config.apiUrl;

    const openai = new OpenAI(clientArgs);
    const openaiMessages = messages
      .filter((m) => m.role !== 'tool')
      .map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: openaiMessages,
    });

    return {
      content: response.choices[0].message.content || '',
      model: config.openaiModel,
      provider: config.provider === 'custom' ? 'custom' : 'openai',
    };
  },

  async streamChat(
    messages: ChatMessage[],
    config: OpenDraftConfig,
    onToken: (token: string) => void
  ): Promise<ChatResponse> {
    if (!config.apiKey && config.provider === 'openai') {
      throw new Error(
        'OpenAI requires an API key. Set OPENAI_API_KEY or use --api-key flag.'
      );
    }

    const clientArgs: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: config.apiKey || 'custom-no-key',
    };
    if (config.apiUrl) clientArgs.baseURL = config.apiUrl;

    const openai = new OpenAI(clientArgs);
    const openaiMessages = messages
      .filter((m) => m.role !== 'tool')
      .map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

    let fullContent = '';

    const stream = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: openaiMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        onToken(token);
        fullContent += token;
      }
    }

    return {
      content: fullContent,
      model: config.openaiModel,
      provider: config.provider === 'custom' ? 'custom' : 'openai',
    };
  },
};
