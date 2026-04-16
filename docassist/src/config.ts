import { cosmiconfigSync } from 'cosmiconfig';

export interface OpenDraftConfig {
  // Provider
  provider: 'ollama' | 'anthropic' | 'openai' | 'custom';
  // Ollama
  ollamaModel: string;
  ollamaBaseUrl: string;
  // Cloud providers
  anthropicModel: string;
  openaiModel: string;
  // Output
  outputDir: string;
  // Parsing
  pythonFallback: boolean;
  // UX
  verbose: boolean;
  streamOutput: boolean;
  // Assessment mode
  assessmentMode: 'auto' | 'force' | 'skip';
  // Agentic
  tools: string[];
  maxContextMessages: number;
  // Prompts
  systemPrompt?: string;
  // Auth
  apiKey?: string;
  apiUrl?: string;
}

/** Legacy alias for backwards compatibility */
export type DocAssistConfig = OpenDraftConfig;

const DEFAULT_CONFIG: OpenDraftConfig = {
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

export function loadConfig(cliOptions: Partial<OpenDraftConfig> = {}): OpenDraftConfig {
  // Search for open-draft config first, fall back to docassist for backwards compat
  const explorer = cosmiconfigSync('open-draft');
  const legacyExplorer = cosmiconfigSync('docassist');

  const result = explorer.search() || legacyExplorer.search();
  const fileConfig = result?.config || {};

  const envConfig: Partial<OpenDraftConfig> = {};

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

  const finalConfig: OpenDraftConfig = {
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
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const data = await response.json() as { models?: { name: string }[] };
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}
