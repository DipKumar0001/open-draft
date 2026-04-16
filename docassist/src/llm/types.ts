import { OpenDraftConfig } from '../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface LLMProvider {
  chat(messages: ChatMessage[], config: OpenDraftConfig): Promise<ChatResponse>;
  streamChat(
    messages: ChatMessage[],
    config: OpenDraftConfig,
    onToken: (token: string) => void
  ): Promise<ChatResponse>;
}
