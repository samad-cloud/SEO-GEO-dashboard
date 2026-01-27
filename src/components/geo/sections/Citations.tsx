'use client';

import { CitationWithContext } from '@/types/geo';
import { getPlatformIcon } from '@/lib/utils';

interface CitationsSectionProps {
  citations: CitationWithContext[];
}

const platformNames: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
  gemini: 'Gemini',
  ai_overviews: 'AI Overviews',
  copilot: 'Copilot',
};

export function CitationsSection({ citations }: CitationsSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Platform</th>
            <th>Query</th>
            <th>Citation Context</th>
          </tr>
        </thead>
        <tbody>
          {citations.map((citation, index) => (
            <tr key={index}>
              <td>
                <div className="flex items-center gap-2">
                  <span>{getPlatformIcon(citation.platform)}</span>
                  <span className="text-zinc-300">{platformNames[citation.platform] || citation.platform}</span>
                </div>
              </td>
              <td className="text-zinc-400 max-w-[200px] truncate">{citation.query}</td>
              <td className="text-zinc-500 italic max-w-[250px] truncate">{citation.citationContext}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
