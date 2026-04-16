import { exec } from 'child_process';
import util from 'util';
import readline from 'readline';
import chalk from 'chalk';

const execAsync = util.promisify(exec);

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

/** Ask the user for approval before running a shell command */
async function confirmCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = chalk.yellow(`\n⚠  open-draft wants to run:\n  ${chalk.white(command)}\n\nAllow? [y/N] `);
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

export async function toolRunCommand(
  args: { command: string },
  skipApproval = false
): Promise<ToolResult> {
  try {
    const approved = skipApproval || (await confirmCommand(args.command));
    if (!approved) {
      return { success: false, output: '', error: 'Command rejected by user.' };
    }

    const { stdout, stderr } = await execAsync(args.command, {
      shell: '/bin/zsh',
      timeout: 30_000,
    });

    const output = [stdout, stderr].filter(Boolean).join('\n').trim();
    return { success: true, output: output || '(no output)' };
  } catch (err: any) {
    return {
      success: false,
      output: err.stdout || '',
      error: err.stderr || err.message,
    };
  }
}
