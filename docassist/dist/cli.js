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
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const config_1 = require("./config");
const scanner_1 = require("./scanner");
const parser_1 = require("./parser");
const detector_1 = require("./assessment/detector");
const parser_2 = require("./assessment/parser");
const executor_1 = require("./assessment/executor");
const writer_1 = require("./output/writer");
const logger_1 = require("./utils/logger");
const spinner_1 = require("./utils/spinner");
const llm_1 = require("./llm");
const repl_1 = require("./repl");
const model_picker_1 = require("./repl/model-picker");
exports.program = new commander_1.Command();
exports.program
    .name('open-draft')
    .description('AI-powered agentic coding & document assistant (Claude Code-style)')
    .version('1.0.0');
// ── Global Options ────────────────────────────────────────────────────────────
exports.program
    .option('--provider <name>', 'LLM provider: ollama (default), anthropic, openai, custom')
    .option('--model <name>', 'Model name override for the session')
    .option('--output <dir>', 'Output directory for generated files')
    .option('--verbose', 'Enable verbose/debug logging')
    .option('--no-python-fallback', 'Disable Python fallback for document parsing')
    .option('--api-key <key>', 'API key for cloud providers')
    .option('--api-url <url>', 'Custom API base URL (for custom/local OpenAI-compatible APIs)')
    .option('--file <path>', 'Pre-load a document into context before starting the REPL')
    .option('--no-stream', 'Disable streaming output (use blocking mode)');
// ── chat (default REPL) ───────────────────────────────────────────────────────
exports.program
    .command('chat')
    .description('Start an interactive REPL chat session (default when no command given)')
    .option('--file <path>', 'Pre-load a document into context')
    .action(async (cmdOpts) => {
    const opts = { ...exports.program.opts(), ...cmdOpts };
    const config = (0, config_1.loadConfig)({
        provider: opts.provider,
        ollamaModel: opts.model,
        verbose: opts.verbose,
        outputDir: opts.output,
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        streamOutput: opts.stream !== false,
    });
    await (0, repl_1.startRepl)(config, opts.file || opts.F);
});
// ── ask (single-turn) ─────────────────────────────────────────────────────────
exports.program
    .command('ask <prompt>')
    .description('Single-turn non-interactive question (no REPL)')
    .option('--file <path>', 'Load a document into context for this question')
    .action(async (prompt, cmdOpts) => {
    const opts = { ...exports.program.opts(), ...cmdOpts };
    const config = (0, config_1.loadConfig)({
        provider: opts.provider,
        ollamaModel: opts.model,
        verbose: opts.verbose,
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        streamOutput: opts.stream !== false,
    });
    const messages = [];
    if (cmdOpts.file) {
        const spinner = (0, spinner_1.createSpinner)(`Loading ${cmdOpts.file}...`).start();
        try {
            const result = await (0, parser_1.parseFile)(cmdOpts.file);
            if (result.method !== 'failed' && result.content.trim()) {
                messages.push({
                    role: 'system',
                    content: `Context document (${cmdOpts.file}):\n\n${result.content.slice(0, 20000)}`,
                });
                spinner.succeed(`Loaded ${cmdOpts.file}`);
            }
            else {
                spinner.warn('Could not extract content from file — proceeding without it');
            }
        }
        catch (err) {
            spinner.fail(`Failed to load file: ${err.message}`);
        }
    }
    messages.push({ role: 'user', content: prompt });
    const { streamChat: streamChatFn } = await Promise.resolve().then(() => __importStar(require('./llm')));
    process.stdout.write('\n');
    try {
        await streamChatFn(messages, config, (token) => process.stdout.write(token));
        process.stdout.write('\n\n');
    }
    catch (err) {
        logger_1.logger.error('Failed to get response', err);
        process.exit(1);
    }
});
// ── models ────────────────────────────────────────────────────────────────────
exports.program
    .command('models')
    .description('List available Ollama models on this machine')
    .action(async () => {
    const config = (0, config_1.loadConfig)(exports.program.opts());
    await (0, model_picker_1.displayOllamaModels)(config);
});
// ── scan ──────────────────────────────────────────────────────────────────────
exports.program
    .command('scan <path>')
    .description('Scan and read files, print extracted text')
    .action(async (targetPath) => {
    const opts = exports.program.opts();
    const config = (0, config_1.loadConfig)(opts);
    try {
        const files = (0, scanner_1.scan)(targetPath);
        logger_1.logger.info(`Found ${files.length} supported file(s).`);
        for (const file of files) {
            logger_1.logger.info(`Parsing ${file.name}...`);
            const result = await (0, parser_1.parseFile)(file.path);
            logger_1.logger.success(`Extracted ${result.content.length.toLocaleString()} chars (method: ${result.method})`);
            console.log('\n' + result.content.slice(0, 600) + (result.content.length > 600 ? '\n... [TRUNCATED]' : ''));
        }
    }
    catch (err) {
        logger_1.logger.error('Scan failed', err);
        process.exit(1);
    }
});
// ── assess ────────────────────────────────────────────────────────────────────
exports.program
    .command('assess <path>')
    .description('Detect academic assessment brief and generate a completion')
    .option('--force', 'Force assessment mode even if brief detection confidence is low')
    .action(async (targetPath, cmdOpts) => {
    const opts = exports.program.opts();
    const config = (0, config_1.loadConfig)({
        ...opts,
        assessmentMode: cmdOpts.force ? 'force' : opts.assessmentMode,
    });
    try {
        const files = (0, scanner_1.scan)(targetPath);
        if (files.length === 0)
            throw new Error('No supported files found.');
        const file = files[0];
        const spinner = (0, spinner_1.createSpinner)(`Parsing ${file.name}...`).start();
        const parseResult = await (0, parser_1.parseFile)(file.path);
        if (parseResult.method === 'failed') {
            spinner.fail('Failed to extract text from document');
            process.exit(1);
        }
        spinner.succeed(`Extracted content (method: ${parseResult.method})`);
        const detection = (0, detector_1.detectAssessment)(parseResult.content);
        if (!detection.isAssessment && config.assessmentMode !== 'force') {
            logger_1.logger.warn(`Not an assessment brief (confidence: ${detection.confidence.toFixed(2)}). Use --force to override.`);
            process.exit(0);
        }
        logger_1.logger.success(`Assessment brief detected (confidence: ${detection.confidence.toFixed(2)})`);
        spinner.start('Analysing requirements via LLM...');
        const brief = await (0, parser_2.parseAssessment)(parseResult.content, config);
        spinner.succeed(`Parsed ${brief.tasks.length} task(s) — "${brief.assignmentTitle}"`);
        logger_1.logger.info('Executing assessment tasks...');
        const execResult = await (0, executor_1.executeAssessment)(brief, config);
        spinner.start('Writing output...');
        await (0, writer_1.writeOutput)(execResult, config.outputDir);
        spinner.succeed('Assessment completed and written.');
    }
    catch (err) {
        logger_1.logger.error('Assessment failed', err);
        process.exit(1);
    }
});
// ── config ────────────────────────────────────────────────────────────────────
exports.program
    .command('config')
    .description('Show current active configuration')
    .action(() => {
    const config = (0, config_1.loadConfig)(exports.program.opts());
    const sanitized = { ...config };
    if (sanitized.apiKey)
        sanitized.apiKey = '••••••••';
    console.log(JSON.stringify(sanitized, null, 2));
});
// ── providers (legacy alias) ──────────────────────────────────────────────────
exports.program
    .command('providers')
    .description('Test the active LLM provider')
    .action(async () => {
    const config = (0, config_1.loadConfig)(exports.program.opts());
    logger_1.logger.info(`Testing provider: ${config.provider}`);
    const spinner = (0, spinner_1.createSpinner)('Pinging LLM...').start();
    try {
        const res = await (0, llm_1.chat)([{ role: 'user', content: 'Reply with: "open-draft is ready."' }], config);
        spinner.succeed(`${res.provider} (${res.model}): ${res.content.trim()}`);
    }
    catch (err) {
        spinner.fail(`Provider test failed: ${err.message}`);
    }
});
