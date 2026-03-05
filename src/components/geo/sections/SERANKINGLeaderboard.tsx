'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
  domain: string;
  share_of_voice: number;
  engine?: string;
}

interface MacroSoM {
  [engine: string]: number;
}

interface SERANKINGLeaderboardProps {
  macroSomByEngine: MacroSoM;
  somTrend: number;
  leaderboard: LeaderboardEntry[];
  brandDomain?: string;
}

const ENGINE_LABELS: Record<string, string> = {
  'ai-overview': 'AI Overviews',
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
};

export function SERANKINGLeaderboard({
  macroSomByEngine,
  somTrend,
  leaderboard,
  brandDomain = 'printerpix.com',
}: SERANKINGLeaderboardProps) {
  const TrendIcon = somTrend > 0 ? TrendingUp : somTrend < 0 ? TrendingDown : Minus;
  const trendColor = somTrend > 0 ? 'text-green-400' : somTrend < 0 ? 'text-red-400' : 'text-zinc-500';

  return (
    <div className="space-y-4">
      {/* SoM per engine */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Share of Voice</h3>
          <span className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {somTrend > 0 ? '+' : ''}{(somTrend * 100).toFixed(1)}% vs last run
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(macroSomByEngine).map(([engine, som]) => (
            <div key={engine} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">{ENGINE_LABELS[engine] ?? engine}</p>
              <p className="text-lg font-semibold text-zinc-100">{(som * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Competitor Leaderboard</h3>
          <div className="space-y-1.5">
            {leaderboard.slice(0, 8).map((entry, i) => {
              const isBrand = entry.domain.includes('printerpix');
              const pct = (entry.share_of_voice * 100).toFixed(1);
              return (
                <div key={entry.domain} className={`flex items-center gap-3 p-2 rounded ${isBrand ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-zinc-800/30'}`}>
                  <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                  <span className={`text-sm flex-1 truncate ${isBrand ? 'text-purple-300 font-medium' : 'text-zinc-300'}`}>{entry.domain}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isBrand ? 'bg-purple-500' : 'bg-zinc-500'}`}
                        style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 w-10 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
