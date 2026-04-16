import readline from 'readline';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { OpenDraftConfig } from '../config';
import { ConversationMemory } from '../session/memory';
import { buildMessages } from '../session/context';
import { streamChat } from '../llm';
import { parseFile } from '../parser';
import { logger } from '../utils/logger';
import { pickOllamaModel, displayOllamaModels } from './model-picker';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TerminalRenderer = require('marked-terminal');

let marked: any;

async function loadMarkdownRenderer() {
  try {
    const { marked: m } = await import('marked');
    const renderer = new TerminalRenderer();
    m.use({ renderer });
    marked = m;
  } catch {
    // Markdown rendering not available — plain text
  }
}

function renderMarkdown(text: string): string {
  if (marked) {
    try {
      return marked.parse(text) as string;
    } catch {
      return text;
    }
  }
  return text;
}

function printBanner(config: OpenDraftConfig) {
  const modelStr = config.provider === 'ollama'
    ? chalk.cyan(config.ollamaModel)
    : chalk.yellow(`${config.provider}/${config.provider === 'anthropic' ? config.anthropicModel : config.openaiModel}`);

  console.log('');
  console.log(chalk.bold.cyan('  ╔═══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('  open-draft') + chalk.gray(' — AI-powered coding & document agent  ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚═══════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(`  ${chalk.gray('Model:')}   ${modelStr}`);
  console.log(`  ${chalk.gray('Provider:')} ${chalk.white(config.provider)}`);
  console.log('');
  console.log(chalk.gray(`  Type a message. Slash commands: /help, /file <path>, /model, /clear, /save, /exit`));
  console.log('');
}

function printStatusBar(config: OpenDraftConfig, memory: ConversationMemory) {
  const model =
    config.provider === 'ollama' ? config.ollamaModel : config.anthropicModel;
  const msgs = memory.messageCount;
  const docs = memory.documentCount;

  const parts = [
    chalk.gray('model:') + chalk.cyan(` ${model}`),
    msgs > 0 ? chalk.gray('msgs:') + chalk.white(` ${msgs}`) : '',
    docs > 0 ? chalk.gray('docs:') + chalk.yellow(` ${docs}`) : '',
  ].filter(Boolean).join(chalk.gray(' │ '));

  process.stdout.write(chalk.gray(`\n  [${parts}]\n`));
}

function printHelp() {
  console.log('');
  console.log(chalk.bold.white('  Slash Commands'));
  console.log(chalk.gray('  ───────────────────────────────────────────────────────'));
  const cmds = [
    ['/file <path>',    'Load a document into the conversation context'],
    ['/clear',          'Clear conversation history (keeps documents)'],
    ['/reset',          'Clear everything (history + documents)'],
    ['/model [name]',   'Switch Ollama model interactively or by name'],
    ['/models',         'List all available Ollama models'],
    ['/docs',           'List documents currently in context'],
    ['/save [file]',    'Save conversation to a JSON file'],
    ['/tools',          'List available agentic tools'],
    ['/help',           'Show this help message'],
    ['/exit',           'Exit open-draft'],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${chalk.cyan(cmd.padEnd(22))} ${chalk.gray(desc)}`);
  }
  console.log('');
}

async function handleSlashCommand(
  input: string,
  config: OpenDraftConfig,
  memory: ConversationMemory,
  setConfig: (c: Partial<OpenDraftConfig>) => void
): Promise<boolean> {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');

  switch (cmd) {
    case '/exit':
    case '/quit':
      console.log(chalk.gray('\n  Goodbye! 👋\n'));
      process.exit(0);

    case '/help':
      printHelp();
      return true;

    case '/clear':
      memory.clearMessages();
      console.log(chalk.green('  ✔ Conversation cleared. Documents kept.'));
      return true;

    case '/reset':
      memory.clear();
      console.log(chalk.green('  ✔ Full reset. Conversation and documents cleared.'));
      return true;

    case '/file': {
      if (!arg) {
        logger.warn('Usage: /file <path-to-document>');
        return true;
      }
      const resolvedPath = path.resolve(arg);
      if (!fs.existsSync(resolvedPath)) {
        logger.error(`File not found: ${resolvedPath}`);
        return true;
      }
      process.stdout.write(chalk.gray(`  Parsing ${path.basename(resolvedPath)}...`));
      try {
        const result = await parseFile(resolvedPath);
        if (result.method === 'failed' || !result.content.trim()) {
          process.stdout.write('\r' + ' '.repeat(60) + '\r');
          logger.error('Failed to extract content from this file.');
        } else {
          memory.addDocument(resolvedPath, result.content, path.basename(resolvedPath));
          process.stdout.write('\r' + ' '.repeat(60) + '\r');
          console.log(
            chalk.green(`  ✔ Loaded`) +
            chalk.white(` ${path.basename(resolvedPath)}`) +
            chalk.gray(` (${result.content.length.toLocaleString()} chars, method: ${result.method})`)
          );
        }
      } catch (err: any) {
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
        logger.error(`Failed to load file: ${err.message}`);
      }
      return true;
    }

    case '/docs': {
      const docs = memory.getDocuments();
      if (docs.length === 0) {
        console.log(chalk.gray('  No documents loaded. Use /file <path> to add one.'));
      } else {
        console.log('');
        docs.forEach((d, i) => {
          console.log(
            `  ${chalk.cyan(`${i + 1}.`)} ${chalk.white(d.label)} ` +
            chalk.gray(`(${d.content.length.toLocaleString()} chars)`)
          );
        });
        console.log('');
      }
      return true;
    }

    case '/model': {
      if (arg) {
        setConfig({ ollamaModel: arg });
        console.log(chalk.green(`  ✔ Model switched to ${chalk.cyan(arg)}`));
      } else {
        const chosen = await pickOllamaModel(config);
        setConfig({ ollamaModel: chosen });
        console.log(chalk.green(`  ✔ Model switched to ${chalk.cyan(chosen)}`));
      }
      return true;
    }

    case '/models': {
      await displayOllamaModels(config);
      return true;
    }

    case '/save': {
      const sessionsDir = path.join(os.homedir(), '.open-draft', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = arg
        ? path.resolve(arg)
        : path.join(sessionsDir, `session-${ts}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(memory.toJSON(), null, 2), 'utf-8');
      console.log(chalk.green(`  ✔ Session saved to ${outputPath}`));
      return true;
    }

    case '/tools': {
      console.log('');
      console.log(chalk.bold.white('  Available Tools'));
      console.log(chalk.gray('  ─────────────────────────────────────────'));
      const tools = [
        ['read_file',       'Read a file from the filesystem'],
        ['write_file',      'Create or overwrite a file'],
        ['list_directory',  'List contents of a directory'],
        ['run_command',     'Execute a shell command (requires approval)'],
        ['read_document',   'Parse documents: PDF, DOCX, XLSX, PPTX, images'],
      ];
      for (const [name, desc] of tools) {
        console.log(`  ${chalk.cyan(name.padEnd(20))} ${chalk.gray(desc)}`);
      }
      console.log('');
      return true;
    }

    default:
      if (cmd.startsWith('/')) {
        logger.warn(`Unknown command: ${cmd}. Type /help for available commands.`);
        return true;
      }
      return false; // Not a slash command
  }
}

function getPromptPrefix() {
  return chalk.bold.cyan('\n  ❯ ');
}

function getAssistantPrefix() {
  return chalk.bold.white('\n  ◎ open-draft\n');
}

/** Main REPL entry point */
export async function startRepl(
  initialConfig: OpenDraftConfig,
  preloadFile?: string
): Promise<void> {
  await loadMarkdownRenderer();

  // Mutable config reference (allows mid-session model switch)
  let config = { ...initialConfig };
  const memory = new ConversationMemory(config.maxContextMessages);

  const setConfig = (updates: Partial<OpenDraftConfig>) => {
    config = { ...config, ...updates };
  };

  printBanner(config);

  // Pre-load a file if passed via --file flag
  if (preloadFile) {
    const resolvedPath = path.resolve(preloadFile);
    if (fs.existsSync(resolvedPath)) {
      process.stdout.write(chalk.gray(`  Pre-loading ${path.basename(resolvedPath)}...`));
      try {
        const result = await parseFile(resolvedPath);
        if (result.method !== 'failed' && result.content.trim()) {
          memory.addDocument(resolvedPath, result.content, path.basename(resolvedPath));
          process.stdout.write('\r' + ' '.repeat(60) + '\r');
          console.log(
            chalk.green(`  ✔ Pre-loaded`) +
            chalk.white(` ${path.basename(resolvedPath)}`) +
            chalk.gray(` (${result.content.length.toLocaleString()} chars)`)
          );
        }
      } catch (err: any) {
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
        logger.warn(`Could not pre-load file: ${err.message}`);
      }
    }
  }

  const rl = readline.createInterface({
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

    const messages = buildMessages(input, memory, config);

    process.stdout.write(getAssistantPrefix());

    let fullResponse = '';
    let lineBuffer = '';
    let inCodeBlock = false;

    try {
      await streamChat(messages, config, (token: string) => {
        fullResponse += token;
        lineBuffer += token;

        // Track code block state for colour rendering
        const lines = lineBuffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('```')) inCodeBlock = !inCodeBlock;

          if (inCodeBlock) {
            process.stdout.write(chalk.yellow(line) + '\n');
          } else {
            process.stdout.write(chalk.white(line) + '\n');
          }
        }
        lineBuffer = lines[lines.length - 1];
      });

      // Flush any remaining buffer
      if (lineBuffer) {
        if (lineBuffer.startsWith('```')) inCodeBlock = !inCodeBlock;
        process.stdout.write(
          (inCodeBlock ? chalk.yellow(lineBuffer) : chalk.white(lineBuffer)) + '\n'
        );
      }

    } catch (err: any) {
      const msg = err.message || String(err);
      console.error(chalk.red(`\n  ✖ ${msg}`));

      if (msg.includes('ollama') || msg.includes('Ollama') || msg.includes('ECONNREFUSED')) {
        console.log(chalk.gray('  → Ensure Ollama is running: ') + chalk.cyan('ollama serve'));
        console.log(chalk.gray('  → Pull a model: ') + chalk.cyan('ollama pull llama3.2'));
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
    console.log(chalk.gray('\n  Session ended. Goodbye! 👋\n'));
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.gray('\n\n  Interrupted. Type /exit or press Ctrl+C again to quit.\n'));
    promptUser();
    rl.resume();
  });
}
