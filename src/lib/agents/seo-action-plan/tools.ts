import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { IssueDigest, IssueGroup } from './types';

/**
 * Build the 4 LangChain tools that query an IssueDigest in-memory.
 * Called once per agent run — the digest is closed over.
 */
export function buildAuditTools(digest: IssueDigest): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'getIssuesByCategory',
      description:
        'Returns all aggregated issue groups for a specific SEO category. ' +
        'Valid categories: crawlability, content, performance, security, indexation, on_page, images, mobile, international.',
      schema: z.object({
        category: z.string().describe('The issue category to filter by'),
      }),
      func: async ({ category }) => {
        const groups: IssueGroup[] = digest.issue_groups.filter(
          (g) => g.category.toLowerCase() === category.toLowerCase()
        );
        if (groups.length === 0) {
          return `No issues found for category "${category}". Available categories: ${[...new Set(digest.issue_groups.map((g) => g.category))].join(', ')}`;
        }
        return JSON.stringify(groups, null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getTopIssues',
      description:
        'Returns the top N most-prevalent issues filtered by severity. ' +
        'Use this to identify the biggest problems at each priority level.',
      schema: z.object({
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'all'])
          .describe('Severity level to filter by, or "all" for no filter'),
        limit: z.number().int().min(1).max(50).default(10).describe('Max number of issues to return'),
      }),
      func: async ({ severity, limit }) => {
        let groups = digest.issue_groups;
        if (severity !== 'all') {
          groups = groups.filter((g) => g.severity === severity);
        }
        return JSON.stringify(groups.slice(0, limit), null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getCategoryScore',
      description:
        'Returns the health score, issue count, and status for a specific SEO category. ' +
        'Valid categories: crawlability, content, performance, security, mobile, international.',
      schema: z.object({
        category: z.string().describe('The category name'),
      }),
      func: async ({ category }) => {
        const score = digest.category_scores[category.toLowerCase()];
        if (!score) {
          return `No score found for "${category}". Available: ${Object.keys(digest.category_scores).join(', ')}`;
        }
        return JSON.stringify({ category, ...score }, null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getPageSpeedSummary',
      description:
        'Returns Core Web Vitals summary data (LCP, CLS, INP) aggregated across all audited URLs. ' +
        'Use this to write the Performance section of the action plan.',
      schema: z.object({}),
      func: async () => {
        return JSON.stringify(digest.pagespeed_summary, null, 2);
      },
    }),
  ];
}
