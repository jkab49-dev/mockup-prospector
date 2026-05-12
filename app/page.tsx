'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Mockup {
  id: string;
  company: string;
  sector: string;
  city?: string;
  country?: string;
  primary_color: string;
  created_at: string;
}

const SECTOR_LABELS: Record<string, string> = {
  hotellerie: 'Hôtellerie & Tourisme',
  btp: 'BTP & Construction',
  sante: 'Santé & Pharmacie',
  distribution: 'Distribution & Commerce',
  agro: 'Agroalimentaire',
  conseil: 'Conseil & Services',
};

function initials(company: string) {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.25" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

export default function GalleryPage() {
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mockups')
      .then((r) => r.json())
      .then((data) => { setMockups(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette maquette ?')) return;
    await fetch(`/api/mockups?id=${id}`, { method: 'DELETE' });
    setMockups((prev) => prev.filter((m) => m.id !== id));
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F2' }}>
      <header className="bg-slate-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <GridIcon />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Mockup Prospector</span>
          </div>
          <Link
            href="/generate"
            className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            + Nouvelle maquette
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-slate-600" />
          </div>
        ) : mockups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1.5">Aucune maquette encore</h2>
            <p className="text-slate-400 text-sm mb-7 max-w-xs leading-relaxed">
              Générez votre première maquette pour un prospect en quelques secondes.
            </p>
            <Link
              href="/generate"
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              Créer une maquette
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-6">
              {mockups.length} maquette{mockups.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {mockups.map((mockup) => (
                <div
                  key={mockup.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-default"
                >
                  {/* Color header */}
                  <div
                    className="h-[88px] flex items-end px-5 pb-4 relative"
                    style={{ backgroundColor: mockup.primary_color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/10" />
                    <div className="relative z-10 w-9 h-9 rounded-xl bg-black/20 border border-white/25 flex items-center justify-center text-white text-sm font-bold tracking-wide">
                      {initials(mockup.company)}
                    </div>
                    <span className="absolute top-3.5 right-4 text-xs font-medium text-white/85 bg-black/20 px-2.5 py-1 rounded-full">
                      {SECTOR_LABELS[mockup.sector] || mockup.sector}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-5 pt-4 pb-5">
                    <h3 className="font-bold text-slate-900 text-base leading-snug mb-0.5">{mockup.company}</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {[mockup.city, mockup.country].filter(Boolean).join(', ') || 'Localisation non renseignée'}
                      {' · '}
                      {formatDate(mockup.created_at)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/preview/${mockup.id}`}
                        className="flex-1 text-center bg-slate-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                      >
                        Voir la maquette
                      </Link>
                      <button
                        onClick={() => handleDelete(mockup.id)}
                        className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
