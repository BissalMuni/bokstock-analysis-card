import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const pdfPath = path.join(
    process.cwd(),
    'content',
    'stocks',
    'artifacts',
    `${decodedSlug}_slides.pdf`,
  );

  try {
    const buffer = await fs.readFile(pdfPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${decodedSlug}_slides.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
}
