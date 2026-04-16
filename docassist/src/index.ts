#!/usr/bin/env node

import { program } from './cli';
import { loadConfig } from './config';
import { startRepl } from './repl';

async function main() {
  const args = process.argv.slice(2);

  // No arguments → launch REPL (Claude Code-style default)
  if (args.length === 0) {
    const config = loadConfig();
    await startRepl(config);
    return;
  }

  // First arg starts with a flag/option rather than a subcommand → infer chat/REPL
  // e.g. `open-draft --model llama3.2` or `open-draft --file doc.pdf`
  const firstArg = args[0];
  const knownSubcommands = ['chat', 'ask', 'scan', 'assess', 'models', 'config', 'providers', '--help', '-h', '--version', '-V'];

  if (firstArg.startsWith('--') && !knownSubcommands.includes(firstArg)) {
    // Treat as: open-draft [global-options] → launch REPL
    await program.parseAsync(process.argv);
    // If we get here without hitting a subcommand, start REPL
    const opts = program.opts();
    const config = loadConfig({
      provider: opts.provider,
      ollamaModel: opts.model,
      verbose: opts.verbose,
      apiKey: opts.apiKey,
      apiUrl: opts.apiUrl,
      streamOutput: opts.stream !== false,
    });
    await startRepl(config, opts.file);
    return;
  }

  // Normal commander routing
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
