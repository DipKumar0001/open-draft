"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPythonFallback = runPythonFallback;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const logger_1 = require("../utils/logger");
const execAsync = util_1.default.promisify(child_process_1.exec);
async function runPythonFallback(filepath) {
    const scriptPath = path_1.default.join(__dirname, '..', 'python', 'converter.py');
    try {
        const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${filepath}"`);
        if (stderr && stderr.trim().length > 0) {
            logger_1.logger.debug(`Python fallback stderr: ${stderr}`);
        }
        const result = JSON.parse(stdout);
        if (result.error) {
            throw new Error(`Python script error: ${result.error}`);
        }
        return result.content;
    }
    catch (err) {
        logger_1.logger.debug(`Python fallback failed: ${err.message}`);
        throw err;
    }
}
