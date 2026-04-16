"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = scan;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const logger_1 = require("./utils/logger");
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
function getIgnores(dir) {
    const ignorePath = path_1.default.join(dir, '.docassistignore');
    if (fs_1.default.existsSync(ignorePath)) {
        try {
            const content = fs_1.default.readFileSync(ignorePath, 'utf8');
            return content.split('\
')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
        }
        catch (e) {
            logger_1.logger.warn(`Failed to read .docassistignore: ${e}`);
        }
    }
    return [];
}
function scan(targetPath) {
    let target = path_1.default.resolve(targetPath);
    if (!fs_1.default.existsSync(target)) {
        throw new Error(`Path does not exist: ${target}`);
    }
    const stat = fs_1.default.statSync(target);
    let files = [];
    if (stat.isFile()) {
        files = [target];
    }
    else if (stat.isDirectory()) {
        const ignores = getIgnores(target);
        files = (0, glob_1.globSync)('**/*', {
            cwd: target,
            absolute: true,
            nodir: true,
            ignore: ['node_modules/**', '.git/**', ...ignores]
        });
    }
    const results = [];
    for (const file of files) {
        const ext = path_1.default.extname(file).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
            results.push({
                path: file,
                extension: ext,
                size: fs_1.default.statSync(file).size,
                name: path_1.default.basename(file)
            });
        }
    }
    return results;
}
