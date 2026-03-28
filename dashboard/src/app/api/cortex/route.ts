import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export async function GET() {
  const cortexPath = join(homedir(), '.cortex', 'MEMORY_CONTEXT.md');
  try {
    await access(cortexPath);
    const content = await readFile(cortexPath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return new NextResponse('Cortex not available', { status: 404 });
  }
}
