"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPT = void 0;
exports.buildMessages = buildMessages;
const SYSTEM_PROMPT = `You are open-draft, an expert AI assistant and agentic coding tool.

You operate like a powerful coding assistant. You can:
- Read, write, and edit files on the user's filesystem  
- Run shell commands (with user approval)
- Parse and understand documents (PDFs, DOCX, XLSX, images, etc.)
- Help with writing, analysis, coding, and problem-solving

Guidelines:
- Be concise and direct. Prefer action over lengthy explanation.
- When you need to read a file or execute something, say so clearly.
- Format code in markdown code blocks with language tags.
- For file paths, always use absolute paths when possible.
- When you write files, confirm what was written and where.
- Do not make up file contents — always read first.
- You are running locally on the user's machine with their permissions.`;
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
function buildMessages(userInput, memory, config) {
    const messages = [];
    // 1. System prompt
    const systemContent = config.systemPrompt || SYSTEM_PROMPT;
    messages.push({ role: 'system', content: systemContent });
    // 2. Document context blocks (inject before conversation)
    const docs = memory.getDocuments();
    if (docs.length > 0) {
        const docContextParts = docs.map((doc) => {
            const truncated = doc.content.length > 20000
                ? doc.content.slice(0, 20000) + '\n\n[...truncated to 20,000 chars...]'
                : doc.content;
            return `### Document: ${doc.label}\n\`\`\`\n${truncated}\n\`\`\``;
        });
        messages.push({
            role: 'user',
            content: `I have loaded the following documents into our session for reference:\n\n${docContextParts.join('\n\n')}`,
        });
        messages.push({
            role: 'assistant',
            content: `Understood. I have read ${docs.length} document(s): ${docs.map((d) => d.label).join(', ')}. I'll reference them as needed.`,
        });
    }
    // 3. Conversation history
    for (const msg of memory.getMessages()) {
        messages.push(msg);
    }
    // 4. Current user message
    messages.push({ role: 'user', content: userInput });
    return messages;
}
