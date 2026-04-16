import fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';

export async function parseCsv(filepath: string): Promise<string> {
  const content = fs.readFileSync(filepath, 'utf8');
  const records = csvParse(content, { skip_empty_lines: true });
  return records.map((row: any[]) => row.join(',')).join('\
');
}
