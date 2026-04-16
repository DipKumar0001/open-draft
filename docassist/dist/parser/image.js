"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImage = parseImage;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
async function parseImage(filepath) {
    // Pre-process with sharp for better OCR (grayscale, contrast)
    const tempPath = path_1.default.join(os_1.default.tmpdir(), `ocr_temp_${Date.now()}.png`);
    await (0, sharp_1.default)(filepath)
        .grayscale()
        .normalize()
        .toFile(tempPath);
    const { data: { text } } = await tesseract_js_1.default.recognize(tempPath, 'eng');
    fs_1.default.unlinkSync(tempPath);
    return text;
}
