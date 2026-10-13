/**
 * Minimal Gemini client with function calling (server-side only).
 * Set GEMINI_API_KEY, and optionally GEMINI_MODEL (check Google's current model list).
 */

// Tested in Oct 2026: fast, supports tool calls. If a model is overloaded (503), rate-limited (429),
// retired (404) or times out, the next one in the chain is tried.
const DEFAULT_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

let lastWorking: string | undefined;

export function llmIsConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelChain(): string[] {
  const first = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return Array.from(new Set([lastWorking, first, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[]));
}

/** The model that answered most recently (or the configured one). */
export function llmModel(): string {
  return lastWorking || process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: 'STRING' | 'INTEGER' | 'NUMBER'; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  [key: string]: unknown; // e.g. thoughtSignature, which must be passed back unchanged
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export async function geminiGenerate(opts: {
  system: string;
  contents: GeminiContent[];
  tools?: FunctionDeclaration[];
  allowTools?: boolean;
  timeoutMs?: number;
}): Promise<GeminiContent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: { temperature: 0.4 }
  };
  if (opts.tools && opts.tools.length) {
    body.tools = [{ functionDeclarations: opts.tools }];
    body.toolConfig = { functionCallingConfig: { mode: opts.allowTools === false ? 'NONE' : 'AUTO' } };
  }

  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const errors: string[] = [];
  const chain = modelChain();
  const deadline = Date.now() + (opts.timeoutMs ?? 20000);
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    const remaining = deadline - Date.now();
    if (remaining < 1500) break;
    // Leave time for a fallback model: a busy model gets at most 60% of what is left.
    const budget = i === chain.length - 1 ? remaining : Math.min(remaining, Math.max(4000, Math.round(remaining * 0.6)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budget);
    try {
      const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const msg = `${model}: HTTP ${res.status}${text ? ` ${text.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`;
        if ([404, 429, 500, 503].includes(res.status)) {
          errors.push(msg);
          continue; // try the next model
        }
        throw new Error(msg);
      }
      const json = await res.json();
      const content = json?.candidates?.[0]?.content;
      if (!content || !Array.isArray(content.parts)) {
        throw new Error(`${model} returned no content (finishReason: ${json?.candidates?.[0]?.finishReason || 'unknown'})`);
      }
      lastWorking = model;
      return { role: 'model', parts: content.parts };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        errors.push(`${model}: timed out`);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`No Gemini model answered (${errors.join('; ')})`);
}

/** Pull the first JSON object out of a model text reply. */
export function extractJson(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
