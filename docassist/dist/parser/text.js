"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseText = parseText;
const fs_1 = __importDefault(require("fs"));
async function parseText(filepath) {
    return fs_1.default.readFileSync(filepath, 'utf-8');
}
