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
exports.writeOutput = writeOutput;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const docx = __importStar(require("docx"));
const formatter_1 = require("./formatter");
const logger_1 = require("../utils/logger");
async function writeOutput(result, outputDir) {
    await fs_extra_1.default.ensureDir(outputDir);
    const slug = result.brief.assignmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${slug}_${timestamp}`;
    // 1. Write MD (Always)
    const mdContent = (0, formatter_1.formatMarkdown)(result);
    const mdPath = path_1.default.join(outputDir, `${baseName}.md`);
    await fs_extra_1.default.writeFile(mdPath, mdContent);
    logger_1.logger.success(`Wrote: ${mdPath}`);
    // 2. Determine format needs
    const formatStr = result.brief.submissionFormat?.toLowerCase() || '';
    if (formatStr.includes('word') || formatStr.includes('docx') || formatStr.includes('document')) {
        const docPath = path_1.default.join(outputDir, `${baseName}.docx`);
        const docChildren = [
            new docx.Paragraph({
                text: result.brief.assignmentTitle,
                heading: docx.HeadingLevel.HEADING_1
            }),
            new docx.Paragraph({
                text: `Module: ${result.brief.moduleName}`,
                heading: docx.HeadingLevel.HEADING_2
            })
        ];
        for (const comp of result.completions) {
            docChildren.push(new docx.Paragraph({ text: comp.title, heading: docx.HeadingLevel.HEADING_2 }));
            const paragraphs = comp.content.split('\
\
');
            for (const pText of paragraphs) {
                docChildren.push(new docx.Paragraph({ text: pText }));
            }
        }
        const doc = new docx.Document({
            sections: [{ properties: {}, children: docChildren }]
        });
        const buffer = await docx.Packer.toBuffer(doc);
        await fs_extra_1.default.writeFile(docPath, buffer);
        logger_1.logger.success(`Wrote: ${docPath}`);
    }
    if (formatStr.includes('report') || formatStr.includes('essay')) {
        const txtPath = path_1.default.join(outputDir, `${baseName}.txt`);
        await fs_extra_1.default.writeFile(txtPath, (0, formatter_1.formatPlainText)(result));
        logger_1.logger.success(`Wrote: ${txtPath}`);
    }
    // Write metadata
    const metaPath = path_1.default.join(outputDir, `${baseName}_metadata.json`);
    const metaObj = {
        generatedAt: new Date().toISOString(),
        provider: result.provider,
        model: result.model,
        briefStructure: result.brief
    };
    await fs_extra_1.default.writeJson(metaPath, metaObj, { spaces: 2 });
    logger_1.logger.success(`Wrote: ${metaPath}`);
}
