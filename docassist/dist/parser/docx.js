"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocx = parseDocx;
const mammoth_1 = __importDefault(require("mammoth"));
async function parseDocx(filepath) {
    const result = await mammoth_1.default.extractRawText({ path: filepath });
    return result.value;
}
