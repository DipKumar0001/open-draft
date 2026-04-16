import prompts from 'prompts';
import chalk from 'chalk';
import { listOllamaModels } from '../llm/ollama';
import { OpenDraftConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Interactively pick an Ollama model from locally available ones.
 * Returns the chosen model name, or the current config model if no selection made.
 */
export async function pickOllamaModel(config: OpenDraftConfig): Promise<string> {
  process.stdout.write(chalk.gray('  Fetching Ollama models...'));

  const models = await listOllamaModels(config.ollamaBaseUrl);

  // Clear the fetching line
  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  if (models.length === 0) {
    logger.warn(
      `No Ollama models found at ${config.ollamaBaseUrl}. ` +
      `Using default: ${chalk.cyan(config.ollamaModel)}\n` +
      chalk.gray(`  → Pull a model with: ollama pull llama3.2`)
    );
    return config.ollamaModel;
  }

  const choices = models.map((m) => ({
    title: chalk.cyan(m.name) + chalk.gray(` (${m.size})`),
    value: m.name,
  }));

  // Pre-select current model if it's in the list
  const currentIdx = models.findIndex((m) => m.name === config.ollamaModel);
  
  const response = await prompts({
    type: 'select',
    name: 'model',
    message: 'Select Ollama model',
    choices,
    initial: currentIdx >= 0 ? currentIdx : 0,
  });

  if (!response.model) return config.ollamaModel;
  return response.model;
}

/**
 * Display a table of available Ollama models (non-interactive, for the `models` command)
 */
export async function displayOllamaModels(config: OpenDraftConfig): Promise<void> {
  process.stdout.write(chalk.gray('  Fetching available models from Ollama...\n'));
  const models = await listOllamaModels(config.ollamaBaseUrl);

  if (models.length === 0) {
    logger.warn(
      `No models found at ${config.ollamaBaseUrl}.\n` +
      chalk.gray(`  Pull a model: ollama pull llama3.2`)
    );
    return;
  }

  console.log('');
  console.log(chalk.bold.cyan('  Available Ollama Models'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  for (const m of models) {
    const isActive = m.name === config.ollamaModel;
    const indicator = isActive ? chalk.green('  ● ') : chalk.gray('  ○ ');
    const name = isActive ? chalk.bold.cyan(m.name) : chalk.white(m.name);
    const size = chalk.gray(`${m.size}`);
    const tag = isActive ? chalk.green(' (active)') : '';
    console.log(`${indicator}${name}  ${size}${tag}`);
  }
  console.log('');
}
