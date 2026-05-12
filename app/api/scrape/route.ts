import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    new URL(url); // validation basique
  } catch {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
  }

  const data = await scrapeUrl(url);
  return NextResponse.json(data);
}
