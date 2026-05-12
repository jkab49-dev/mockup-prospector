'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Mockup {
  id: string;
  company: string;
  sector: string;
  city?: string;
  country?: string;
}

const SECTOR_LABELS: Record<string, string> = {
  hotellerie: 'Hôtellerie & Tourisme',
  btp: 'BTP & Construction',
  sante: 'Santé & Pharmacie',
  distribution: 'Distribution & Commerce',
  agro: 'Agroalimentaire',
  conseil: 'Conseil & Services',
};

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [mockup, setMockup] = useState<Mockup | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/mockups?id=${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setMockup(data); })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Maquette introuvable.</p>
          <Link href="/" className="text-blue-400 underline">Retour à la galerie</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top bar */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Galerie
          </Link>
          {mockup && (
            <div>
              <span className="font-semibold">{mockup.company}</span>
              <span className="text-gray-400 text-sm ml-2">· {SECTOR_LABELS[mockup.sector] || mockup.sector}</span>
              {mockup.city && <span className="text-gray-400 text-sm ml-2">· {mockup.city}</span>}
            </div>
          )}
        </div>
        <a
          href={`/api/html/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Ouvrir dans un onglet
        </a>
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={`/api/html/${id}`}
          className="w-full h-full border-0"
          title="Aperçu maquette"
        />
      </div>
    </div>
  );
}
