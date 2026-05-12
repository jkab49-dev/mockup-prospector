import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { generateMockupHtml, MockupInput } from '@/lib/claude';
import { insertMockup } from '@/lib/db';
import { scrapeUrl } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

const LOGO_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company, sector, city, country, services, primary_color, phone, email,
      presence_type, existing_url, social_facebook,
      logo_base64, logo_mime,
    } = body;

    if (!company || !sector) {
      return NextResponse.json({ error: 'company and sector are required' }, { status: 400 });
    }

    // UUID généré en premier pour nommer le logo avant d'appeler Claude
    const id = uuidv4();

    let resolvedPhone = phone || null;
    let resolvedEmail = email || null;
    let resolvedServices = services || null;
    let scraped = undefined;
    let social_scraped = undefined;

    // Mode refonte : scraping (si pas déjà fait côté client)
    if (presence_type === 'redesign' && existing_url) {
      const data = await scrapeUrl(existing_url);
      scraped = Object.keys(data).length ? data : undefined;
      if (scraped?.phone && !resolvedPhone) resolvedPhone = scraped.phone;
      if (scraped?.email && !resolvedEmail) resolvedEmail = scraped.email;
      if (scraped?.description && !resolvedServices) resolvedServices = scraped.description.slice(0, 300);
    }

    // Mode réseaux sociaux : scraping Facebook
    if (presence_type === 'social' && social_facebook) {
      const data = await scrapeUrl(social_facebook);
      if (data.title || data.description || data.headings?.length) {
        const parts: string[] = [];
        if (data.title) parts.push(`Nom/titre de page : ${data.title}`);
        if (data.description) parts.push(`Description : ${data.description}`);
        if (data.headings?.length) parts.push(`Rubriques : ${data.headings.slice(0, 5).join(', ')}`);
        if (data.bodyText) parts.push(`Extrait : ${data.bodyText.slice(0, 400)}`);
        social_scraped = parts.join('\n');
      }
      if (data.phone && !resolvedPhone) resolvedPhone = data.phone;
      if (data.email && !resolvedEmail) resolvedEmail = data.email;
    }

    // Logo — sauvegarde depuis base64
    let logo_path: string | null = null;
    if (logo_base64 && logo_mime && LOGO_EXTENSIONS[logo_mime]) {
      const ext = LOGO_EXTENSIONS[logo_mime];
      const logosDir = path.join(process.cwd(), 'public', 'logos');
      if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

      const logoFilename = `${id}.${ext}`;
      const buffer = Buffer.from(logo_base64, 'base64');
      fs.writeFileSync(path.join(logosDir, logoFilename), buffer);
      logo_path = `/logos/${logoFilename}`;
    }

    const input: MockupInput = {
      company,
      sector,
      city,
      country,
      services: resolvedServices,
      primary_color: primary_color || '#005A82',
      phone: resolvedPhone,
      email: resolvedEmail,
      presence_type: presence_type || 'new',
      existing_url: existing_url || undefined,
      scraped,
      social_facebook: social_facebook || undefined,
      social_scraped,
      logo_path: logo_path || undefined,
    };

    const html = await generateMockupHtml(input);

    const filename = `${id}.html`;
    const publicDir = path.join(process.cwd(), 'public', 'mockups');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, filename), html, 'utf-8');

    insertMockup({
      id,
      company,
      sector,
      city: city || null,
      country: country || null,
      services: resolvedServices,
      primary_color: primary_color || '#005A82',
      phone: resolvedPhone,
      email: resolvedEmail,
      html_path: `/mockups/${filename}`,
      presence_type: presence_type || 'new',
      existing_url: existing_url || undefined,
      social_urls: social_facebook || undefined,
      logo_path: logo_path || undefined,
    });

    return NextResponse.json({ id, html_path: `/mockups/${filename}` });
  } catch (error) {
    console.error('POST /api/generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
