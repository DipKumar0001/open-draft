"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiProvider = void 0;
const openai_1 = __importDefault(require("openai"));
exports.openaiProvider = {
    async chat(messages, config) {
        if (!config.apiKey && config.provider === 'openai') {
            throw new Error('OpenAI requires an API key. Set OPENAI_API_KEY or use --api-key flag.');
        }
        const clientArgs = {
            apiKey: config.apiKey || 'custom-no-key',
        };
        if (config.apiUrl)
            clientArgs.baseURL = config.apiUrl;
        const openai = new openai_1.default(clientArgs);
        const openaiMessages = messages
            .filter((m) => m.role !== 'tool')
            .map((m) => ({
            role: m.role,
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
    async streamChat(messages, config, onToken) {
        if (!config.apiKey && config.provider === 'openai') {
            throw new Error('OpenAI requires an API key. Set OPENAI_API_KEY or use --api-key flag.');
        }
        const clientArgs = {
            apiKey: config.apiKey || 'custom-no-key',
        };
        if (config.apiUrl)
            clientArgs.baseURL = config.apiUrl;
        const openai = new openai_1.default(clientArgs);
        const openaiMessages = messages
            .filter((m) => m.role !== 'tool')
            .map((m) => ({
            role: m.role,
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
