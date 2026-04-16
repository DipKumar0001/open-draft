"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdf = parsePdf;
const fs_1 = __importDefault(require("fs"));
const pdfParse = require('pdf-parse');
async function parsePdf(filepath) {
    const dataBuffer = fs_1.default.readFileSync(filepath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}
