"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRunCommand = toolRunCommand;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const execAsync = util_1.default.promisify(child_process_1.exec);
/** Ask the user for approval before running a shell command */
async function confirmCommand(command) {
    return new Promise((resolve) => {
        const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
        const question = chalk_1.default.yellow(`\n⚠  open-draft wants to run:\n  ${chalk_1.default.white(command)}\n\nAllow? [y/N] `);
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
}
async function toolRunCommand(args, skipApproval = false) {
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
    }
    catch (err) {
        return {
            success: false,
            output: err.stdout || '',
            error: err.stderr || err.message,
        };
    }
}
