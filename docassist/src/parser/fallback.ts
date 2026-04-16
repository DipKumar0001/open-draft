import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import { logger } from '../utils/logger';

const execAsync = util.promisify(exec);

export async function runPythonFallback(filepath: string): Promise<string> {
  const scriptPath = path.join(__dirname, '..', 'python', 'converter.py');
  try {
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${filepath}"`);
    
    if (stderr && stderr.trim().length > 0) {
      logger.debug(`Python fallback stderr: ${stderr}`);
    }

    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(`Python script error: ${result.error}`);
    }

    return result.content;
  } catch (err: any) {
    logger.debug(`Python fallback failed: ${err.message}`);
    throw err;
  }
}
