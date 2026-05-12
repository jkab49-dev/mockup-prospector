import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SECTOR_LABELS: Record<string, string> = {
  hotellerie: 'Hôtellerie & Tourisme',
  btp: 'BTP & Construction',
  sante: 'Santé & Pharmacie',
  distribution: 'Distribution & Commerce',
  agro: 'Agroalimentaire',
  conseil: 'Conseil & Services',
};

// Non-reflex fonts — none appear on the impeccable ban list
const SECTOR_FONTS: Record<string, string> = {
  hotellerie: `
    - Display/titres : "Bodoni Moda" (serif élégant, contrastes forts) — import depuis Google Fonts
    - Corps : "Nunito Sans" (lisible, chaleureux) — import depuis Google Fonts
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Nunito+Sans:wght@300;400;600&display=swap" rel="stylesheet">`,
  btp: `
    - Display/titres : "Barlow Condensed" (fort, industriel, poids 700-900) — Google Fonts
    - Corps : "Barlow" (poids 400) — Google Fonts
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;900&family=Barlow:wght@300;400;500&display=swap" rel="stylesheet">`,
  sante: `
    - Display/titres : "Spectral" (serif médical, lisible) — Google Fonts
    - Corps : "Epilogue" (sans géométrique propre) — Google Fonts
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;400;600&family=Epilogue:wght@400;500;600&display=swap" rel="stylesheet">`,
  distribution: `
    - Display : "Bebas Neue" (capitales, impact maximal) — Google Fonts
    - Corps : "Nunito Sans" (lisible, accessible) — Google Fonts
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">`,
  agro: `
    - Display/titres : "Literata" (serif chaud, ancré) — Google Fonts
    - Corps : "Raleway" (poids 400-500) — Google Fonts
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=Raleway:wght@400;500;600&display=swap" rel="stylesheet">`,
  conseil: `
    - Une seule famille, plusieurs graisses : "Sora" (poids 200 à 800) — Google Fonts
    - Hiérarchie via poids et taille, pas via famille différente
    - Logique : <link href="https://fonts.googleapis.com/css2?family=Sora:wght@200;400;600;800&display=swap" rel="stylesheet">`,
};

const SECTOR_COLOR_STRATEGY: Record<string, string> = {
  hotellerie: 'Committed — terracotta chaud oklch(42% 0.12 30), neutres teintés crème oklch(97% 0.008 30)',
  btp: 'Committed — ambre industriel oklch(50% 0.16 55), neutres teintés vers l\'orange',
  sante: 'Restrained — teal clinique oklch(48% 0.10 195) à ≤10% de surface, blanc dominant teinté',
  distribution: 'Drenched — orange vif oklch(58% 0.18 40) qui couvre 50%+ de la surface hero',
  agro: 'Committed — vert forêt oklch(42% 0.13 145), neutres terres chaudes',
  conseil: 'Drenched — charbon profond oklch(22% 0.04 265) avec accent jaune vif oklch(80% 0.18 95)',
};

const SECTOR_SCENE: Record<string, string> = {
  hotellerie: 'Un voyageur d\'affaires s\'installe dans sa chambre au coucher du soleil, lumière dorée par les baies vitrées',
  btp: 'Un chef de chantier examine des plans au lever du jour sur un chantier en béton, ombre longue, casque jaune',
  sante: 'Un médecin consulte un patient dans une salle lumineuse blanche à la mi-journée, confiance et calme',
  distribution: 'Un directeur commercial en mouvement dans un entrepôt moderne, efficacité, lumière froide',
  agro: 'Un agriculteur tient des légumes frais au lever du soleil dans un champ vert en Afrique de l\'Ouest',
  conseil: 'Un consultant présente un tableau blanc dans une salle de réunion vitrée en soirée, autorité intellectuelle',
};

function loadTemplate(sector: string): string {
  const templatePath = path.join(process.cwd(), 'lib', 'templates', `${sector}.html`);
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf-8');
  }
  return '';
}

export interface MockupInput {
  company: string;
  sector: string;
  city?: string;
  country?: string;
  services?: string;
  primary_color: string;
  phone?: string;
  email?: string;
  // enrichissement contextuel
  presence_type?: 'new' | 'redesign' | 'social';
  existing_url?: string;
  scraped?: {
    title?: string;
    description?: string;
    headings?: string[];
    bodyText?: string;
    phone?: string;
    email?: string;
  };
  social_facebook?: string;
  social_scraped?: string;
  logo_path?: string;
}

export async function generateMockupHtml(input: MockupInput): Promise<string> {
  const template = loadTemplate(input.sector);
  const sectorLabel = SECTOR_LABELS[input.sector] || input.sector;
  const fonts = SECTOR_FONTS[input.sector] || SECTOR_FONTS.conseil;
  const colorStrategy = SECTOR_COLOR_STRATEGY[input.sector] || '';
  const scene = SECTOR_SCENE[input.sector] || '';

  const prompt = `Tu es un directeur artistique senior qui crée des maquettes de sites web distinctives pour des PME africaines. Ton travail sera jugé sur sa capacité à NE PAS ressembler à une production IA générique.

## BRIEF CLIENT
- **Entreprise :** ${input.company}
- **Secteur :** ${sectorLabel}
- **Ville :** ${input.city || 'Non spécifiée'}
- **Pays :** ${input.country || 'Afrique'}
- **Services :** ${input.services || 'Services professionnels'}
- **Couleur de marque demandée :** ${input.primary_color} (intègre-la dans la palette OKLCH)
- **Téléphone :** ${input.phone || ''}
- **Email :** ${input.email || ''}
${input.logo_path ? `- **Logo disponible :** ${input.logo_path}

## LOGO — OBLIGATOIRE
Un logo est fourni. Tu DOIS l'intégrer :
- Dans la navigation : <img src="${input.logo_path}" alt="Logo ${input.company}" style="height:40px;width:auto;object-fit:contain;">
- Dans le footer : même balise img, hauteur 32px
- N'utilise PAS de texte pour le nom de marque si le logo est présent dans la nav — le logo le remplace
- Assure-toi que le logo est visible sur le fond de la nav (adapte le fond si nécessaire)` : ''}

## SCÈNE PHYSIQUE (base toutes les décisions de design sur cette image)
${scene}

${input.presence_type === 'redesign' && input.existing_url ? `
---
## MISSION : REFONTE DU SITE EXISTANT
URL du site actuel : ${input.existing_url}
${input.scraped ? `
Contenu extrait du site actuel :
- Titre : ${input.scraped.title || 'non trouvé'}
- Description : ${input.scraped.description || 'non trouvée'}
${input.scraped.headings?.length ? `- Rubriques existantes : ${input.scraped.headings.join(' | ')}` : ''}
${input.scraped.bodyText ? `- Extrait du contenu : ${input.scraped.bodyText.slice(0, 800)}...` : ''}
` : ''}

→ Ta mission : moderniser ce site. Conserve l'identité de marque et les informations existantes.
   Ne réinvente pas la marque — fais évoluer ce qui existe vers un design contemporain de qualité.
   Le résultat doit clairement être une version améliorée du même site, pas un site générique.
---
` : ''}

${input.presence_type === 'social' && input.social_facebook ? `
---
## CONTEXTE : ENTREPRISE PRÉSENTE SUR FACEBOOK UNIQUEMENT
Page Facebook : ${input.social_facebook}
${input.social_scraped ? `Informations extraites de la page Facebook :
${input.social_scraped}` : ''}

→ Cette entreprise n'a pas encore de site web. Elle communique via Facebook.
   Génère un premier site cohérent avec sa présence Facebook : reprends le ton, la cible,
   et les thématiques visibles. Le site doit avoir l'air d'une évolution naturelle de leur présence sociale.
---
` : ''}

---

## SYSTÈME TYPOGRAPHIQUE — OBLIGATOIRE
Utilise UNIQUEMENT ces polices pour ce secteur :
${fonts}

Règles :
- Hiérarchie via ratio ≥1.5 entre niveaux (ex: 48px → 32px → 20px → 16px)
- Titres h1-h2 : text-wrap: balance
- Titres h1 fluides : clamp(2.5rem, 6vw, 5rem)
- Corps : max-width: 65ch, line-height: 1.65
- Jamais Inter, DM Sans, Plus Jakarta Sans, Space Grotesk

## SYSTÈME COULEUR — OBLIGATOIRE (CSS oklch())
Stratégie : ${colorStrategy}

Règles :
- Toutes les couleurs en oklch() — jamais de hex sur les variables CSS
- Neutres teintés vers la couleur de marque (chroma 0.005-0.01 minimum)
- Jamais oklch(0% 0 0) ou oklch(100% 0 0) — toujours légèrement teintés
- Adapter la couleur de marque ${input.primary_color} en oklch() cohérent

## MISE EN PAGE — OBLIGATOIRE
- Layout asymétrique ou en grille stricte — jamais une pile de sections centrées identiques
- Varie les espacements : sections généreuses (padding: 120px) alternant avec sections denses (padding: 60px)
- Pas de container unique — certaines sections pleine largeur
- Grille CSS 12 colonnes pour les sections complexes

## IMAGES — OBLIGATOIRE
Le hero DOIT utiliser une photo Unsplash réelle :
- Format : https://images.unsplash.com/photo-{ID}?auto=format&fit=crop&w=1600&q=80
- Cherche un ID Unsplash réel adapté au secteur ${sectorLabel} en Afrique
- Utilise object-fit: cover sur une div de hauteur 100vh
- Alt text descriptif et précis (pas "image de fond")

---

## INTERDICTIONS ABSOLUES — CHAQUE VIOLATION EST UN ÉCHEC

❌ **Inter** comme police principale — sur liste noire
❌ **Dégradé purple-to-blue, blue-to-teal, ou toute combinaison générique** — AI slop
❌ **Grille de cartes identiques** : même hauteur, icon + titre + texte, répété N fois — AI slop
❌ **Glassmorphism** : backdrop-filter + background: rgba() sur cartes flottantes — AI slop
❌ **Texte en dégradé** : background-clip: text — interdit
❌ **Border-left ou border-right** coloré >1px comme accent décoratif — interdit
❌ **Grande icône arrondie** (rounded square) au-dessus de chaque titre de section — AI slop
❌ **Hero-metric** : gros chiffre + petit label + stat secondaire + accent dégradé — AI slop
❌ **Emojis** comme icônes de section ou de service
❌ **Box-shadow générique** : 0 4px 6px rgba(0,0,0,0.1) sur cartes rectangulaires

---

## STRUCTURE OBLIGATOIRE

### 1. Navigation (sticky, hauteur 64px max)
- Nom entreprise à gauche + menu horizontal + bouton CTA à droite
- Fond plein (couleur de marque ou blanc teinté) — pas de glassmorphism
- Jamais transparent sur scroll

### 2. Hero (100vh, plein écran)
- Photo Unsplash en background avec overlay couleur de marque
- H1 en grand (clamp 3rem-6rem), max 8 mots
- Sous-titre court (2 lignes max), 1 seul bouton CTA
- Layout : texte à gauche, image à droite OU texte centré bas sur image plein écran

### 3. Services (section distinctive, PAS une grille de cartes identiques)
- Choisis UN de ces layouts : liste numérotée large + description, alternance texte/visuel, grille 2 colonnes asymétrique
- 3-4 services maximum
- Chaque service doit avoir un traitement visuel différent du suivant

### 4. Ancrage confiance (stats OU témoignage OU chiffre clé)
- UNE seule statistique forte en très grand, pas 3 métriques identiques côte à côte
- Fond couleur de marque saturé (committed/drenched)

### 5. À propos (asymétrique)
- Bloc texte (60%) + bloc visuel ou couleur (40%) — jamais deux colonnes égales
- Ton authentique, spécifique à ${input.country || 'l\'Afrique'}

### 6. Footer
- 3 colonnes maximum : marque + navigation + contact
- Fond sombre (charbon ou couleur de marque foncée)
- Coordonnées propres, copyright

---

## TEST ANTI-AI-SLOP (effectue ce test mentalement avant d'écrire)
1. Si quelqu'un voit ce design sans contexte, peut-il dire "une IA générique l'a fait" ? → Si oui, recommence
2. La police principale est-elle Inter ou DM Sans ? → Si oui, change
3. Y a-t-il 3 cartes identiques avec icône + titre + texte ? → Si oui, varie la mise en page
4. Le hero est-il un dégradé CSS sans photo ? → Si oui, mets une photo Unsplash

---

${template ? `## RÉFÉRENCE STRUCTURELLE (adapte et dépasse ce template)
Utilise la structure suivante comme point de départ, mais améliore le design :

${template}` : ''}

---

Génère le fichier HTML complet (<!DOCTYPE html> à </html>) avec TOUT le CSS inline dans <style>.
Réponds UNIQUEMENT avec le code HTML, sans markdown, sans explication.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  let html = content.text.trim();
  if (html.startsWith('```html')) html = html.slice(7);
  if (html.startsWith('```')) html = html.slice(3);
  if (html.endsWith('```')) html = html.slice(0, -3);
  html = html.trim();

  if (!html.includes('</body>')) html += '\n</body>';
  if (!html.includes('</html>')) html += '\n</html>';

  return html;
}
