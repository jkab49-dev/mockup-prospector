'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SECTORS = [
  { value: 'hotellerie', label: 'Hôtellerie & Tourisme' },
  { value: 'btp', label: 'BTP & Construction' },
  { value: 'sante', label: 'Santé & Pharmacie' },
  { value: 'distribution', label: 'Distribution & Commerce' },
  { value: 'agro', label: 'Agroalimentaire' },
  { value: 'conseil', label: 'Conseil & Services' },
];

const COUNTRIES = [
  "Côte d'Ivoire", 'Sénégal', 'Cameroun', 'Mali', 'Guinée',
  'Burkina Faso', 'Togo', 'Bénin', 'Niger', 'Gabon',
  'Congo', 'RDC', 'Madagascar', 'Maroc', 'Tunisie', 'Algérie',
];

type PresenceType = 'new' | 'redesign' | 'social';

const MODES: { value: PresenceType; label: string }[] = [
  { value: 'new', label: 'Nouveau site' },
  { value: 'redesign', label: 'Refonte' },
  { value: 'social', label: 'Depuis Facebook' },
];

const inputBase =
  'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 transition-colors';

const inputAutoFilled =
  'w-full px-3.5 py-2.5 bg-green-50 border border-green-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-colors';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</p>
  );
}

function AutoBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      auto
    </span>
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presenceType, setPresenceType] = useState<PresenceType>('new');
  const [form, setForm] = useState({
    company: '',
    sector: '',
    city: '',
    country: "Côte d'Ivoire",
    services: '',
    primary_color: '#005A82',
    phone: '',
    email: '',
    existing_url: '',
    social_facebook: '',
  });

  const [logoBase64, setLogoBase64] = useState('');
  const [logoMime, setLogoMime] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [scraping, setScraping] = useState(false);
  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (autoFilledFields.has(name)) {
      setAutoFilledFields((prev) => { const s = new Set(prev); s.delete(name); return s; });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [header, b64] = result.split(',');
      const mime = header.match(/data:([^;]+)/)?.[1] || file.type;
      setLogoBase64(b64);
      setLogoMime(mime);
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => { setLogoBase64(''); setLogoMime(''); setLogoPreview(''); };

  const runScrape = useCallback(async (url: string) => {
    try { new URL(url); } catch { return; }
    setScraping(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (!res.ok) return;
      const data = await res.json();
      const filled = new Set<string>();
      setForm((prev) => {
        const next = { ...prev };
        if (data.title && !prev.company) { next.company = data.title; filled.add('company'); }
        if (data.detectedSector && !prev.sector) { next.sector = data.detectedSector; filled.add('sector'); }
        if (data.detectedCity && !prev.city) { next.city = data.detectedCity; filled.add('city'); }
        if (data.detectedCountry && !prev.country) { next.country = data.detectedCountry; filled.add('country'); }
        if (data.phone && !prev.phone) { next.phone = data.phone; filled.add('phone'); }
        if (data.email && !prev.email) { next.email = data.email; filled.add('email'); }
        if (data.description && !prev.services) { next.services = data.description.slice(0, 300); filled.add('services'); }
        if (data.primaryColor && prev.primary_color === '#005A82') { next.primary_color = data.primaryColor; filled.add('primary_color'); }
        return next;
      });
      setAutoFilledFields(filled);
    } catch { /* silently fail */ } finally {
      setScraping(false);
    }
  }, []);

  useEffect(() => {
    if (presenceType !== 'redesign') return;
    if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current);
    if (!form.existing_url) return;
    scrapeTimerRef.current = setTimeout(() => runScrape(form.existing_url), 800);
    return () => { if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current); };
  }, [form.existing_url, presenceType, runScrape]);

  const isAutoFilled = (field: string) => autoFilledFields.has(field);
  const iClass = (field: string, extra = '') =>
    `${isAutoFilled(field) ? inputAutoFilled : inputBase} ${extra}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.sector) {
      setError("Nom de l'entreprise et secteur sont obligatoires.");
      return;
    }
    if (presenceType === 'redesign' && !form.existing_url) {
      setError("Veuillez saisir l'URL du site existant.");
      return;
    }
    if (presenceType === 'social' && !form.social_facebook) {
      setError("Veuillez saisir l'URL de la page Facebook.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, string> = { ...form, presence_type: presenceType };
      if (logoBase64) { body.logo_base64 = logoBase64; body.logo_mime = logoMime; }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération');
      router.push(`/preview/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F2' }}>
      {/* Header */}
      <header className="bg-slate-900 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Galerie
          </Link>
          <span className="text-slate-700 text-sm">|</span>
          <h1 className="text-white font-semibold text-sm">Nouvelle maquette</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Mode selector */}
          <div>
            <SectionLabel>Situation de l&apos;entreprise</SectionLabel>
            <div className="flex gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => { setPresenceType(mode.value); setAutoFilledFields(new Set()); }}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    presenceType === mode.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL conditionnelle */}
          {presenceType === 'redesign' && (
            <div>
              <SectionLabel>Site existant</SectionLabel>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <label className="block text-xs font-medium text-amber-700 mb-2">
                  URL du site à moderniser <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    name="existing_url"
                    value={form.existing_url}
                    onChange={handleChange}
                    placeholder="https://www.ancien-site.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 pr-10"
                  />
                  {scraping && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-amber-600" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-amber-600">
                  {autoFilledFields.size > 0
                    ? '✓ Informations extraites — vérifiez les champs surlignés'
                    : scraping ? 'Analyse en cours...'
                    : 'Le formulaire se remplit automatiquement dès que vous entrez l\'URL.'}
                </p>
              </div>
            </div>
          )}

          {presenceType === 'social' && (
            <div>
              <SectionLabel>Page Facebook</SectionLabel>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <label className="block text-xs font-medium text-blue-700 mb-2">
                  URL de la page <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  name="social_facebook"
                  value={form.social_facebook}
                  onChange={handleChange}
                  placeholder="https://www.facebook.com/nom-de-la-page"
                  className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
                />
                <p className="mt-2 text-xs text-blue-600">
                  Nous générerons un site cohérent avec votre présence Facebook.
                </p>
              </div>
            </div>
          )}

          {/* Identité */}
          <div>
            <SectionLabel>Identité</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nom de l&apos;entreprise <span className="text-red-400">*</span>
                  {isAutoFilled('company') && <AutoBadge />}
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Ex: Grand Hôtel Abidjan"
                  className={iClass('company')}
                  required
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Secteur <span className="text-red-400">*</span>
                  {isAutoFilled('sector') && <AutoBadge />}
                </label>
                <select
                  name="sector"
                  value={form.sector}
                  onChange={handleChange}
                  className={iClass('sector', 'bg-white')}
                  required
                >
                  <option value="">Choisir un secteur</option>
                  {SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Ville {isAutoFilled('city') && <AutoBadge />}
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ex: Abidjan"
                  className={iClass('city')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Pays {isAutoFilled('country') && <AutoBadge />}
                </label>
                <select
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className={iClass('country', 'bg-white')}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Services / Activités
                  {isAutoFilled('services') && <AutoBadge />}
                </label>
                <textarea
                  name="services"
                  value={form.services}
                  onChange={handleChange}
                  placeholder="Ex: Hébergement, restauration, spa, salles de conférence"
                  rows={3}
                  className={`${iClass('services')} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Coordonnées & marque */}
          <div>
            <SectionLabel>Coordonnées &amp; marque</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Couleur {isAutoFilled('primary_color') && <AutoBadge />}
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    name="primary_color"
                    value={form.primary_color}
                    onChange={handleChange}
                    className="h-10 w-12 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                  <span className="text-xs text-slate-400 font-mono">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Téléphone {isAutoFilled('phone') && <AutoBadge />}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+225 07 00 00 00"
                  className={iClass('phone')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email {isAutoFilled('email') && <AutoBadge />}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contact@..."
                  className={iClass('email')}
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div>
            <SectionLabel>Logo</SectionLabel>
            {logoPreview ? (
              <div className="flex items-center gap-4 px-4 py-3 bg-white border border-green-200 rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo" className="h-10 w-auto object-contain rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">Logo chargé</p>
                  <p className="text-xs text-slate-400">Intégré dans la nav et le footer de la maquette</p>
                </div>
                <button
                  type="button"
                  onClick={clearLogo}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 hover:bg-white transition-all">
                <p className="text-sm text-slate-400">Cliquez ou glissez un fichier</p>
                <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, SVG, WebP</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </label>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                {presenceType === 'redesign' ? 'Analyse du site...' : presenceType === 'social' ? 'Analyse Facebook...' : 'Génération en cours...'}
              </>
            ) : (
              presenceType === 'redesign' ? 'Générer la refonte'
              : presenceType === 'social' ? 'Générer depuis Facebook'
              : 'Générer la maquette'
            )}
          </button>

          {presenceType !== 'new' && !loading && (
            <p className="text-center text-xs text-slate-400 -mt-4">
              L&apos;analyse {presenceType === 'redesign' ? 'du site' : 'Facebook'} peut ajouter quelques secondes
            </p>
          )}

        </form>
      </main>
    </div>
  );
}
