"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
exports.streamChat = streamChat;
const ollama_1 = require("./ollama");
const anthropic_1 = require("./anthropic");
const openai_1 = require("./openai");
const logger_1 = require("../utils/logger");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function getProvider(config) {
    switch (config.provider) {
        case 'ollama': return ollama_1.ollamaProvider;
        case 'anthropic': return anthropic_1.anthropicProvider;
        case 'openai':
        case 'custom': return openai_1.openaiProvider;
        default: return ollama_1.ollamaProvider;
    }
}
/** Standard (non-streaming) chat with automatic retry */
async function chat(messages, config) {
    const provider = getProvider(config);
    let attempt = 0;
    let lastError;
    while (attempt < 2) {
        try {
            if (attempt > 0)
                logger_1.logger.debug(`Retrying ${config.provider} (attempt ${attempt + 1})`);
            return await provider.chat(messages, config);
        }
        catch (err) {
            lastError = err;
            attempt++;
            if (attempt < 2) {
                const backoff = Math.pow(2, attempt) * 1000;
                logger_1.logger.warn(`LLM failed: ${err.message}. Retrying in ${backoff}ms...`);
                await sleep(backoff);
            }
        }
    }
    throw new Error(`Provider ${config.provider} failed after retries: ${lastError?.message || lastError}`);
}
/** Streaming chat: emits tokens via onToken callback, returns full response at end */
async function streamChat(messages, config, onToken) {
    const provider = getProvider(config);
    if (provider.streamChat) {
        try {
            return await provider.streamChat(messages, config, onToken);
        }
        catch (err) {
            // Streaming failed — fall back to non-streaming
            logger_1.logger.debug(`Stream failed, falling back to blocking chat: ${err.message}`);
        }
    }
    // Fallback: blocking chat, emit full content at once
    const response = await provider.chat(messages, config);
    onToken(response.content);
    return response;
}
