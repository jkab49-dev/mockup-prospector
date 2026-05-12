import * as cheerio from 'cheerio';

export interface ScrapedData {
  title?: string;
  description?: string;
  phone?: string;
  email?: string;
  bodyText?: string;
  headings?: string[];
  // enrichissements pour auto-fill
  detectedSector?: string;
  detectedCity?: string;
  detectedCountry?: string;
  primaryColor?: string;
}

const PHONE_RE = /(?:\+?[\d\s\-().]{8,20})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SECTOR_KEYWORDS: Record<string, string[]> = {
  hotellerie: ['hôtel', 'hotel', 'hébergement', 'chambre', 'suite', 'resort', 'lodge', 'auberge', 'résidence', 'tourisme', 'séjour', 'booking'],
  btp: ['construction', 'bâtiment', 'travaux', 'génie civil', 'chantier', 'maçonnerie', 'btp', 'immobilier', 'rénovation', 'terrassement', 'béton', 'architecture'],
  sante: ['santé', 'médecin', 'clinique', 'pharmacie', 'hôpital', 'soins', 'médical', 'infirmier', 'cabinet', 'laboratoire', 'analyse', 'chirurgie'],
  distribution: ['distribution', 'commerce', 'grossiste', 'magasin', 'vente', 'stock', 'import', 'export', 'supermarché', 'livraison', 'fournisseur'],
  agro: ['agriculture', 'agroalimentaire', 'ferme', 'céréales', 'culture', 'élevage', 'récolte', 'plantation', 'cacao', 'café', 'maïs', 'riz'],
  conseil: ['conseil', 'consulting', 'stratégie', 'formation', 'management', 'audit', 'expertise', 'accompagnement', 'ressources humaines', 'coaching'],
};

const COUNTRY_CITIES: Record<string, string[]> = {
  "Côte d'Ivoire": ['abidjan', 'bouaké', 'korhogo', 'daloa', 'yamoussoukro', 'san-pédro'],
  'Sénégal': ['dakar', 'thiès', 'saint-louis', 'ziguinchor', 'kaolack', 'touba'],
  'Cameroun': ['douala', 'yaoundé', 'bafoussam', 'bamenda', 'garoua'],
  'Mali': ['bamako', 'sikasso', 'ségou', 'mopti', 'koulikoro'],
  'Guinée': ['conakry', 'kankan', 'kindia', 'labé', 'nzérékoré'],
  'Gabon': ['libreville', 'port-gentil', 'franceville', 'oyem'],
  'Congo': ['brazzaville', 'pointe-noire', 'dolisie'],
  'Togo': ['lomé', 'sokodé', 'kara', 'palimé'],
  'Bénin': ['cotonou', 'porto-novo', 'parakou', 'abomey'],
  'Burkina Faso': ['ouagadougou', 'bobo-dioulasso', 'koudougou'],
  'Maroc': ['casablanca', 'rabat', 'marrakech', 'fès', 'tanger', 'agadir'],
  'Tunisie': ['tunis', 'sfax', 'sousse', 'kairouan', 'bizerte'],
};

function detectSector(text: string): string | undefined {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    scores[sector] = keywords.filter((k) => lower.includes(k)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : undefined;
}

function detectLocation(text: string): { city?: string; country?: string } {
  const lower = text.toLowerCase();
  for (const [country, cities] of Object.entries(COUNTRY_CITIES)) {
    for (const city of cities) {
      if (lower.includes(city)) {
        return { city: city.charAt(0).toUpperCase() + city.slice(1), country };
      }
    }
  }
  return {};
}

function extractPrimaryColor($: ReturnType<typeof cheerio.load>): string | undefined {
  // Cherche dans les styles inline ou les balises style
  let color: string | undefined;
  const styleContent = $('style').text();
  const brandColorRe = /(?:--(?:primary|brand|main|accent|color)[^:]*:\s*)(#[0-9a-fA-F]{6})/;
  const match = styleContent.match(brandColorRe);
  if (match) color = match[1];
  return color;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MockupProspector/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!res.ok) return {};

    const html = await res.text();
    const $ = cheerio.load(html);

    // Couleur de marque avant suppression des styles
    const primaryColor = extractPrimaryColor($);

    // Suppression du bruit
    $('script, style, nav, footer').remove();

    const rawTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      '';

    // Nettoie le titre : retire les suffixes genre " | Accueil" ou " - Site officiel"
    const title = rawTitle.replace(/\s*[\|–\-—]\s*.{3,40}$/, '').trim();

    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 120) headings.push(text);
    });

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);

    // Téléphone — préférence aux liens tel:
    let phone: string | undefined;
    $('a[href^="tel:"]').each((_, el) => {
      if (!phone) phone = $(el).attr('href')?.replace('tel:', '').trim();
    });
    if (!phone) {
      const match = bodyText.match(PHONE_RE);
      phone = match?.find((m) => m.replace(/\D/g, '').length >= 8)?.trim();
    }

    // Email — préférence aux liens mailto:
    let email: string | undefined;
    $('a[href^="mailto:"]').each((_, el) => {
      if (!email) email = $(el).attr('href')?.replace('mailto:', '').trim();
    });
    if (!email) {
      const match = bodyText.match(EMAIL_RE);
      email = match?.[0];
    }

    const fullText = [title, description, headings.join(' '), bodyText].join(' ');
    const detectedSector = detectSector(fullText);
    const { city: detectedCity, country: detectedCountry } = detectLocation(fullText);

    return {
      title: title || undefined,
      description: description || undefined,
      phone: phone || undefined,
      email: email || undefined,
      bodyText: bodyText || undefined,
      headings: headings.length ? headings.slice(0, 10) : undefined,
      detectedSector,
      detectedCity,
      detectedCountry,
      primaryColor,
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}
