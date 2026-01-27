'use client';

import { Globe } from 'lucide-react';

export function GeoPanel() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">GEO Intelligence</h2>
        <p className="text-sm text-zinc-500">Coming soon</p>
      </div>
    </div>
  );
}
