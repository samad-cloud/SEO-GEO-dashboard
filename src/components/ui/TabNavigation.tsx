'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TabNavigation() {
  const pathname = usePathname();
  const activeTab = pathname.startsWith('/geo') ? 'geo' : 'seo';

  return (
    <div className="px-6 py-4 border-b border-zinc-800">
      <div className="inline-flex rounded-lg bg-zinc-800/50 p-1">
        <Link
          href="/seo"
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'seo'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          SEO
        </Link>
        <Link
          href="/geo"
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'geo'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          GEO
        </Link>
      </div>
    </div>
  );
}
