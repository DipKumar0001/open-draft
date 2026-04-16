import { Command } from 'commander';
import { loadConfig } from './config';
import { scan } from './scanner';
import { parseFile } from './parser';
import { detectAssessment } from './assessment/detector';
import { parseAssessment } from './assessment/parser';
import { executeAssessment } from './assessment/executor';
import { writeOutput } from './output/writer';
import { logger } from './utils/logger';
import { createSpinner } from './utils/spinner';
import { chat } from './llm';
import { startRepl } from './repl';
import { displayOllamaModels } from './repl/model-picker';

export const program = new Command();

program
  .name('open-draft')
  .description('AI-powered agentic coding & document assistant (Claude Code-style)')
  .version('1.0.0');

// ── Global Options ────────────────────────────────────────────────────────────
program
  .option('--provider <name>',    'LLM provider: ollama (default), anthropic, openai, custom')
  .option('--model <name>',       'Model name override for the session')
  .option('--output <dir>',       'Output directory for generated files')
  .option('--verbose',            'Enable verbose/debug logging')
  .option('--no-python-fallback', 'Disable Python fallback for document parsing')
  .option('--api-key <key>',      'API key for cloud providers')
  .option('--api-url <url>',      'Custom API base URL (for custom/local OpenAI-compatible APIs)')
  .option('--file <path>',        'Pre-load a document into context before starting the REPL')
  .option('--no-stream',          'Disable streaming output (use blocking mode)');

// ── chat (default REPL) ───────────────────────────────────────────────────────
program
  .command('chat')
  .description('Start an interactive REPL chat session (default when no command given)')
  .option('--file <path>', 'Pre-load a document into context')
  .action(async (cmdOpts) => {
    const opts = { ...program.opts(), ...cmdOpts };
    const config = loadConfig({
      provider: opts.provider,
      ollamaModel: opts.model,
      verbose: opts.verbose,
      outputDir: opts.output,
      apiKey: opts.apiKey,
      apiUrl: opts.apiUrl,
      streamOutput: opts.stream !== false,
    });
    await startRepl(config, opts.file || opts.F);
  });

// ── ask (single-turn) ─────────────────────────────────────────────────────────
program
  .command('ask <prompt>')
  .description('Single-turn non-interactive question (no REPL)')
  .option('--file <path>', 'Load a document into context for this question')
  .action(async (prompt, cmdOpts) => {
    const opts = { ...program.opts(), ...cmdOpts };
    const config = loadConfig({
      provider: opts.provider,
      ollamaModel: opts.model,
      verbose: opts.verbose,
      apiKey: opts.apiKey,
      apiUrl: opts.apiUrl,
      streamOutput: opts.stream !== false,
    });

    const messages: { role: 'user' | 'system'; content: string }[] = [];

    if (cmdOpts.file) {
      const spinner = createSpinner(`Loading ${cmdOpts.file}...`).start();
      try {
        const result = await parseFile(cmdOpts.file);
        if (result.method !== 'failed' && result.content.trim()) {
          messages.push({
            role: 'system',
            content: `Context document (${cmdOpts.file}):\n\n${result.content.slice(0, 20000)}`,
          });
          spinner.succeed(`Loaded ${cmdOpts.file}`);
        } else {
          spinner.warn('Could not extract content from file — proceeding without it');
        }
      } catch (err: any) {
        spinner.fail(`Failed to load file: ${err.message}`);
      }
    }

    messages.push({ role: 'user', content: prompt });

    const { streamChat: streamChatFn } = await import('./llm');
    process.stdout.write('\n');
    try {
      await streamChatFn(messages, config, (token) => process.stdout.write(token));
      process.stdout.write('\n\n');
    } catch (err: any) {
      logger.error('Failed to get response', err);
      process.exit(1);
    }
  });

// ── models ────────────────────────────────────────────────────────────────────
program
  .command('models')
  .description('List available Ollama models on this machine')
  .action(async () => {
    const config = loadConfig(program.opts());
    await displayOllamaModels(config);
  });

// ── scan ──────────────────────────────────────────────────────────────────────
program
  .command('scan <path>')
  .description('Scan and read files, print extracted text')
  .action(async (targetPath) => {
    const opts = program.opts();
    const config = loadConfig(opts);

    try {
      const files = scan(targetPath);
      logger.info(`Found ${files.length} supported file(s).`);

      for (const file of files) {
        logger.info(`Parsing ${file.name}...`);
        const result = await parseFile(file.path);
        logger.success(`Extracted ${result.content.length.toLocaleString()} chars (method: ${result.method})`);
        console.log('\n' + result.content.slice(0, 600) + (result.content.length > 600 ? '\n... [TRUNCATED]' : ''));
      }
    } catch (err: any) {
      logger.error('Scan failed', err);
      process.exit(1);
    }
  });

// ── assess ────────────────────────────────────────────────────────────────────
program
  .command('assess <path>')
  .description('Detect academic assessment brief and generate a completion')
  .option('--force', 'Force assessment mode even if brief detection confidence is low')
  .action(async (targetPath, cmdOpts) => {
    const opts = program.opts();
    const config = loadConfig({
      ...opts,
      assessmentMode: cmdOpts.force ? 'force' : opts.assessmentMode,
    });

    try {
      const files = scan(targetPath);
      if (files.length === 0) throw new Error('No supported files found.');

      const file = files[0];
      const spinner = createSpinner(`Parsing ${file.name}...`).start();

      const parseResult = await parseFile(file.path);
      if (parseResult.method === 'failed') {
        spinner.fail('Failed to extract text from document');
        process.exit(1);
      }
      spinner.succeed(`Extracted content (method: ${parseResult.method})`);

      const detection = detectAssessment(parseResult.content);
      if (!detection.isAssessment && config.assessmentMode !== 'force') {
        logger.warn(`Not an assessment brief (confidence: ${detection.confidence.toFixed(2)}). Use --force to override.`);
        process.exit(0);
      }
      logger.success(`Assessment brief detected (confidence: ${detection.confidence.toFixed(2)})`);

      spinner.start('Analysing requirements via LLM...');
      const brief = await parseAssessment(parseResult.content, config);
      spinner.succeed(`Parsed ${brief.tasks.length} task(s) — "${brief.assignmentTitle}"`);

      logger.info('Executing assessment tasks...');
      const execResult = await executeAssessment(brief, config);

      spinner.start('Writing output...');
      await writeOutput(execResult, config.outputDir);
      spinner.succeed('Assessment completed and written.');

    } catch (err: any) {
      logger.error('Assessment failed', err);
      process.exit(1);
    }
  });

// ── config ────────────────────────────────────────────────────────────────────
program
  .command('config')
  .description('Show current active configuration')
  .action(() => {
    const config = loadConfig(program.opts());
    const sanitized = { ...config };
    if (sanitized.apiKey) sanitized.apiKey = '••••••••';
    console.log(JSON.stringify(sanitized, null, 2));
  });

// ── providers (legacy alias) ──────────────────────────────────────────────────
program
  .command('providers')
  .description('Test the active LLM provider')
  .action(async () => {
    const config = loadConfig(program.opts());
    logger.info(`Testing provider: ${config.provider}`);
    const spinner = createSpinner('Pinging LLM...').start();
    try {
      const res = await chat([{ role: 'user', content: 'Reply with: "open-draft is ready."' }], config);
      spinner.succeed(`${res.provider} (${res.model}): ${res.content.trim()}`);
    } catch (err: any) {
      spinner.fail(`Provider test failed: ${err.message}`);
    }
  });
