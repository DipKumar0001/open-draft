import * as xlsx from 'xlsx';

export async function parseXlsx(filepath: string): Promise<string> {
  const workbook = xlsx.readFile(filepath);
  let content = '';
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    content += `--- ${sheetName} ---\
`;
    content += xlsx.utils.sheet_to_csv(sheet) + '\
';
  }
  return content;
}
