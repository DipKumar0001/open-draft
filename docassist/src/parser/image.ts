import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function parseImage(filepath: string): Promise<string> {
  // Pre-process with sharp for better OCR (grayscale, contrast)
  const tempPath = path.join(os.tmpdir(), `ocr_temp_${Date.now()}.png`);
  await sharp(filepath)
    .grayscale()
    .normalize()
    .toFile(tempPath);

  const { data: { text } } = await Tesseract.recognize(tempPath, 'eng');
  fs.unlinkSync(tempPath);
  
  return text;
}
