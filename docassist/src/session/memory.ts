import { ChatMessage } from '../llm/types';

export interface DocumentContext {
  path: string;
  label: string;
  content: string;
  addedAt: Date;
}

export class ConversationMemory {
  private messages: ChatMessage[] = [];
  private documents: DocumentContext[] = [];
  private maxMessages: number;

  constructor(maxMessages = 40) {
    this.maxMessages = maxMessages;
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    // Keep a sliding window (preserve system messages)
    const systemMessages = this.messages.filter((m) => m.role === 'system');
    const nonSystem = this.messages.filter((m) => m.role !== 'system');
    if (nonSystem.length > this.maxMessages) {
      const trimmed = nonSystem.slice(nonSystem.length - this.maxMessages);
      this.messages = [...systemMessages, ...trimmed];
    }
  }

  addDocument(path: string, content: string, label?: string): void {
    const existing = this.documents.findIndex((d) => d.path === path);
    const doc: DocumentContext = {
      path,
      label: label || path,
      content,
      addedAt: new Date(),
    };
    if (existing >= 0) {
      this.documents[existing] = doc;
    } else {
      this.documents.push(doc);
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getDocuments(): DocumentContext[] {
    return [...this.documents];
  }

  hasDocument(path: string): boolean {
    return this.documents.some((d) => d.path === path);
  }

  removeDocument(path: string): boolean {
    const idx = this.documents.findIndex((d) => d.path === path);
    if (idx >= 0) {
      this.documents.splice(idx, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.messages = [];
    this.documents = [];
  }

  clearMessages(): void {
    this.messages = [];
  }

  get messageCount(): number {
    return this.messages.filter((m) => m.role !== 'system').length;
  }

  get documentCount(): number {
    return this.documents.length;
  }

  /** Serialize to JSON for saving sessions */
  toJSON(): object {
    return {
      savedAt: new Date().toISOString(),
      messages: this.messages,
      documents: this.documents.map((d) => ({
        path: d.path,
        label: d.label,
        addedAt: d.addedAt,
        contentLength: d.content.length,
      })),
    };
  }
}
