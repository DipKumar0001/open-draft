"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.listOllamaModels = listOllamaModels;
const cosmiconfig_1 = require("cosmiconfig");
const DEFAULT_CONFIG = {
    provider: 'ollama',
    ollamaModel: 'llama3.2',
    ollamaBaseUrl: 'http://localhost:11434',
    anthropicModel: 'claude-opus-4-5',
    openaiModel: 'gpt-4o',
    outputDir: './open-draft-output',
    pythonFallback: true,
    verbose: false,
    streamOutput: true,
    assessmentMode: 'auto',
    tools: ['read_file', 'write_file', 'list_directory', 'run_command', 'read_document'],
    maxContextMessages: 40,
};
function loadConfig(cliOptions = {}) {
    // Search for open-draft config first, fall back to docassist for backwards compat
    const explorer = (0, cosmiconfig_1.cosmiconfigSync)('open-draft');
    const legacyExplorer = (0, cosmiconfig_1.cosmiconfigSync)('docassist');
    const result = explorer.search() || legacyExplorer.search();
    const fileConfig = result?.config || {};
    const envConfig = {};
    // API key resolution from env
    if (process.env.ANTHROPIC_API_KEY && !fileConfig.apiKey && !cliOptions.apiKey) {
        envConfig.apiKey = process.env.ANTHROPIC_API_KEY;
        if (!fileConfig.provider && !cliOptions.provider) {
            envConfig.provider = 'anthropic';
        }
    }
    if (process.env.OPENAI_API_KEY && !fileConfig.apiKey && !cliOptions.apiKey && !envConfig.apiKey) {
        envConfig.apiKey = process.env.OPENAI_API_KEY;
        if (!fileConfig.provider && !cliOptions.provider && !envConfig.provider) {
            envConfig.provider = 'openai';
        }
    }
    if (process.env.OPEN_DRAFT_VERBOSE || process.env.DOCASSIST_VERBOSE) {
        envConfig.verbose = true;
    }
    const finalConfig = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...envConfig,
        ...cliOptions
    };
    // Sync verbose global
    global.verboseMode = finalConfig.verbose;
    return finalConfig;
}
/** Fetch available Ollama models from the local server */
async function listOllamaModels(baseUrl) {
    try {
        const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!response.ok)
            return [];
        const data = await response.json();
        return (data.models || []).map((m) => m.name);
    }
    catch {
        return [];
    }
}
