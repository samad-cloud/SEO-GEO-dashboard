import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} @ ${formatTime(date)}`;
}

export function getHealthScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
}

export function getHealthScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getStatusDot(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-500/10';
    case 'high': return 'text-orange-500 bg-orange-500/10';
    case 'medium': return 'text-yellow-500 bg-yellow-500/10';
    case 'low': return 'text-green-500 bg-green-500/10';
    case 'info': return 'text-blue-500 bg-blue-500/10';
    default: return 'text-zinc-500 bg-zinc-500/10';
  }
}

export function getThreatColor(level: string): string {
  switch (level) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-orange-500';
    case 'low': return 'text-green-500';
    default: return 'text-zinc-500';
  }
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return 'text-green-500';
    case 'negative': return 'text-red-500';
    default: return 'text-zinc-400';
  }
}

export function getTrendIcon(trend: number): string {
  if (trend > 0) return '↑';
  if (trend < 0) return '↓';
  return '→';
}

export function getTrendColor(trend: number): string {
  if (trend > 0) return 'text-green-500';
  if (trend < 0) return 'text-red-500';
  return 'text-zinc-400';
}

export function getRegionFlag(region: string): string {
  const flags: Record<string, string> = {
    us: '🇺🇸',
    uk: '🇬🇧',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    ae: '🇦🇪',
    in: '🇮🇳',
  };
  return flags[region] || '🌍';
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    chatgpt: '🤖',
    perplexity: '🔍',
    claude: '🧠',
    gemini: '♊',
    ai_overviews: '🌐',
    copilot: '💻',
  };
  return icons[platform] || '🤖';
}
