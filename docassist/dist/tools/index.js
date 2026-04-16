"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITIONS = void 0;
exports.executeTool = executeTool;
const file_1 = require("./file");
const shell_1 = require("./shell");
/** JSON Schema definitions for all tools (sent to models that support tool use) */
exports.TOOL_DEFINITIONS = [
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
        description: 'Extract text from a document (PDF, DOCX, XLSX, PPTX, images, etc.) using the full parser pipeline.',
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
async function executeTool(name, args) {
    switch (name) {
        case 'read_file': return (0, file_1.toolReadFile)(args);
        case 'write_file': return (0, file_1.toolWriteFile)(args);
        case 'list_directory': return (0, file_1.toolListDirectory)(args);
        case 'read_document': return (0, file_1.toolReadDocument)(args);
        case 'run_command': return (0, shell_1.toolRunCommand)(args);
        default:
            return { success: false, output: '', error: `Unknown tool: ${name}` };
    }
}
