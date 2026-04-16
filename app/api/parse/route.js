import { NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();
    
    let textContent = '';

    if (fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      textContent = data.text;
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: buffer });
      textContent = result.value;
    } else if (fileName.match(/\.(xlsx|xls)$/)) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      textContent = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        textContent += xlsx.utils.sheet_to_csv(sheet) + '\\n';
      });
    } else {
      // Default to plain text assumption
      textContent = buffer.toString('utf-8');
    }

    return NextResponse.json({ text: textContent });
  } catch (error) {
    console.error('File Parse Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
