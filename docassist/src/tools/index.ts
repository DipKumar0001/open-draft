import { ToolDefinition } from '../llm/types';
import { toolReadFile, toolWriteFile, toolListDirectory, toolReadDocument, ToolResult } from './file';
import { toolRunCommand } from './shell';

export { ToolResult };

/** JSON Schema definitions for all tools (sent to models that support tool use) */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the complete contents of a file from the filesystem.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the file.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with the given content.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to write the file to.' },
        content: { type: 'string', description: 'Content to write into the file.' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and folders inside a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command. The user will be prompted to approve it first.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute.' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_document',
    description:
      'Extract text from a document (PDF, DOCX, XLSX, PPTX, images, etc.) using the full parser pipeline.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the document file.' },
      },
      required: ['path'],
    },
  },
];

/** Execute a tool by name with the given arguments */
export async function executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  switch (name) {
    case 'read_file':       return toolReadFile(args as { path: string });
    case 'write_file':      return toolWriteFile(args as { path: string; content: string });
    case 'list_directory':  return toolListDirectory(args as { path: string });
    case 'read_document':   return toolReadDocument(args as { path: string });
    case 'run_command':     return toolRunCommand(args as { command: string });
    default:
      return { success: false, output: '', error: `Unknown tool: ${name}` };
  }
}
