#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const ui_1 = require("./ui");
const config_1 = require("./config");
const repl_1 = require("./repl");
async function main() {
    const args = process.argv.slice(2);
    // No arguments → launch interactive menu UI
    if (args.length === 0) {
        await (0, ui_1.launchUI)();
        return;
    }
    // First arg starts with a flag/option rather than a subcommand → infer chat/REPL
    // e.g. `open-draft --model llama3.2` or `open-draft --file doc.pdf`
    const firstArg = args[0];
    const knownSubcommands = ['chat', 'ask', 'scan', 'assess', 'models', 'config', 'providers', '--help', '-h', '--version', '-V'];
    if (firstArg.startsWith('--') && !knownSubcommands.includes(firstArg)) {
        // Treat as: open-draft [global-options] → launch REPL
        await cli_1.program.parseAsync(process.argv);
        // If we get here without hitting a subcommand, start REPL
        const opts = cli_1.program.opts();
        const config = (0, config_1.loadConfig)({
            provider: opts.provider,
            ollamaModel: opts.model,
            verbose: opts.verbose,
            apiKey: opts.apiKey,
            apiUrl: opts.apiUrl,
            streamOutput: opts.stream !== false,
        });
        await (0, repl_1.startRepl)(config, opts.file);
        return;
    }
    // Normal commander routing
    await cli_1.program.parseAsync(process.argv);
}
main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
