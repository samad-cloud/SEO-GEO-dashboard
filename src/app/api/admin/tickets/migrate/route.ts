import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// The 10 SEO tickets assigned to Ali Ahmed that need migrating from Jira to Supabase
const JIRA_ISSUE_KEYS = [
  'ENG-2513', 'ENG-2514', 'ENG-2515', 'ENG-2516', 'ENG-2517',
  'ENG-2518', 'ENG-2519', 'ENG-2521', 'ENG-2522', 'ENG-2523',
];

function getJiraConfig() {
  const baseUrl = process.env.JIRA_BASE_URL!;
  const email = process.env.JIRA_EMAIL!;
  const apiKey = process.env.JIRA_API_KEY!;
  const authHeader = `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`;
  return { baseUrl, authHeader };
}

async function fetchJiraIssue(key: string, config: ReturnType<typeof getJiraConfig>) {
  const res = await fetch(
    `${config.baseUrl}/rest/api/3/issue/${key}?fields=summary,labels,priority,status,created`,
    { headers: { Authorization: config.authHeader, Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`Jira fetch failed for ${key}: ${res.status}`);
  return res.json();
}

async function deleteJiraIssue(key: string, config: ReturnType<typeof getJiraConfig>) {
  const res = await fetch(`${config.baseUrl}/rest/api/3/issue/${key}`, {
    method: 'DELETE',
    headers: { Authorization: config.authHeader },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Jira delete failed for ${key} (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function POST() {
  const config = getJiraConfig();
  const supabase = createAdminClient();

  const migrated: string[] = [];
  const deleted: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of JIRA_ISSUE_KEYS) {
    try {
      // 1. Fetch from Jira
      const issue = await fetchJiraIssue(key, config);
      const fields = issue.fields;
      const labels: string[] = fields.labels ?? [];
      const team = labels.includes('Tech-Team') ? 'Tech Team'
                 : labels.includes('Data-Team') ? 'Data Team'
                 : null;

      // 2. Insert into Supabase as already-published ticket
      const { error: insertError } = await supabase.from('tickets').insert({
        run_id: 'jira-migration-2026-03-13',
        audit_id: null,
        domain: 'printerpix.com',
        audit_date: '2026-03-13',
        issue_type: fields.summary ?? key,
        severity: 'high',
        category: 'SEO',
        affected_url_count: 0,
        affected_urls: [],
        affected_domains: ['printerpix.com', '999inks.co.uk', 'clickinks.com'],
        objective: fields.summary ?? key,
        team,
        priority: fields.priority?.name ?? 'High',
        jira_issue_key: key,
        jira_url: `${config.baseUrl}/browse/${key}`,
        jira_attachment_created: false,
        jira_published_at: fields.created ?? new Date().toISOString(),
        status: 'published',
      });

      if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);
      migrated.push(key);

      // 3. Delete from Jira
      await deleteJiraIssue(key, config);
      deleted.push(key);
    } catch (err) {
      errors.push({ key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    migrated: migrated.length,
    deleted: deleted.length,
    errors,
    migratedKeys: migrated,
    deletedKeys: deleted,
  });
}
