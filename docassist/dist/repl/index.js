"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRepl = startRepl;
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const memory_1 = require("../session/memory");
const context_1 = require("../session/context");
const llm_1 = require("../llm");
const parser_1 = require("../parser");
const logger_1 = require("../utils/logger");
const model_picker_1 = require("./model-picker");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TerminalRenderer = require('marked-terminal');
let marked;
async function loadMarkdownRenderer() {
    try {
        const { marked: m } = await Promise.resolve().then(() => __importStar(require('marked')));
        const renderer = new TerminalRenderer();
        m.use({ renderer });
        marked = m;
    }
    catch {
        // Markdown rendering not available — plain text
    }
}
function renderMarkdown(text) {
    if (marked) {
        try {
            return marked.parse(text);
        }
        catch {
            return text;
        }
    }
    return text;
}
function printBanner(config) {
    const modelStr = config.provider === 'ollama'
        ? chalk_1.default.cyan(config.ollamaModel)
        : chalk_1.default.yellow(`${config.provider}/${config.provider === 'anthropic' ? config.anthropicModel : config.openaiModel}`);
    console.log('');
    console.log(chalk_1.default.bold.cyan('  ╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk_1.default.bold.cyan('  ║') + chalk_1.default.bold.white('  open-draft') + chalk_1.default.gray(' — AI-powered coding & document agent  ') + chalk_1.default.bold.cyan('║'));
    console.log(chalk_1.default.bold.cyan('  ╚═══════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(`  ${chalk_1.default.gray('Model:')}   ${modelStr}`);
    console.log(`  ${chalk_1.default.gray('Provider:')} ${chalk_1.default.white(config.provider)}`);
    console.log('');
    console.log(chalk_1.default.gray(`  Type a message. Slash commands: /help, /file <path>, /model, /clear, /save, /exit`));
    console.log('');
}
function printStatusBar(config, memory) {
    const model = config.provider === 'ollama' ? config.ollamaModel : config.anthropicModel;
    const msgs = memory.messageCount;
    const docs = memory.documentCount;
    const parts = [
        chalk_1.default.gray('model:') + chalk_1.default.cyan(` ${model}`),
        msgs > 0 ? chalk_1.default.gray('msgs:') + chalk_1.default.white(` ${msgs}`) : '',
        docs > 0 ? chalk_1.default.gray('docs:') + chalk_1.default.yellow(` ${docs}`) : '',
    ].filter(Boolean).join(chalk_1.default.gray(' │ '));
    process.stdout.write(chalk_1.default.gray(`\n  [${parts}]\n`));
}
function printHelp() {
    console.log('');
    console.log(chalk_1.default.bold.white('  Slash Commands'));
    console.log(chalk_1.default.gray('  ───────────────────────────────────────────────────────'));
    const cmds = [
        ['/file <path>', 'Load a document into the conversation context'],
        ['/clear', 'Clear conversation history (keeps documents)'],
        ['/reset', 'Clear everything (history + documents)'],
        ['/model [name]', 'Switch Ollama model interactively or by name'],
        ['/models', 'List all available Ollama models'],
        ['/docs', 'List documents currently in context'],
        ['/save [file]', 'Save conversation to a JSON file'],
        ['/tools', 'List available agentic tools'],
        ['/help', 'Show this help message'],
        ['/exit', 'Exit open-draft'],
    ];
    for (const [cmd, desc] of cmds) {
        console.log(`  ${chalk_1.default.cyan(cmd.padEnd(22))} ${chalk_1.default.gray(desc)}`);
    }
    console.log('');
}
async function handleSlashCommand(input, config, memory, setConfig) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');
    switch (cmd) {
        case '/exit':
        case '/quit':
            console.log(chalk_1.default.gray('\n  Goodbye! 👋\n'));
            process.exit(0);
        case '/help':
            printHelp();
            return true;
        case '/clear':
            memory.clearMessages();
            console.log(chalk_1.default.green('  ✔ Conversation cleared. Documents kept.'));
            return true;
        case '/reset':
            memory.clear();
            console.log(chalk_1.default.green('  ✔ Full reset. Conversation and documents cleared.'));
            return true;
        case '/file': {
            if (!arg) {
                logger_1.logger.warn('Usage: /file <path-to-document>');
                return true;
            }
            const resolvedPath = path_1.default.resolve(arg);
            if (!fs_1.default.existsSync(resolvedPath)) {
                logger_1.logger.error(`File not found: ${resolvedPath}`);
                return true;
            }
            process.stdout.write(chalk_1.default.gray(`  Parsing ${path_1.default.basename(resolvedPath)}...`));
            try {
                const result = await (0, parser_1.parseFile)(resolvedPath);
                if (result.method === 'failed' || !result.content.trim()) {
                    process.stdout.write('\r' + ' '.repeat(60) + '\r');
                    logger_1.logger.error('Failed to extract content from this file.');
                }
                else {
                    memory.addDocument(resolvedPath, result.content, path_1.default.basename(resolvedPath));
                    process.stdout.write('\r' + ' '.repeat(60) + '\r');
                    console.log(chalk_1.default.green(`  ✔ Loaded`) +
                        chalk_1.default.white(` ${path_1.default.basename(resolvedPath)}`) +
                        chalk_1.default.gray(` (${result.content.length.toLocaleString()} chars, method: ${result.method})`));
                }
            }
            catch (err) {
                process.stdout.write('\r' + ' '.repeat(60) + '\r');
                logger_1.logger.error(`Failed to load file: ${err.message}`);
            }
            return true;
        }
        case '/docs': {
            const docs = memory.getDocuments();
            if (docs.length === 0) {
                console.log(chalk_1.default.gray('  No documents loaded. Use /file <path> to add one.'));
            }
            else {
                console.log('');
                docs.forEach((d, i) => {
                    console.log(`  ${chalk_1.default.cyan(`${i + 1}.`)} ${chalk_1.default.white(d.label)} ` +
                        chalk_1.default.gray(`(${d.content.length.toLocaleString()} chars)`));
                });
                console.log('');
            }
            return true;
        }
        case '/model': {
            if (arg) {
                setConfig({ ollamaModel: arg });
                console.log(chalk_1.default.green(`  ✔ Model switched to ${chalk_1.default.cyan(arg)}`));
            }
            else {
                const chosen = await (0, model_picker_1.pickOllamaModel)(config);
                setConfig({ ollamaModel: chosen });
                console.log(chalk_1.default.green(`  ✔ Model switched to ${chalk_1.default.cyan(chosen)}`));
            }
            return true;
        }
        case '/models': {
            await (0, model_picker_1.displayOllamaModels)(config);
            return true;
        }
        case '/save': {
            const sessionsDir = path_1.default.join(os_1.default.homedir(), '.open-draft', 'sessions');
            fs_1.default.mkdirSync(sessionsDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = arg
                ? path_1.default.resolve(arg)
                : path_1.default.join(sessionsDir, `session-${ts}.json`);
            fs_1.default.writeFileSync(outputPath, JSON.stringify(memory.toJSON(), null, 2), 'utf-8');
            console.log(chalk_1.default.green(`  ✔ Session saved to ${outputPath}`));
            return true;
        }
        case '/tools': {
            console.log('');
            console.log(chalk_1.default.bold.white('  Available Tools'));
            console.log(chalk_1.default.gray('  ─────────────────────────────────────────'));
            const tools = [
                ['read_file', 'Read a file from the filesystem'],
                ['write_file', 'Create or overwrite a file'],
                ['list_directory', 'List contents of a directory'],
                ['run_command', 'Execute a shell command (requires approval)'],
                ['read_document', 'Parse documents: PDF, DOCX, XLSX, PPTX, images'],
            ];
            for (const [name, desc] of tools) {
                console.log(`  ${chalk_1.default.cyan(name.padEnd(20))} ${chalk_1.default.gray(desc)}`);
            }
            console.log('');
            return true;
        }
        default:
            if (cmd.startsWith('/')) {
                logger_1.logger.warn(`Unknown command: ${cmd}. Type /help for available commands.`);
                return true;
            }
            return false; // Not a slash command
    }
}
function getPromptPrefix() {
    return chalk_1.default.bold.cyan('\n  ❯ ');
}
function getAssistantPrefix() {
    return chalk_1.default.bold.white('\n  ◎ open-draft\n');
}
/** Main REPL entry point */
async function startRepl(initialConfig, preloadFile) {
    await loadMarkdownRenderer();
    // Mutable config reference (allows mid-session model switch)
    let config = { ...initialConfig };
    const memory = new memory_1.ConversationMemory(config.maxContextMessages);
    const setConfig = (updates) => {
        config = { ...config, ...updates };
    };
    printBanner(config);
    // Pre-load a file if passed via --file flag
    if (preloadFile) {
        const resolvedPath = path_1.default.resolve(preloadFile);
        if (fs_1.default.existsSync(resolvedPath)) {
            process.stdout.write(chalk_1.default.gray(`  Pre-loading ${path_1.default.basename(resolvedPath)}...`));
            try {
                const result = await (0, parser_1.parseFile)(resolvedPath);
                if (result.method !== 'failed' && result.content.trim()) {
                    memory.addDocument(resolvedPath, result.content, path_1.default.basename(resolvedPath));
                    process.stdout.write('\r' + ' '.repeat(60) + '\r');
                    console.log(chalk_1.default.green(`  ✔ Pre-loaded`) +
                        chalk_1.default.white(` ${path_1.default.basename(resolvedPath)}`) +
                        chalk_1.default.gray(` (${result.content.length.toLocaleString()} chars)`));
                }
            }
            catch (err) {
                process.stdout.write('\r' + ' '.repeat(60) + '\r');
                logger_1.logger.warn(`Could not pre-load file: ${err.message}`);
            }
        }
    }
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: getPromptPrefix(),
        terminal: true,
    });
    const promptUser = () => {
        printStatusBar(config, memory);
        process.stdout.write(getPromptPrefix());
    };
    promptUser();
    rl.on('line', async (rawInput) => {
        rl.pause();
        const input = rawInput.trim();
        if (!input) {
            promptUser();
            rl.resume();
            return;
        }
        // Handle slash commands
        const wasSlash = await handleSlashCommand(input, config, memory, setConfig);
        if (wasSlash) {
            promptUser();
            rl.resume();
            return;
        }
        // ── LLM Request ─────────────────────────────────────────────────────────
        const messages = (0, context_1.buildMessages)(input, memory, config);
        process.stdout.write(getAssistantPrefix());
        let fullResponse = '';
        let lineBuffer = '';
        let inCodeBlock = false;
        try {
            await (0, llm_1.streamChat)(messages, config, (token) => {
                fullResponse += token;
                lineBuffer += token;
                // Track code block state for colour rendering
                const lines = lineBuffer.split('\n');
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i];
                    if (line.startsWith('```'))
                        inCodeBlock = !inCodeBlock;
                    if (inCodeBlock) {
                        process.stdout.write(chalk_1.default.yellow(line) + '\n');
                    }
                    else {
                        process.stdout.write(chalk_1.default.white(line) + '\n');
                    }
                }
                lineBuffer = lines[lines.length - 1];
            });
            // Flush any remaining buffer
            if (lineBuffer) {
                if (lineBuffer.startsWith('```'))
                    inCodeBlock = !inCodeBlock;
                process.stdout.write((inCodeBlock ? chalk_1.default.yellow(lineBuffer) : chalk_1.default.white(lineBuffer)) + '\n');
            }
        }
        catch (err) {
            const msg = err.message || String(err);
            console.error(chalk_1.default.red(`\n  ✖ ${msg}`));
            if (msg.includes('ollama') || msg.includes('Ollama') || msg.includes('ECONNREFUSED')) {
                console.log(chalk_1.default.gray('  → Ensure Ollama is running: ') + chalk_1.default.cyan('ollama serve'));
                console.log(chalk_1.default.gray('  → Pull a model: ') + chalk_1.default.cyan('ollama pull llama3.2'));
            }
        }
        // Save assistant response to memory
        if (fullResponse.trim()) {
            memory.addMessage({ role: 'user', content: input });
            memory.addMessage({ role: 'assistant', content: fullResponse });
        }
        promptUser();
        rl.resume();
    });
    rl.on('close', () => {
        console.log(chalk_1.default.gray('\n  Session ended. Goodbye! 👋\n'));
        process.exit(0);
    });
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log(chalk_1.default.gray('\n\n  Interrupted. Type /exit or press Ctrl+C again to quit.\n'));
        promptUser();
        rl.resume();
    });
}
