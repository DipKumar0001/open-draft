"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickOllamaModel = pickOllamaModel;
exports.displayOllamaModels = displayOllamaModels;
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
const ollama_1 = require("../llm/ollama");
const logger_1 = require("../utils/logger");
/**
 * Interactively pick an Ollama model from locally available ones.
 * Returns the chosen model name, or the current config model if no selection made.
 */
async function pickOllamaModel(config) {
    process.stdout.write(chalk_1.default.gray('  Fetching Ollama models...'));
    const models = await (0, ollama_1.listOllamaModels)(config.ollamaBaseUrl);
    // Clear the fetching line
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
    if (models.length === 0) {
        logger_1.logger.warn(`No Ollama models found at ${config.ollamaBaseUrl}. ` +
            `Using default: ${chalk_1.default.cyan(config.ollamaModel)}\n` +
            chalk_1.default.gray(`  → Pull a model with: ollama pull llama3.2`));
        return config.ollamaModel;
    }
    const choices = models.map((m) => ({
        title: chalk_1.default.cyan(m.name) + chalk_1.default.gray(` (${m.size})`),
        value: m.name,
    }));
    // Pre-select current model if it's in the list
    const currentIdx = models.findIndex((m) => m.name === config.ollamaModel);
    const response = await (0, prompts_1.default)({
        type: 'select',
        name: 'model',
        message: 'Select Ollama model',
        choices,
        initial: currentIdx >= 0 ? currentIdx : 0,
    });
    if (!response.model)
        return config.ollamaModel;
    return response.model;
}
/**
 * Display a table of available Ollama models (non-interactive, for the `models` command)
 */
async function displayOllamaModels(config) {
    process.stdout.write(chalk_1.default.gray('  Fetching available models from Ollama...\n'));
    const models = await (0, ollama_1.listOllamaModels)(config.ollamaBaseUrl);
    if (models.length === 0) {
        logger_1.logger.warn(`No models found at ${config.ollamaBaseUrl}.\n` +
            chalk_1.default.gray(`  Pull a model: ollama pull llama3.2`));
        return;
    }
    console.log('');
    console.log(chalk_1.default.bold.cyan('  Available Ollama Models'));
    console.log(chalk_1.default.gray('  ─────────────────────────────────────────'));
    for (const m of models) {
        const isActive = m.name === config.ollamaModel;
        const indicator = isActive ? chalk_1.default.green('  ● ') : chalk_1.default.gray('  ○ ');
        const name = isActive ? chalk_1.default.bold.cyan(m.name) : chalk_1.default.white(m.name);
        const size = chalk_1.default.gray(`${m.size}`);
        const tag = isActive ? chalk_1.default.green(' (active)') : '';
        console.log(`${indicator}${name}  ${size}${tag}`);
    }
    console.log('');
}
