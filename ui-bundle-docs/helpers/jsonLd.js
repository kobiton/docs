'use strict'

// Tag-strip regex mirrors detag.js. Inlined because Antora loads helpers from a
// virtual filesystem and cross-helper require() does not resolve.
const TAG_RX = /<[^>]+>/g
const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}
const ENTITY_RX = /&(amp|lt|gt|quot|#39|apos);/g

function plainText (value) {
  if (value == null) return ''
  return String(value).replace(TAG_RX, '').replace(ENTITY_RX, (m) => ENTITY_MAP[m] || m).trim()
}

function ensureAbsolute (origin, url) {
  if (!url) return undefined
  const s = String(url)
  if (/^[a-z]+:\/\//i.test(s)) return s
  if (s.startsWith('/')) return origin + s
  return origin + '/' + s
}

module.exports = (page, site) => {
  if (!page || !page.title || !page.canonicalUrl) return ''

  const origin = (site && site.url ? String(site.url) : '').replace(/\/+$/, '')
  const canonical = String(page.canonicalUrl)
  const graph = []

  // TechArticle: emit only for pages that have a navigation parent in Antora's
  // breadcrumb tree. Landing and section-index pages carry a single-item
  // breadcrumbs array; content articles carry two or more entries.
  if (Array.isArray(page.breadcrumbs) && page.breadcrumbs.length > 1) {
    const article = {
      '@type': 'TechArticle',
      headline: plainText(page.title),
      inLanguage: 'en',
      url: canonical,
      mainEntityOfPage: canonical,
      publisher: { '@type': 'Organization', name: 'Kobiton' },
    }
    if (site && site.title) {
      article.isPartOf = {
        '@type': 'WebSite',
        name: plainText(site.title),
        url: origin + '/',
      }
    }
    if (page.description) {
      const desc = plainText(page.description)
      if (desc) article.description = desc
    }
    graph.push(article)
  }

  // BreadcrumbList: mirror the body breadcrumb partial. Prepend componentVersion
  // when it differs from the first page.breadcrumbs entry. Emit only when the
  // resulting list has at least two items.
  const items = []
  const cv = page.componentVersion
  const first = page.breadcrumbs && page.breadcrumbs[0]
  if (cv && cv.title && (!first || first.content !== cv.title)) {
    const name = plainText(cv.title)
    if (name) items.push({ name, item: ensureAbsolute(origin, cv.url) })
  }
  if (Array.isArray(page.breadcrumbs)) {
    for (const b of page.breadcrumbs) {
      if (!b || !b.content) continue
      const name = plainText(b.content)
      if (!name) continue
      const item = b.urlType === 'internal' ? ensureAbsolute(origin, b.url) : undefined
      items.push({ name, item })
    }
  }
  // Dedupe consecutive entries that resolve to the same URL. The text-diff
  // prepend above mirrors the body breadcrumb partial but can't catch the case
  // where componentVersion.url and breadcrumbs[0].url both point to the site
  // root (e.g., on the home page).
  const deduped = []
  for (const it of items) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.item && it.item && prev.item === it.item) continue
    deduped.push(it)
  }
  if (deduped.length >= 2) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: deduped.map((it, i) => {
        const entry = { '@type': 'ListItem', position: i + 1, name: it.name }
        if (it.item) entry.item = it.item
        return entry
      }),
    })
  }

  if (!graph.length) return ''

  const payload = { '@context': 'https://schema.org', '@graph': graph }
  const serialized = JSON.stringify(payload).replace(/<\/(script)/gi, '<\\/$1')
  return `<script type="application/ld+json">${serialized}</script>`
}
