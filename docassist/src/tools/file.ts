import fs from 'fs';
import path from 'path';
import { parseFile } from '../parser';

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// ─── read_file ────────────────────────────────────────────────────────────────

export async function toolReadFile(args: { path: string }): Promise<ToolResult> {
  try {
    const resolvedPath = path.resolve(args.path);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, output: '', error: `File not found: ${resolvedPath}` };
    }
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return { success: true, output: content };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

// ─── write_file ───────────────────────────────────────────────────────────────

export async function toolWriteFile(args: { path: string; content: string }): Promise<ToolResult> {
  try {
    const resolvedPath = path.resolve(args.path);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolvedPath, args.content, 'utf-8');
    return { success: true, output: `Written ${args.content.length} chars to ${resolvedPath}` };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

// ─── list_directory ───────────────────────────────────────────────────────────

export async function toolListDirectory(args: { path: string }): Promise<ToolResult> {
  try {
    const resolvedPath = path.resolve(args.path);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, output: '', error: `Path not found: ${resolvedPath}` };
    }
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const lines = entries.map((e) => {
      const prefix = e.isDirectory() ? '📁' : '📄';
      return `${prefix} ${e.name}`;
    });
    return { success: true, output: lines.join('\n') };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

// ─── read_document ────────────────────────────────────────────────────────────

export async function toolReadDocument(args: { path: string }): Promise<ToolResult> {
  try {
    const result = await parseFile(args.path);
    if (result.method === 'failed' || !result.content.trim()) {
      return { success: false, output: '', error: 'Failed to extract content from document.' };
    }
    return { success: true, output: result.content };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}
