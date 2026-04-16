"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsv = parseCsv;
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-parse/sync");
async function parseCsv(filepath) {
    const content = fs_1.default.readFileSync(filepath, 'utf8');
    const records = (0, sync_1.parse)(content, { skip_empty_lines: true });
    return records.map((row) => row.join(',')).join('\
');
}
