"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchUI = launchUI;
const figlet_1 = __importDefault(require("figlet"));
const boxen_1 = __importDefault(require("boxen"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
const cli_1 = require("./cli");
const config_1 = require("./config");
const repl_1 = require("./repl");
const model_picker_1 = require("./repl/model-picker");
async function launchUI() {
    // Banner
    const title = figlet_1.default.textSync('open-draft', { font: 'Small', horizontalLayout: 'full' });
    console.log((0, boxen_1.default)(chalk_1.default.cyan(title) + '\n\n' +
        chalk_1.default.white('  AI-powered coding & document agent') + '\n' +
        chalk_1.default.gray('  Powered by Ollama • Anthropic • OpenAI'), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
    }));
    const config = (0, config_1.loadConfig)();
    const modelLabel = config.provider === 'ollama'
        ? chalk_1.default.cyan(config.ollamaModel)
        : chalk_1.default.yellow(`${config.provider}/${config.anthropicModel}`);
    console.log(`  ${chalk_1.default.gray('Active model:')} ${modelLabel}\n`);
    // Main Menu
    const response = await (0, prompts_1.default)({
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
        await (0, repl_1.startRepl)(config);
        return;
    }
    if (response.action === 'models') {
        await (0, model_picker_1.displayOllamaModels)(config);
        return;
    }
    if (response.action === 'config') {
        await cli_1.program.parseAsync(['node', 'open-draft', 'config']);
        return;
    }
    if (response.action === 'providers') {
        await cli_1.program.parseAsync(['node', 'open-draft', 'providers']);
        return;
    }
    // File prompt for scan or assess
    const filePrompt = await (0, prompts_1.default)({
        type: 'text',
        name: 'path',
        message: 'Enter the file or directory path:',
    });
    if (!filePrompt.path) {
        process.exit(0);
    }
    await cli_1.program.parseAsync(['node', 'open-draft', response.action, filePrompt.path]);
}
