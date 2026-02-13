'use client';

import { BookOpen, CheckCircle, XCircle, ExternalLink, Calendar } from 'lucide-react';

interface WikiAssessment {
  id: string;
  runId: string;
  entity: string;
  platform: string;
  language: string;
  existsFlag: boolean;
  completenessScore: number;
  notabilityAssessment: string;
  articleType: string;
  reviewStatus: string;
  assessmentJson?: {
    wikipedia_url?: string;
    wikidata_id?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

interface WikiAssessmentsSectionProps {
  assessments: WikiAssessment[];
}

const platformLabels: Record<string, string> = {
  wikipedia: 'Wikipedia',
  wikidata: 'Wikidata',
};

const reviewStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
};

function formatDate(iso: string): string {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const articleTypeLabels: Record<string, string> = {
  new_article: 'New Article',
  existing_update: 'Update Existing',
  wikidata_item: 'Wikidata Item',
};

function ReferenceLinks({ assessment }: { assessment: WikiAssessment }) {
  const json = assessment.assessmentJson;
  if (!json) return null;

  const wikipediaUrl = json.wikipedia_url || '';
  const wikidataId = json.wikidata_id || '';
  const wikidataUrl = wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : null;

  // Don't show links if nothing was found
  if (!wikipediaUrl && !wikidataId) return <span className="text-zinc-600 text-xs">--</span>;

  return (
    <div className="flex items-center gap-2">
      {wikipediaUrl && (
        <a
          href={wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          title={wikipediaUrl}
        >
          <ExternalLink className="w-3 h-3" />
          Wiki
        </a>
      )}
      {wikidataUrl && (
        <a
          href={wikidataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          title={wikidataId!}
        >
          <ExternalLink className="w-3 h-3" />
          {wikidataId}
        </a>
      )}
    </div>
  );
}

export function WikiAssessmentsSection({ assessments }: WikiAssessmentsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">Total Entities</div>
          <div className="text-lg font-semibold text-zinc-200">
            {new Set(assessments.map(a => a.entity)).size}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">Articles Exist</div>
          <div className="text-lg font-semibold text-green-400">
            {assessments.filter(a => a.existsFlag).length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">Missing</div>
          <div className="text-lg font-semibold text-red-400">
            {assessments.filter(a => !a.existsFlag).length}
          </div>
        </div>
      </div>

      {/* Assessment table */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full data-table text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th>Entity</th>
              <th>Platform</th>
              <th>Language</th>
              <th>Exists</th>
              <th>Completeness</th>
              <th>Type</th>
              <th>References</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((assessment) => (
              <tr key={assessment.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-zinc-300">{assessment.entity}</span>
                  </div>
                </td>
                <td className="text-zinc-400 text-xs">
                  {platformLabels[assessment.platform] || assessment.platform}
                </td>
                <td className="text-zinc-500 text-xs uppercase">{assessment.language}</td>
                <td>
                  {assessment.existsFlag ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          assessment.completenessScore > 70 ? 'bg-green-500' :
                          assessment.completenessScore > 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${assessment.completenessScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{assessment.completenessScore}%</span>
                  </div>
                </td>
                <td>
                  <span className="text-zinc-400 text-xs">
                    {articleTypeLabels[assessment.articleType] || assessment.articleType}
                  </span>
                </td>
                <td>
                  <ReferenceLinks assessment={assessment} />
                </td>
                <td className="text-zinc-500 text-xs whitespace-nowrap">
                  {formatDate(assessment.createdAt)}
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${reviewStatusColors[assessment.reviewStatus] || reviewStatusColors.pending}`}>
                    {assessment.reviewStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assessments.length === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500">No wiki assessments found.</p>
      )}
    </div>
  );
}
