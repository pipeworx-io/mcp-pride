interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * EBI PRIDE Archive MCP — proteomics (mass-spectrometry) data repository.
 * Keyless. Wraps the public PRIDE Archive REST API (v3).
 */


const BASE = 'https://www.ebi.ac.uk/pride/ws/archive/v3';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_projects',
    description:
      'Search EBI PRIDE Archive — the largest public proteomics/mass-spectrometry dataset repository — for projects by keyword (disease, organism, technique, protein, instrument). Returns matching project accessions with title, organisms, diseases, and instruments. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Free-text search term, e.g. "breast cancer", "SARS-CoV-2", "TMT".' },
        limit: { type: 'number', description: 'Max results per page (default 20, max 100).' },
        page: { type: 'number', description: 'Zero-based page index (default 0).' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'get_project',
    description:
      'Get full metadata for one PRIDE Archive proteomics project by accession (e.g. "PXD000001"): title, description, sample-processing and data-processing protocols, organisms, organism parts, diseases, instruments, keywords, and DOI.',
    inputSchema: {
      type: 'object',
      properties: {
        accession: { type: 'string', description: 'PRIDE project accession, e.g. "PXD000001".' },
      },
      required: ['accession'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_projects':
        return await searchProjects(args);
      case 'get_project':
        return await getProject(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchProjects(args: Record<string, unknown>): Promise<unknown> {
  const keyword = reqStr(args, 'keyword');
  const limit = clampNum(args.limit, 20, 1, 100);
  const page = clampNum(args.page, 0, 0, 1_000_000);
  const url = `${BASE}/search/projects?keyword=${encodeURIComponent(keyword)}&pageSize=${limit}&page=${page}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: `PRIDE search failed: ${res.status}`, keyword };
  const data = await safeJson(res);
  const list = asProjectArray(data);
  const projects = list.map((p) => ({
    accession: p.accession ?? null,
    title: p.title ?? null,
    submission_date: p.submissionDate ?? null,
    organisms: nameList(p.organisms),
    diseases: nameList(p.diseases),
    instruments: nameList(p.instruments),
  }));
  return { count: projects.length, projects };
}

async function getProject(args: Record<string, unknown>): Promise<unknown> {
  const accession = reqStr(args, 'accession');
  const url = `${BASE}/projects/${encodeURIComponent(accession)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: 'project not found', accession };
  const p = await safeJson(res);
  if (!p || typeof p !== 'object') return { error: 'project not found', accession };
  const o = p as Record<string, unknown>;
  return {
    accession: o.accession ?? accession,
    title: o.title ?? null,
    description: o.projectDescription ?? null,
    sample_protocol: truncate(o.sampleProcessingProtocol),
    data_protocol: truncate(o.dataProcessingProtocol),
    submission_date: o.submissionDate ?? null,
    publication_date: o.publicationDate ?? null,
    organisms: nameList(o.organisms),
    organism_parts: nameList(o.organismParts ?? o.organismsPart),
    diseases: nameList(o.diseases),
    instruments: nameList(o.instruments),
    keywords: nameList(o.keywords),
    doi: o.doi || null,
  };
}

/** PRIDE returns either a bare array or (rarely) a HAL-wrapped object. Prefer the array. */
function asProjectArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const embedded = (data as Record<string, unknown>)._embedded;
    if (embedded && typeof embedded === 'object') {
      const vals = Object.values(embedded as Record<string, unknown>);
      const arr = vals.find((v) => Array.isArray(v));
      if (Array.isArray(arr)) return arr as Record<string, unknown>[];
    }
  }
  return [];
}

/**
 * Normalize an organisms/diseases/instruments/keywords field to a string[].
 * Search returns plain strings; project detail returns CvParam objects with a `name`.
 */
function nameList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === 'string') {
      if (item.trim()) out.push(item);
    } else if (item && typeof item === 'object') {
      const name = (item as Record<string, unknown>).name;
      if (typeof name === 'string' && name.trim()) out.push(name);
    }
  }
  return out;
}

function truncate(v: unknown, max = 600): string | null {
  if (typeof v !== 'string') return null;
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function clampNum(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing.`);
  return v.trim();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
