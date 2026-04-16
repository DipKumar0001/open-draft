// @ts-ignore
import officeParser from 'officeparser';

export async function parsePptx(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(filepath, (data: string, err: any) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
