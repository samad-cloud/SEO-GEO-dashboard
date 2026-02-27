import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Resolve the specs directory relative to the project root
const SPECS_DIR = path.join(process.cwd(), 'src', 'lib', 'agents', 'ticket-creation', 'specs');

interface RoutingEntry {
  pattern: string;
  page_spec?: string;
  layout?: string;
  i18n_rewrites?: Record<string, string>;
  examples?: string[];
  notes?: string;
}

interface IndexYaml {
  routing_table?: RoutingEntry[];
}

const TLD_MAP: Record<string, string> = {
  GB: 'co.uk',
  US: 'com',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  NL: 'nl',
  IN: 'in',
  AE: 'ae',
};

/**
 * Build the 5 LangChain tools for the classifier agent.
 */
export function buildClassifierTools(): DynamicStructuredTool[] {
  return [
    // ── Tool 1: readSpecFile ────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'readSpecFile',
      description:
        'Read any YAML spec file from the bundled specs directory. Use relative paths like ' +
        '"seo-specs/_index.yaml", "seo-specs/pages/home.yaml", ' +
        '"seo-specs/_api-guide.yaml", "seo-specs/_architecture.yaml", ' +
        '"migration-specs/backend/services/server.yaml". ' +
        'Returns the raw YAML content as a string.',
      schema: z.object({
        relativePath: z
          .string()
          .describe('Path relative to the specs/ directory, e.g. "seo-specs/pages/about-us.yaml"'),
      }),
      func: async ({ relativePath }) => {
        const fullPath = path.join(SPECS_DIR, relativePath);
        if (!fs.existsSync(fullPath)) {
          return (
            `Spec file not found: ${relativePath}. ` +
            `Available top-level dirs: seo-specs/, migration-specs/. ` +
            `Check the path and retry.`
          );
        }
        return fs.readFileSync(fullPath, 'utf-8');
      },
    }),

    // ── Tool 2: matchURLToRoute ─────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'matchURLToRoute',
      description:
        'Match a URL path to the routing table in seo-specs/_index.yaml. ' +
        'Returns the matching routing entry (page_spec path, layout, i18n_rewrites) ' +
        'or an "out of scope" message if the URL does not match any known route. ' +
        'Always call this first with one of the affected URLs.',
      schema: z.object({
        urlPath: z
          .string()
          .describe('URL path to match (without domain), e.g. "/canvas-prints/" or "/about-us"'),
      }),
      func: async ({ urlPath }) => {
        const indexPath = path.join(SPECS_DIR, 'seo-specs/_index.yaml');
        const content = fs.readFileSync(indexPath, 'utf-8');
        const parsed = yaml.load(content) as IndexYaml;
        const routingTable = parsed.routing_table ?? [];

        // Normalise: strip trailing slash for comparison (except root "/")
        const normalize = (p: string) =>
          p === '/' ? '/' : p.replace(/\/$/, '');
        const normalUrl = normalize(urlPath);

        // 1. Exact match
        for (const entry of routingTable) {
          if (normalize(entry.pattern) === normalUrl) {
            return JSON.stringify(entry, null, 2);
          }
        }

        // 2. i18n rewrite match — check if url matches any known i18n rewrite value
        for (const entry of routingTable) {
          const rewrites = entry.i18n_rewrites ?? {};
          if (Object.values(rewrites).some((v) => normalize(v) === normalUrl)) {
            return (
              `Matched via i18n rewrite:\n` + JSON.stringify(entry, null, 2)
            );
          }
        }

        // 3. Dynamic catch-all — treat any unmatched path as product/category if it
        //    doesn't look like a known fixed path
        const catchAll = routingTable.find(
          (e) => e.pattern === '/[...productCategory]'
        );
        if (catchAll) {
          // Check if it looks like a product/category URL (has path segments after /)
          const segments = urlPath.replace(/^\/|\/$/g, '').split('/');
          if (segments.length >= 1 && segments[0]) {
            return (
              `Matched catch-all route (product/category page):\n` +
              JSON.stringify(catchAll, null, 2)
            );
          }
        }

        return (
          `No route matched for "${urlPath}". ` +
          `This URL is out of scope. Set classification to "Out of Scope" and ` +
          `include "Spec Coverage: Out of scope — manual investigation required" ` +
          `in the Proposed Solution.`
        );
      },
    }),

    // ── Tool 3: getPageSpec ─────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'getPageSpec',
      description:
        'Read a page SEO spec file to get the seo_contract (expected title, meta, structured data, ' +
        'hreflang, canonical) and file_chain (which functions/files generate each SEO element). ' +
        'Pass the page_spec value from matchURLToRoute, e.g. "pages/home.yaml". ' +
        'The tool auto-prefixes "seo-specs/" if needed.',
      schema: z.object({
        pageSpecPath: z
          .string()
          .describe(
            'Page spec path from the routing table entry, e.g. "pages/home.yaml" or "seo-specs/pages/home.yaml"'
          ),
      }),
      func: async ({ pageSpecPath }) => {
        // Normalise path — accept both "pages/x.yaml" and "seo-specs/pages/x.yaml"
        const normalized = pageSpecPath.startsWith('seo-specs/')
          ? pageSpecPath
          : `seo-specs/${pageSpecPath.startsWith('pages/') ? pageSpecPath : `pages/${pageSpecPath}`}`;

        const fullPath = path.join(SPECS_DIR, normalized);
        if (!fs.existsSync(fullPath)) {
          return `Page spec not found at ${normalized}. Check the path from matchURLToRoute.`;
        }
        return fs.readFileSync(fullPath, 'utf-8');
      },
    }),

    // ── Tool 4: getAPIGuide ─────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'getAPIGuide',
      description:
        'Read the API guide (seo-specs/_api-guide.yaml) which contains pre-generated ' +
        'MACHINE_TOKENs for all 9 regions (GB, US, DE, FR, IT, ES, NL, IN, AE) and example ' +
        'curl commands. Always call this before callPrinterpixAPI to get the correct token ' +
        'and request format for the region and endpoint you need.',
      schema: z.object({}),
      func: async () => {
        const guidePath = path.join(SPECS_DIR, 'seo-specs/_api-guide.yaml');
        if (!fs.existsSync(guidePath)) {
          return 'API guide not found. Classify conservatively as Frontend Rendering Issue.';
        }
        return fs.readFileSync(guidePath, 'utf-8');
      },
    }),

    // ── Tool 5: callPrinterpixAPI ───────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'callPrinterpixAPI',
      description:
        'Call the Printerpix qt-api to verify whether an API field contains the correct value. ' +
        'Use this for API-driven SEO elements (title, meta description, canonical, robots, OG, ' +
        'structured data, breadcrumbs). Get the token from getAPIGuide first. ' +
        'Response is capped at 8 KB. If the call fails, classify as Frontend Rendering Issue.',
      schema: z.object({
        region: z
          .enum(['GB', 'US', 'DE', 'FR', 'IT', 'ES', 'NL', 'IN', 'AE'])
          .describe('Region to test — use the region most likely to be affected'),
        endpoint: z
          .string()
          .describe('API endpoint path, e.g. "/page/getPageData" or "/product/getProductPage"'),
        token: z
          .string()
          .describe('MACHINE_TOKEN from getAPIGuide for the selected region'),
        body: z
          .record(z.string(), z.unknown())
          .describe('Request body as a JSON object, per the curl example in getAPIGuide'),
      }),
      func: async ({ region, endpoint, token, body }) => {
        const tld = TLD_MAP[region] ?? 'com';
        const baseUrl = `https://qt-api.printerpix.${tld}`;
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            // 10-second timeout via AbortSignal
            signal: AbortSignal.timeout(10_000),
          });
          const json = await response.json();
          const text = JSON.stringify(json, null, 2);
          // Cap response to avoid flooding agent context
          return text.length > 8000 ? text.slice(0, 8000) + '\n... [truncated]' : text;
        } catch (error) {
          return (
            `API call failed: ${error instanceof Error ? error.message : String(error)}. ` +
            `Classify conservatively as Frontend Rendering Issue and note the API was unreachable.`
          );
        }
      },
    }),
  ];
}
