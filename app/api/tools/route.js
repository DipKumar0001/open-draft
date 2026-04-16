import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(request) {
  try {
    const { command, params } = await request.json();

    switch (command) {
      case 'create_file': {
        const filePath = params.path || 'untitled.txt';
        const content = params.content || '';
        const expandedPath = filePath.startsWith('~/') 
          ? path.join(os.homedir(), filePath.slice(2))
          : filePath;
        
        fs.writeFileSync(expandedPath, content, 'utf-8');
        return NextResponse.json({ result: `Successfully created file at ${expandedPath}.` });
      }
      case 'open_url': {
        const url = params.url;
        if (!url) throw new Error('No URL provided.');
        await execAsync(`open "${url}"`);
        return NextResponse.json({ result: `Successfully opened URL: ${url}.` });
      }
      case 'launch_app': {
        const appName = params.appName;
        if (!appName) throw new Error('No App Name provided.');
        await execAsync(`open -a "${appName}"`);
        return NextResponse.json({ result: `Successfully launched application: ${appName}.` });
      }
      default:
        return NextResponse.json({ error: `Unknown command requested: ${command}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Tool Execute API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
