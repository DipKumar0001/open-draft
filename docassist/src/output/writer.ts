import fs from 'fs-extra';
import path from 'path';
import * as docx from 'docx';
import { ExecutionResult } from '../assessment/executor';
import { formatMarkdown, formatPlainText } from './formatter';
import { logger } from '../utils/logger';

export async function writeOutput(result: ExecutionResult, outputDir: string): Promise<void> {
  await fs.ensureDir(outputDir);
  
  const slug = result.brief.assignmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${slug}_${timestamp}`;

  // 1. Write MD (Always)
  const mdContent = formatMarkdown(result);
  const mdPath = path.join(outputDir, `${baseName}.md`);
  await fs.writeFile(mdPath, mdContent);
  logger.success(`Wrote: ${mdPath}`);

  // 2. Determine format needs
  const formatStr = result.brief.submissionFormat?.toLowerCase() || '';
  
  if (formatStr.includes('word') || formatStr.includes('docx') || formatStr.includes('document')) {
    const docPath = path.join(outputDir, `${baseName}.docx`);
    const docChildren: docx.Paragraph[] = [
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
    await fs.writeFile(docPath, buffer);
    logger.success(`Wrote: ${docPath}`);
  }

  if (formatStr.includes('report') || formatStr.includes('essay')) {
    const txtPath = path.join(outputDir, `${baseName}.txt`);
    await fs.writeFile(txtPath, formatPlainText(result));
    logger.success(`Wrote: ${txtPath}`);
  }

  // Write metadata
  const metaPath = path.join(outputDir, `${baseName}_metadata.json`);
  const metaObj = {
    generatedAt: new Date().toISOString(),
    provider: result.provider,
    model: result.model,
    briefStructure: result.brief
  };
  await fs.writeJson(metaPath, metaObj, { spaces: 2 });
  logger.success(`Wrote: ${metaPath}`);
}
