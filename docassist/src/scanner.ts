import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { logger } from './utils/logger';

export interface ScanResult {
  path: string;
  extension: string;
  size: number;
  name: string;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];

function getIgnores(dir: string): string[] {
  const ignorePath = path.join(dir, '.docassistignore');
  if (fs.existsSync(ignorePath)) {
    try {
      const content = fs.readFileSync(ignorePath, 'utf8');
      return content.split('\
')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (e) {
      logger.warn(`Failed to read .docassistignore: ${e}`);
    }
  }
  return [];
}

export function scan(targetPath: string): ScanResult[] {
  let target = path.resolve(targetPath);
  
  if (!fs.existsSync(target)) {
    throw new Error(`Path does not exist: ${target}`);
  }

  const stat = fs.statSync(target);
  let files: string[] = [];

  if (stat.isFile()) {
    files = [target];
  } else if (stat.isDirectory()) {
    const ignores = getIgnores(target);
    files = globSync('**/*', {
      cwd: target,
      absolute: true,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', ...ignores]
    });
  }

  const results: ScanResult[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      results.push({
        path: file,
        extension: ext,
        size: fs.statSync(file).size,
        name: path.basename(file)
      });
    }
  }

  return results;
}
