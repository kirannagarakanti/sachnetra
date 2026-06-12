// C1 fetch module for SachManas (the Mind) — lifted from the P1c probe (proven on 4/5 load-bearing sources).
// Phase-2 deliverable. Copy into the SachManas repo. READ-ONLY on the network; writes nothing here.
//
// Fetch order (P1c finding — research-notes/2026-06-12_p1c-fetch-probe-results.md):
//   HTTP GET (Chrome UA) → JSON-LD articleBody → Readability fallback → (paid, gated) url_context
// The own-fetcher path is free + zero LLM quota and covers ET / Moneycontrol / LiveMint / Business Standard.
// Moneycontrol bot-walls Google's url_context fetcher but serves full articleBody to a plain GET — so the
// JSON-LD path is PRIMARY, url_context is a last resort only.
//
// Gating (blueprint v0.1 §6): only call fetchBody() when description < ~300 words AND the row routed to
// company/factor AND the source is trusted. Track per-source success + which method won (router_trail/body_source).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

export const wordCount = (t) => (t ? t.split(/\s+/).filter(Boolean).length : 0);

// ── JSON-LD articleBody (primary path) ───────────────────────────────────────
function deepFindArticleBody(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) deepFindArticleBody(n, out); return; }
  if (typeof node.articleBody === 'string') out.push(node.articleBody);
  for (const k of Object.keys(node)) deepFindArticleBody(node[k], out);
}

export function extractJsonLdBody(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim());
  const found = [];
  for (const b of blocks) {
    try { deepFindArticleBody(JSON.parse(b), found); }
    catch {
      // tolerate malformed JSON-LD: regex the field out
      const m = b.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) found.push(m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[0-9a-f]{4}/gi, ' '));
    }
  }
  return (found.sort((a, b) => b.length - a.length)[0] || '').replace(/\s+/g, ' ').trim();
}

// ── Readability fallback (Hindu BusinessLine-class: no JSON-LD) ───────────────
// James: wire @mozilla/readability + linkedom here. Stub returns '' so the chain falls through cleanly.
export function extractReadability(_html) {
  // TODO(James): const { document } = parseHTML(html); return new Readability(document).parse()?.textContent ?? '';
  return '';
}

// ── url_context (paid, last resort — gate hard; 20/day on Gemini free tier per P1c) ──
export async function fetchViaUrlContext(_url, _opts = {}) {
  // TODO(James): only when JSON-LD + Readability both fail AND source is high-value AND daily budget remains.
  return { body: '', source: 'url_context' };
}

// ── the public entry point ───────────────────────────────────────────────────
// Returns { body, source, words } where source ∈ 'jsonld'|'readability'|'url_context'|'' (give up → snippet-only).
export async function fetchBody(url, { minWords = 120, timeoutMs = 20_000, allowUrlContext = false } = {}) {
  let html = '';
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (r.ok) html = await r.text();
  } catch { /* network/timeout → fall through to snippet-only */ }

  if (html) {
    const jl = extractJsonLdBody(html);
    if (wordCount(jl) >= minWords) return { body: jl, source: 'jsonld', words: wordCount(jl) };

    const rd = extractReadability(html);
    if (wordCount(rd) >= minWords) return { body: rd, source: 'readability', words: wordCount(rd) };
  }

  if (allowUrlContext) {
    const { body } = await fetchViaUrlContext(url);
    if (wordCount(body) >= minWords) return { body, source: 'url_context', words: wordCount(body) };
  }

  return { body: '', source: '', words: 0 };  // caller keeps description snippet-only
}
