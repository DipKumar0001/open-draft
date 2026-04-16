import figlet from 'figlet';
import boxen from 'boxen';
import prompts from 'prompts';
import chalk from 'chalk';
import { program } from './cli';
import { loadConfig } from './config';
import { startRepl } from './repl';
import { displayOllamaModels } from './repl/model-picker';

export async function launchUI() {
  // Banner
  const title = figlet.textSync('open-draft', { font: 'Small', horizontalLayout: 'full' });
  console.log(
    boxen(
      chalk.cyan(title) + '\n\n' +
      chalk.white('  AI-powered coding & document agent') + '\n' +
      chalk.gray('  Powered by Ollama • Anthropic • OpenAI'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
      }
    )
  );

  const config = loadConfig();
  const modelLabel =
    config.provider === 'ollama'
      ? chalk.cyan(config.ollamaModel)
      : chalk.yellow(`${config.provider}/${config.anthropicModel}`);

  console.log(`  ${chalk.gray('Active model:')} ${modelLabel}\n`);

  // Main Menu
  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: '💬 Start Chat Session',
        description: 'Interactive agentic REPL — talk, code, read & write files',
        value: 'chat',
      },
      {
        title: '🔍 Scan a Document',
        description: 'Extract and display text from a file',
        value: 'scan',
      },
      {
        title: '🎓 Assess an Assignment',
        description: 'Detect brief and generate academic assignment',
        value: 'assess',
      },
      {
        title: '🤖 List Ollama Models',
        description: 'See locally available Ollama models',
        value: 'models',
      },
      {
        title: '⚙️  View Configuration',
        description: 'Show active config and providers',
        value: 'config',
      },
      {
        title: '🌐 Test Providers',
        description: 'Ping configured LLMs',
        value: 'providers',
      },
      { title: '❌ Exit', value: 'exit' },
    ],
  });

  if (!response.action || response.action === 'exit') {
    process.exit(0);
  }

  // Direct REPL launch (most common case)
  if (response.action === 'chat') {
    await startRepl(config);
    return;
  }

  if (response.action === 'models') {
    await displayOllamaModels(config);
    return;
  }

  if (response.action === 'config') {
    await program.parseAsync(['node', 'open-draft', 'config']);
    return;
  }

  if (response.action === 'providers') {
    await program.parseAsync(['node', 'open-draft', 'providers']);
    return;
  }

  // File prompt for scan or assess
  const filePrompt = await prompts({
    type: 'text',
    name: 'path',
    message: 'Enter the file or directory path:',
  });

  if (!filePrompt.path) {
    process.exit(0);
  }

  await program.parseAsync(['node', 'open-draft', response.action, filePrompt.path]);
}
