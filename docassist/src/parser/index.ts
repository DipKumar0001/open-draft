import { logger } from '../utils/logger';
import { runPythonFallback } from './fallback';
import { parsePdf } from './pdf';
import { parseDocx } from './docx';
import { parseXlsx } from './xlsx';
import { parseCsv } from './csv';
import { parsePptx } from './pptx';
import { parseText } from './text';
import path from 'path';

export interface ParseResult {
  path: string;
  content: string;
  method: 'node' | 'python' | 'failed';
  metadata: any;
}

export async function parseFile(filepath: string): Promise<ParseResult> {
  const ext = path.extname(filepath).toLowerCase();
  let content = '';
  let method: 'node' | 'python' | 'failed' = 'failed';
  
  try {
    switch (ext) {
      case '.pdf': content = await parsePdf(filepath); break;
      case '.docx': content = await parseDocx(filepath); break;
      case '.xlsx':
      case '.xls': content = await parseXlsx(filepath); break;
      case '.csv': content = await parseCsv(filepath); break;
      case '.pptx':
      case '.ppt': content = await parsePptx(filepath); break;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.webp':
      case '.bmp':
      case '.tiff': {
        const { parseImage } = await import('./image');
        content = await parseImage(filepath);
        break;
      }
      case '.txt':
      case '.md': content = await parseText(filepath); break;
      default:
        content = await parseText(filepath); // Default fallback
    }

    if (content && content.trim().length > 0) {
      method = 'node';
    } else {
      throw new Error('Node parser returned empty content');
    }
  } catch (err: any) {
    logger.debug(`Node parser failed for ${filepath}: ${err.message}`);
    
    // Attempt Python fallback
    try {
      if (!global.verboseMode && process.env.DOCASSIST_NO_PYTHON !== '1') {
        content = await runPythonFallback(filepath);
        if (content && content.trim().length > 0) {
          method = 'python';
        } else {
          method = 'failed';
        }
      } else {
        method = 'failed';
      }
    } catch (fallbackErr: any) {
      logger.warn(`Both Node and Python fallback failed for ${path.basename(filepath)}: ${fallbackErr.message}`);
      method = 'failed';
    }
  }

  return {
    path: filepath,
    content,
    method,
    metadata: { ext }
  };
}
