import type { IssueGroupForTicket, RawAuditJson } from './types';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface AuditInput {
  auditId: string;
  domain: string;
  rawJson: RawAuditJson;
}

/**
 * Groups issues from multiple domain audits into combined cross-domain groups.
 * Issues with the same issue_type + severity + category are merged into a single
 * group regardless of which domain they came from.
 */
export function groupIssuesAcrossDomains(audits: AuditInput[]): IssueGroupForTicket[] {
  // key: `${issue_type}|||${severity}|||${category}`
  const groupMap = new Map<
    string,
    {
      allUrls: string[];
      affectedDomains: Set<string>;
      exampleIssue: IssueGroupForTicket['exampleIssue'];
    }
  >();

  for (const { domain, rawJson } of audits) {
    const urls = rawJson.urls ?? {};

    for (const [url, entry] of Object.entries(urls)) {
      if (!entry.issues) continue;

      for (const issue of entry.issues) {
        const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
        const existing = groupMap.get(key);

        if (existing) {
          existing.allUrls.push(url);
          existing.affectedDomains.add(domain);
        } else {
          // Prefer an example that has description + current_value for richer context
          groupMap.set(key, {
            allUrls: [url],
            affectedDomains: new Set([domain]),
            exampleIssue: {
              url,
              description: issue.description,
              recommendation: issue.recommendation,
              current_value: issue.current_value,
              expected_value: issue.expected_value,
            },
          });
        }

        // Upgrade the example if the current one has richer context
        const group = groupMap.get(key)!;
        if (
          !group.exampleIssue.description &&
          (issue.description || issue.current_value)
        ) {
          group.exampleIssue = {
            url,
            description: issue.description,
            recommendation: issue.recommendation,
            current_value: issue.current_value,
            expected_value: issue.expected_value,
          };
        }
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
        affectedDomains: Array.from(val.affectedDomains),
        exampleIssue: val.exampleIssue,
      };
    })
    .sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      return sevDiff !== 0 ? sevDiff : b.count - a.count;
    });
}
