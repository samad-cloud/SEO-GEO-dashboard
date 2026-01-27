'use client';

import { PlatformBreakdown } from '@/types/geo';
import { getPlatformIcon, getTrendIcon, getTrendColor, getSentimentColor } from '@/lib/utils';

interface PlatformBreakdownSectionProps {
  platforms: PlatformBreakdown[];
}

const platformNames: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
  gemini: 'Gemini',
  ai_overviews: 'AI Overviews',
  copilot: 'Copilot',
};

export function PlatformBreakdownSection({ platforms }: PlatformBreakdownSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Platform</th>
            <th>SoM</th>
            <th>Citations</th>
            <th>Sentiment</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => (
            <tr key={platform.platform}>
              <td>
                <div className="flex items-center gap-2">
                  <span>{getPlatformIcon(platform.platform)}</span>
                  <span className="text-zinc-300">{platformNames[platform.platform] || platform.platform}</span>
                </div>
              </td>
              <td className="text-zinc-300">{platform.som}%</td>
              <td className="text-zinc-300">{platform.citations}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className={`w-16 h-1.5 rounded-full ${
                    platform.sentiment === 'positive' ? 'bg-green-500' :
                    platform.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className={`text-xs capitalize ${getSentimentColor(platform.sentiment)}`}>
                    {platform.sentiment}
                  </span>
                </div>
              </td>
              <td>
                <span className={getTrendColor(platform.trend)}>
                  {getTrendIcon(platform.trend)} {platform.trend > 0 ? '+' : ''}{platform.trend}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
