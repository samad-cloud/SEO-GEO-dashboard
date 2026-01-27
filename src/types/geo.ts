// GEO Research Types

export type Platform = 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'ai_overviews' | 'copilot';
export type Region = 'us' | 'uk' | 'de' | 'fr' | 'es' | 'it' | 'ae' | 'in';
export type ThreatLevel = 'high' | 'medium' | 'low';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PlatformBreakdown {
  platform: Platform;
  som: number; // Share of Model percentage
  citations: number;
  sentiment: Sentiment;
  trend: number; // percentage change
}

export interface RegionalBreakdown {
  region: Region;
  som: number;
  topCompetitor: string;
  topCompetitorShare?: number;
  opportunities: number;
  threats: ThreatLevel;
}

export interface DataVoid {
  topic: string;
  score: number; // opportunity score 0-1
  priority: 'high' | 'medium' | 'low';
  uncertainty_score?: number;
  current_coverage?: number;
  recommended_action?: string;
}

export interface CompetitorInsight {
  competitor: string;
  region: Region;
  share: number;
  threatLevel: ThreatLevel;
  keyStrength?: string;
}

export interface CitationWithContext {
  platform: Platform;
  query: string;
  citationContext: string;
  url?: string;
  domain?: string;
}

export interface GeoTask {
  id: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
}

export interface ContentRecommendation {
  topic: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale?: string;
  estimated_impact?: number;
}

export interface EntityRecommendation {
  entity: string;
  action: string;
  platform: string;
  priority: 'high' | 'medium' | 'low';
  rationale?: string;
}

export interface CitationRecommendation {
  topic: string;
  platform: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  engagement_score?: number;
}

export interface Recommendations {
  content: ContentRecommendation[];
  entity: EntityRecommendation[];
  citation: CitationRecommendation[];
}

export interface ResearchRun {
  id: string;
  timestamp: Date;
  status: 'complete' | 'running' | 'failed';
  regions: Region[];
  shareOfModel: number;
  citations: number;
  dataVoids: number;
  opportunities: number;
  platformBreakdown: PlatformBreakdown[];
  regionalBreakdown: RegionalBreakdown[];
  competitorInsights: CompetitorInsight[];
  citationsWithContext: CitationWithContext[];
  dataVoidsList?: DataVoid[];
  tasks: GeoTask[];
  recommendations?: Recommendations;
  _mock?: boolean;
  _message?: string;
}

export interface IssueDetail {
  severity: string;
  category: string;
  type: string;
  url: string;
  platform?: Platform;
}
