"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
exports.anthropicProvider = {
    async chat(messages, config) {
        if (!config.apiKey) {
            throw new Error('Anthropic requires an API key. Set ANTHROPIC_API_KEY or use --api-key flag.');
        }
        const anthropic = new sdk_1.default({ apiKey: config.apiKey });
        const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
        const userMessages = messages
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
    async streamChat(messages, config, onToken) {
        if (!config.apiKey) {
            throw new Error('Anthropic requires an API key. Set ANTHROPIC_API_KEY or use --api-key flag.');
        }
        const anthropic = new sdk_1.default({ apiKey: config.apiKey });
        const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
        const userMessages = messages
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
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
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
