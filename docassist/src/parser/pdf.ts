import fs from 'fs';
const pdfParse = require('pdf-parse');

export async function parsePdf(filepath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filepath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}
