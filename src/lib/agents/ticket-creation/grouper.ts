import type { IssueGroupForTicket, RawAuditJson } from './types';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Groups all URL-level issues from the raw audit JSON into per-issue-type groups.
 * Unlike the action-plan preprocessor, this collects ALL affected URLs (not just samples)
 * so the Jira publisher can attach a complete CSV when count > 5.
 */
export function groupIssuesForTickets(raw: RawAuditJson): IssueGroupForTicket[] {
  // key: `${issue_type}|||${severity}|||${category}`
  const groupMap = new Map<
    string,
    { allUrls: string[]; exampleIssue: IssueGroupForTicket['exampleIssue']; domain: string }
  >();

  const urls = raw.urls ?? {};

  for (const [url, entry] of Object.entries(urls)) {
    if (!entry.issues) continue;

    for (const issue of entry.issues) {
      const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
      const existing = groupMap.get(key);

      if (existing) {
        existing.allUrls.push(url);
      } else {
        groupMap.set(key, {
          allUrls: [url],
          exampleIssue: {
            url,
            description: issue.description,
            recommendation: issue.recommendation,
            current_value: issue.current_value,
            expected_value: issue.expected_value,
          },
          domain: raw.domain,
        });
      }
    }
  }

  return Array.from(groupMap.entries())
    .map(([key, val]) => {
      const [issue_type, severity, category] = key.split('|||');
      return {
        issue_type,
        severity: severity as IssueGroupForTicket['severity'],
        category,
        count: val.allUrls.length,
        allUrls: val.allUrls,
        affectedDomains: [val.domain],
        exampleIssue: val.exampleIssue,
      };
    })
    .sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      return sevDiff !== 0 ? sevDiff : b.count - a.count;
    });
}
