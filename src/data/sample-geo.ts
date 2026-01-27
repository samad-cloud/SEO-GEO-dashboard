import { ResearchRun, PlatformBreakdown, RegionalBreakdown, DataVoid, CompetitorInsight, CitationWithContext, GeoTask, IssueDetail } from '@/types/geo';

export const samplePlatformBreakdown: PlatformBreakdown[] = [
  { platform: 'chatgpt', som: 24, citations: 156, sentiment: 'positive', trend: 5 },
  { platform: 'perplexity', som: 20, citations: 156, sentiment: 'positive', trend: 3 },
  { platform: 'claude', som: 2.4, citations: 153, sentiment: 'positive', trend: 2 },
  { platform: 'gemini', som: 0.5, citations: 156, sentiment: 'neutral', trend: 1 },
  { platform: 'ai_overviews', som: 0.5, citations: 0, sentiment: 'neutral', trend: 0 },
];

export const sampleRegionalBreakdown: RegionalBreakdown[] = [
  { region: 'us', som: 26, topCompetitor: 'ChatGPT', opportunities: 2, threats: 'high' },
  { region: 'uk', som: 25, topCompetitor: 'Gammerson', opportunities: 2, threats: 'medium' },
  { region: 'de', som: 1.2, topCompetitor: 'ChatSPT', opportunities: 0, threats: 'low' },
  { region: 'fr', som: 0.5, topCompetitor: 'Span Datoncross', opportunities: 0, threats: 'low' },
];

export const sampleDataVoids: DataVoid[] = [
  { topic: 'Topic in tenalstown', score: 0.70, priority: 'high' },
  { topic: 'Topic of nurnarny straepy', score: 0.75, priority: 'high' },
  { topic: 'Topic of kliter-ooxo-tsoxcs', score: 0.78, priority: 'high' },
];

export const sampleCompetitorInsights: CompetitorInsight[] = [
  { competitor: 'Competitor', region: 'us', share: 50.0, threatLevel: 'high', keyStrength: '93' },
  { competitor: 'Competitor', region: 'uk', share: 35.7, threatLevel: 'high', keyStrength: '93' },
  { competitor: 'Competitor', region: 'de', share: 7.2, threatLevel: 'high', keyStrength: '70' },
];

export const sampleCitationsWithContext: CitationWithContext[] = [
  { platform: 'chatgpt', query: 'What does to trend?', citationContext: '"Tho hew to sillo case come..."' },
  { platform: 'perplexity', query: 'What neets to send?', citationContext: '"Eamtnyis moheck madlning..."' },
  { platform: 'claude', query: 'What does to trend?', citationContext: '"Repersent combined as so..."' },
  { platform: 'gemini', query: 'What neets to ounn?', citationContext: '"You\'re logor or our seam to..."' },
];

export const sampleIssueDetails: IssueDetail[] = [
  { severity: 'high', category: 'ChatGPT', type: 'URL', url: 'https://printerpix.com...', platform: 'chatgpt' },
  { severity: 'medium', category: 'Perplexity', type: 'URL', url: 'https://printerpix.com...', platform: 'perplexity' },
  { severity: 'low', category: 'Claude', type: 'URL', url: 'https://printerpix.com...', platform: 'claude' },
  { severity: 'low', category: 'Gemini', type: 'URL', url: 'https://printerpix.com...', platform: 'gemini' },
  { severity: 'info', category: 'Mobile', type: 'URL', url: 'https://printerpix.com...', platform: 'chatgpt' },
  { severity: 'info', category: 'Info', type: 'URL', url: 'https://printerpix.com...', platform: 'perplexity' },
];

export const sampleTasks: GeoTask[] = [
  { id: '1', type: 'research.run_audit', status: 'in_progress', priority: 'high', createdAt: new Date() },
  { id: '2', type: 'content.comparison', status: 'pending', priority: 'high', createdAt: new Date() },
  { id: '3', type: 'entity.wikipedia', status: 'pending', priority: 'medium', createdAt: new Date() },
  { id: '4', type: 'technical.indexnow', status: 'completed', priority: 'medium', createdAt: new Date() },
];

export const sampleResearchRun: ResearchRun = {
  id: 'research_20260127_091500',
  timestamp: new Date('2026-01-27T09:15:00'),
  status: 'complete',
  regions: ['us', 'uk', 'de', 'fr'],
  shareOfModel: 24,
  citations: 156,
  dataVoids: 8,
  opportunities: 23,
  platformBreakdown: samplePlatformBreakdown,
  regionalBreakdown: sampleRegionalBreakdown,
  competitorInsights: sampleCompetitorInsights,
  citationsWithContext: sampleCitationsWithContext,
  tasks: sampleTasks,
};
