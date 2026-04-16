"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolReadFile = toolReadFile;
exports.toolWriteFile = toolWriteFile;
exports.toolListDirectory = toolListDirectory;
exports.toolReadDocument = toolReadDocument;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parser_1 = require("../parser");
// ─── read_file ────────────────────────────────────────────────────────────────
async function toolReadFile(args) {
    try {
        const resolvedPath = path_1.default.resolve(args.path);
        if (!fs_1.default.existsSync(resolvedPath)) {
            return { success: false, output: '', error: `File not found: ${resolvedPath}` };
        }
        const content = fs_1.default.readFileSync(resolvedPath, 'utf-8');
        return { success: true, output: content };
    }
    catch (err) {
        return { success: false, output: '', error: err.message };
    }
}
// ─── write_file ───────────────────────────────────────────────────────────────
async function toolWriteFile(args) {
    try {
        const resolvedPath = path_1.default.resolve(args.path);
        const dir = path_1.default.dirname(resolvedPath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(resolvedPath, args.content, 'utf-8');
        return { success: true, output: `Written ${args.content.length} chars to ${resolvedPath}` };
    }
    catch (err) {
        return { success: false, output: '', error: err.message };
    }
}
// ─── list_directory ───────────────────────────────────────────────────────────
async function toolListDirectory(args) {
    try {
        const resolvedPath = path_1.default.resolve(args.path);
        if (!fs_1.default.existsSync(resolvedPath)) {
            return { success: false, output: '', error: `Path not found: ${resolvedPath}` };
        }
        const entries = fs_1.default.readdirSync(resolvedPath, { withFileTypes: true });
        const lines = entries.map((e) => {
            const prefix = e.isDirectory() ? '📁' : '📄';
            return `${prefix} ${e.name}`;
        });
        return { success: true, output: lines.join('\n') };
    }
    catch (err) {
        return { success: false, output: '', error: err.message };
    }
}
// ─── read_document ────────────────────────────────────────────────────────────
async function toolReadDocument(args) {
    try {
        const result = await (0, parser_1.parseFile)(args.path);
        if (result.method === 'failed' || !result.content.trim()) {
            return { success: false, output: '', error: 'Failed to extract content from document.' };
        }
        return { success: true, output: result.content };
    }
    catch (err) {
        return { success: false, output: '', error: err.message };
    }
}
