"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = parseFile;
const logger_1 = require("../utils/logger");
const fallback_1 = require("./fallback");
const pdf_1 = require("./pdf");
const docx_1 = require("./docx");
const xlsx_1 = require("./xlsx");
const csv_1 = require("./csv");
const pptx_1 = require("./pptx");
const text_1 = require("./text");
const path_1 = __importDefault(require("path"));
async function parseFile(filepath) {
    const ext = path_1.default.extname(filepath).toLowerCase();
    let content = '';
    let method = 'failed';
    try {
        switch (ext) {
            case '.pdf':
                content = await (0, pdf_1.parsePdf)(filepath);
                break;
            case '.docx':
                content = await (0, docx_1.parseDocx)(filepath);
                break;
            case '.xlsx':
            case '.xls':
                content = await (0, xlsx_1.parseXlsx)(filepath);
                break;
            case '.csv':
                content = await (0, csv_1.parseCsv)(filepath);
                break;
            case '.pptx':
            case '.ppt':
                content = await (0, pptx_1.parsePptx)(filepath);
                break;
            case '.png':
            case '.jpg':
            case '.jpeg':
            case '.gif':
            case '.webp':
            case '.bmp':
            case '.tiff': {
                const { parseImage } = await Promise.resolve().then(() => __importStar(require('./image')));
                content = await parseImage(filepath);
                break;
            }
            case '.txt':
            case '.md':
                content = await (0, text_1.parseText)(filepath);
                break;
            default:
                content = await (0, text_1.parseText)(filepath); // Default fallback
        }
        if (content && content.trim().length > 0) {
            method = 'node';
        }
        else {
            throw new Error('Node parser returned empty content');
        }
    }
    catch (err) {
        logger_1.logger.debug(`Node parser failed for ${filepath}: ${err.message}`);
        // Attempt Python fallback
        try {
            if (!global.verboseMode && process.env.DOCASSIST_NO_PYTHON !== '1') {
                content = await (0, fallback_1.runPythonFallback)(filepath);
                if (content && content.trim().length > 0) {
                    method = 'python';
                }
                else {
                    method = 'failed';
                }
            }
            else {
                method = 'failed';
            }
        }
        catch (fallbackErr) {
            logger_1.logger.warn(`Both Node and Python fallback failed for ${path_1.default.basename(filepath)}: ${fallbackErr.message}`);
            method = 'failed';
        }
    }
    return {
        path: filepath,
        content,
        method,
        metadata: { ext }
    };
}
