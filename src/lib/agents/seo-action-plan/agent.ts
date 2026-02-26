import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { buildAuditTools } from './tools';
import type { IssueDigest } from './types';

const SYSTEM_PROMPT = `You are a senior SEO strategist. You have been given access to tools that query aggregated SEO audit data for a website. Your task is to produce a comprehensive, prioritised ACTION-PLAN.md in markdown format.

Use the tools to investigate each SEO category before writing its section. Do not guess — always call a tool to get the data before making recommendations.

The action plan MUST follow this exact structure:

# SEO Action Plan — {domain}
**Audit Date:** {audit_date}
**Health Score:** {health_score}/100

---

## Executive Summary
- Overall assessment (1-2 sentences)
- Top 5 critical/high issues as a bullet list
- Top 5 quick wins as a bullet list

## Technical SEO
### Crawlability & Indexation
[findings and recommendations]

### Security Headers
[findings and recommendations]

## Content
[findings and recommendations from content category issues]

## On-Page SEO
[findings and recommendations from on_page category issues]

## Performance (Core Web Vitals)
[LCP, CLS, INP findings and recommendations]

## Images
[findings and recommendations from images category issues]

---

## Priority Summary

| Priority | Issue | Affected URLs | Action |
|---|---|---|---|
[table rows: Critical → High → Medium → Low]

---

Priority definitions:
- **Critical**: Blocks indexing or causes penalties — fix immediately
- **High**: Significantly impacts rankings — fix within 1 week
- **Medium**: Optimisation opportunity — fix within 1 month
- **Low**: Nice to have — backlog

For each finding, state: what the issue is, how many URLs are affected, 2-3 sample URLs, and a concrete recommended action.
Only include sections where you find actual issues. Do not fabricate data.`;

export async function runActionPlanAgent(digest: IssueDigest): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 8192,
  });

  const tools = buildAuditTools(digest);

  const agent = createReactAgent({
    llm: model,
    tools,
    prompt: SYSTEM_PROMPT,
  });

  const userMessage = `
Generate a complete ACTION-PLAN.md for the following audit:

Domain: ${digest.domain}
Audit Date: ${digest.audit_date}
Health Score: ${digest.health_score}/100

Issue Summary:
- Total: ${digest.issue_summary.total_issues}
- Critical: ${digest.issue_summary.critical_count}
- High: ${digest.issue_summary.high_count}
- Medium: ${digest.issue_summary.medium_count}
- Low: ${digest.issue_summary.low_count}

Available issue categories: ${Object.keys(digest.category_scores).join(', ')}

Use your tools to investigate each category and write the full action plan now.
`;

  const result = await agent.invoke({
    messages: [new HumanMessage(userMessage)],
  });

  // Extract the final text message from the agent's response
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];

  if (typeof lastMessage.content === 'string') {
    return lastMessage.content;
  }

  if (Array.isArray(lastMessage.content)) {
    const textBlocks = lastMessage.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new Error('Agent returned no text content in final message');
    }
    return textBlocks.join('\n');
  }

  throw new Error('Agent returned unexpected message format');
}
