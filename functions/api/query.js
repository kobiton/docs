/**
 * POST /api/query
 *
 * Cloudflare Pages Function — RAG search + AI answer endpoint.
 *
 * Environment bindings (set in wrangler.toml + Cloudflare dashboard secrets):
 *   env.RAG_API_URL         FastAPI on EKS — all /api/query calls are proxied here
 *   env.RAG_API_KEY         Shared secret sent as X-RAG-Api-Key header (optional;
 *                           only needed when FastAPI has RAG_AUTH_ENABLED=true)
 *   env.ANTHROPIC_API_KEY   Anthropic API key (secret; only for CF-native mode)
 *   env.LLM_MODEL           Claude model name (default: claude-haiku-4-5)
 *
 * The function runs the full RAG pipeline:
 *   1. Fetch + cache embeddings index from EMBEDDINGS_URL
 *   2. Embed the user query via a lightweight cosine similarity in JS
 *   3. Retrieve top-k chunks
 *   4. Generate an answer with Claude (or return search results only if no key)
 */

const RELATED_SCORE = 0.35
const TOP_K = 5
const CACHE_TTL_SECONDS = 300 // 5 min — matches Cloudflare prompt cache TTL

// ── In-memory embeddings cache (warm across requests in same isolate) ─────────
let embeddingsCache = null
let embeddingsCacheTime = 0

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ request, env }) {
  try {
    const { query } = await request.json()
    const q = (query || '').trim()

    if (!q) {
      return json({ message: 'Enter a question or search term.', results: [], fallback: true })
    }

    // ── Proxy to FastAPI on EKS ───────────────────────────────────────────────
    if (env.RAG_API_URL) {
      const headers = { 'Content-Type': 'application/json' }
      if (env.RAG_API_KEY) headers['X-RAG-Api-Key'] = env.RAG_API_KEY
      const upstream = await fetch(`${env.RAG_API_URL}/assistant`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q }),
      })
      const data = await upstream.json()
      return json(data)
    }

    // ── 1. Load embeddings index ──────────────────────────────────────────────
    const chunks = await getEmbeddings(env)
    if (!chunks.length) {
      return json({ message: 'Index not available.', results: [], fallback: true })
    }

    // ── 2. Embed query (lightweight JS cosine similarity) ────────────────────
    const queryVec = await embedText(q, env)
    if (!queryVec) {
      return json({ message: 'Embedding unavailable.', results: [], fallback: true })
    }

    // ── 3. Rank chunks ────────────────────────────────────────────────────────
    const ranked = rankChunks(queryVec, chunks, TOP_K)
    const relevant = ranked.filter(([score]) => score >= RELATED_SCORE)

    if (!relevant.length) {
      return json({
        message:
          "I couldn't find a confident match in the public documentation. " +
          'Try different keywords, or contact Kobiton Support or your Kobiton administrator.',
        results: [],
        fallback: true,
      })
    }

    // ── 4. Dedupe by source, build result list ────────────────────────────────
    const deduped = dedupeBySource(relevant)
    const results = deduped.map(([score, chunk]) => ({
      title: chunk.title,
      source: chunk.source,
      source_url: chunk.source_url || null,
      preview: makePreview(chunk.content, 160),
      score: Math.round(score * 10000) / 10000,
    }))

    // ── 5. Generate AI answer (if Anthropic key is set) ───────────────────────
    let message
    if (env.ANTHROPIC_API_KEY) {
      message = await generateAnswer(q, deduped, env)
    } else {
      // No API key — return a friendly wrapper message without LLM
      message = results.length === 1
        ? 'I found one doc that may help.'
        : `I found ${results.length} docs that may help.`
    }

    return json({ message, results, fallback: false })
  } catch (err) {
    console.error('RAG query error:', err)
    return json(
      { message: 'Something went wrong. Please try again.', results: [], fallback: true },
      500
    )
  }
}

// ── Embeddings loader ─────────────────────────────────────────────────────────

async function getEmbeddings(env) {
  const now = Date.now()
  if (embeddingsCache && now - embeddingsCacheTime < CACHE_TTL_SECONDS * 1000) {
    return embeddingsCache
  }

  const url = env.EMBEDDINGS_URL
  if (!url) {
    console.error('EMBEDDINGS_URL is not set')
    return []
  }

  const res = await fetch(url, {
    headers: { 'Cache-Control': `max-age=${CACHE_TTL_SECONDS}` },
  })
  if (!res.ok) {
    console.error('Failed to fetch embeddings:', res.status)
    return []
  }

  embeddingsCache = await res.json()
  embeddingsCacheTime = now
  return embeddingsCache
}

// ── Query embedding via Cloudflare Workers AI ─────────────────────────────────
// Falls back to a dummy zero-vector if AI binding is unavailable (unit tests).

async function embedText(text, env) {
  if (env.AI) {
    try {
      const result = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text })
      // bge-small returns { data: [[...384 floats]] }
      return result.data?.[0] ?? null
    } catch (e) {
      console.error('AI embedding error:', e)
    }
  }
  return null
}

// ── Cosine similarity + ranking ───────────────────────────────────────────────

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function rankChunks(queryVec, chunks, topK) {
  return chunks
    .map(chunk => [cosine(queryVec, chunk.embedding), chunk])
    .sort(([a], [b]) => b - a)
    .slice(0, topK)
}

function dedupeBySource(ranked) {
  const seen = new Set()
  return ranked.filter(([, chunk]) => {
    if (seen.has(chunk.source)) return false
    seen.add(chunk.source)
    return true
  })
}

function makePreview(text, max) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : flat.slice(0, max).trimEnd() + '…'
}

// ── Claude answer generation ──────────────────────────────────────────────────

async function generateAnswer(query, rankedChunks, env) {
  const model = env.LLM_MODEL || 'claude-haiku-4-5'

  const context = rankedChunks
    .map(([score, chunk]) =>
      `Title: ${chunk.title}\nSource: ${chunk.source}\nRelevance: ${score.toFixed(4)}\n${chunk.content}`
    )
    .join('\n\n---\n\n')

  const prompt = buildAnswerPrompt(query, context)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    console.error('Claude API error:', res.status, await res.text())
    // Graceful fallback — still return results without AI answer
    return rankedChunks.length === 1
      ? 'I found one doc that may help.'
      : `I found ${rankedChunks.length} docs that may help.`
  }

  const data = await res.json()
  return cleanAnswer(data.content?.[0]?.text?.trim() || '')
}

function buildAnswerPrompt(query, context) {
  return `You are a documentation assistant for Kobiton public documentation.

Answer the user's question using only the documentation excerpts below.

Rules:
- Use only the provided excerpts. Do not use outside knowledge.
- Answer only the user's exact question.
- If you cannot answer confidently, output only: "I could not find enough information in the documentation to answer that confidently."
- Answer in 1 short paragraph using plain English.
- Do not use Markdown code blocks or backticks.
- Do not say "According to".
- End with a line: Source: <filename>
- Do not mention relevance scores.

User question:
${query}

Documentation excerpts:
${context}

Answer:`
}

function cleanAnswer(text) {
  // Strip any trailing hallucinated content after stop markers
  for (const marker of ['\n---', '\nUser question:', '\nDocumentation excerpts:', '\nAnswer:']) {
    const idx = text.indexOf(marker)
    if (idx !== -1) text = text.slice(0, idx).trim()
  }
  // Normalise Source: to its own line
  text = text.replace(/ Source:/g, '\n\nSource:')
  return text.trim()
}

// ── Response helper ───────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
