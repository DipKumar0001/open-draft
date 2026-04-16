import mammoth from 'mammoth';

export async function parseDocx(filepath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filepath });
  return result.value;
}
