/**
 * Kobiton AI Assistant
 *
 * Handles:
 *  - Floating launcher button (open/close)
 *  - Multi-turn chat panel with streaming-style rendering
 *  - Hybrid search hint dropdown on the header/landing search bar
 *    (semantic results + "Ask AI instead" CTA)
 *  - Keyboard: Enter to send, Escape to close, ⌘K / Ctrl+K to open
 *
 * API: POST /api/query  { query: string }
 *   → { message: string, results: [{title, source, source_url, preview, score}], fallback: bool }
 */

;(function () {
  'use strict'

  var RAG_API = '/api/query'
  var SEARCH_DEBOUNCE_MS = 350
  var MAX_HISTORY = 10 // keep last N turns in context

  // ── State ──────────────────────────────────────────────────────────────────
  var isOpen = false
  var isLoading = false
  var conversationHistory = [] // [{role:'user'|'assistant', text:'...'}]
  var searchDebounceTimer = null

  // ── DOM refs (resolved after DOMContentLoaded) ─────────────────────────────
  var panel, launcher, closeBtn, messagesEl, inputEl, sendBtn
  var searchInput, searchHint, searchHintResults, searchHintAskBtn

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    panel        = document.getElementById('ai-assistant')
    launcher     = document.getElementById('ai-launcher-btn')
    closeBtn     = document.getElementById('ai-close-btn')
    messagesEl   = document.getElementById('ai-messages')
    inputEl      = document.getElementById('ai-input')
    sendBtn      = document.getElementById('ai-send-btn')
    searchInput  = document.getElementById('search-input')
    searchHint   = document.getElementById('search-ai-hint')
    searchHintResults = document.getElementById('search-hint-results')
    searchHintAskBtn  = document.getElementById('search-hint-ask-btn')

    if (!panel || !launcher) return

    // Launcher click
    launcher.addEventListener('click', function () {
      isOpen ? closePanel() : openPanel()
    })

    // Close button
    closeBtn && closeBtn.addEventListener('click', closePanel)

    // Click outside closes panel
    document.addEventListener('click', function (e) {
      if (isOpen && !panel.contains(e.target) && !launcher.contains(e.target)) {
        closePanel()
      }
    })

    // Escape closes panel
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel()
      // ⌘K / Ctrl+K opens panel and focuses input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        isOpen ? inputEl && inputEl.focus() : openPanel()
      }
    })

    // Send on Enter in chat input
    inputEl && inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    })

    sendBtn && sendBtn.addEventListener('click', handleSend)

    // ── Search bar hybrid hint ─────────────────────────────────────────────
    if (searchInput) {
      searchInput.addEventListener('input', onSearchInput)
      searchInput.addEventListener('keydown', onSearchKeydown)
      // Close hint when clicking elsewhere
      document.addEventListener('click', function (e) {
        if (searchHint && !searchInput.contains(e.target) && !searchHint.contains(e.target)) {
          hideSearchHint()
        }
      })
    }

    if (searchHintAskBtn) {
      searchHintAskBtn.addEventListener('click', function () {
        var q = searchInput ? searchInput.value.trim() : ''
        hideSearchHint()
        openPanel(q)
      })
    }
  })

  // ── Panel open / close ─────────────────────────────────────────────────────

  function openPanel(prefillQuery) {
    isOpen = true
    panel.removeAttribute('aria-hidden')
    panel.classList.add('is-open')
    launcher.setAttribute('aria-expanded', 'true')
    launcher.classList.add('is-open')

    if (prefillQuery && inputEl) {
      inputEl.value = prefillQuery
    }

    // Focus input after transition
    setTimeout(function () {
      inputEl && inputEl.focus()
      // Auto-send if prefilled from search
      if (prefillQuery && inputEl) handleSend()
    }, 80)
  }

  function closePanel() {
    isOpen = false
    panel.setAttribute('aria-hidden', 'true')
    panel.classList.remove('is-open')
    launcher.setAttribute('aria-expanded', 'false')
    launcher.classList.remove('is-open')
  }

  // ── Chat send / receive ───────────────────────────────────────────────────

  function handleSend() {
    if (isLoading || !inputEl) return
    var query = inputEl.value.trim()
    if (!query) return

    inputEl.value = ''
    appendMessage('user', query)
    conversationHistory.push({ role: 'user', text: query })
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2)
    }

    var thinkingEl = appendThinking()
    isLoading = true
    setSendState(true)

    fetchQuery(query)
      .then(function (data) {
        thinkingEl.remove()
        renderAssistantResponse(data)
        conversationHistory.push({ role: 'assistant', text: data.message })
      })
      .catch(function (err) {
        thinkingEl.remove()
        appendMessage('assistant', 'Sorry, something went wrong. Please try again.', true)
        console.error('AI assistant error:', err)
      })
      .finally(function () {
        isLoading = false
        setSendState(false)
        inputEl && inputEl.focus()
      })
  }

  function fetchQuery(query) {
    return fetch(RAG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return res.json()
    })
  }

  // ── Message rendering ─────────────────────────────────────────────────────

  function appendMessage(role, text, isError) {
    var wrap = document.createElement('div')
    wrap.className = 'ai-msg ai-msg--' + role + (isError ? ' ai-msg--error' : '')

    var bubble = document.createElement('div')
    bubble.className = 'ai-msg__bubble'
    bubble.textContent = text

    wrap.appendChild(bubble)
    messagesEl.appendChild(wrap)
    scrollToBottom()
    return wrap
  }

  function appendThinking() {
    var wrap = document.createElement('div')
    wrap.className = 'ai-msg ai-msg--assistant ai-msg--thinking'

    var bubble = document.createElement('div')
    bubble.className = 'ai-msg__bubble'
    bubble.innerHTML =
      '<span class="ai-thinking-dot"></span>' +
      '<span class="ai-thinking-dot"></span>' +
      '<span class="ai-thinking-dot"></span>'

    wrap.appendChild(bubble)
    messagesEl.appendChild(wrap)
    scrollToBottom()
    return wrap
  }

  function renderAssistantResponse(data) {
    var wrap = document.createElement('div')
    wrap.className = 'ai-msg ai-msg--assistant'

    var bubble = document.createElement('div')
    bubble.className = 'ai-msg__bubble'

    // Answer text
    if (data.message) {
      var answerEl = document.createElement('p')
      answerEl.className = 'ai-msg__answer'
      // Split Source: line off the answer text
      var parts = data.message.split(/\n\nSource:/i)
      answerEl.textContent = parts[0].trim()
      bubble.appendChild(answerEl)
    }

    // Source docs list
    if (data.results && data.results.length) {
      var sourcesEl = document.createElement('div')
      sourcesEl.className = 'ai-msg__sources'

      var label = document.createElement('p')
      label.className = 'ai-msg__sources-label'
      label.textContent = data.fallback ? 'Related docs' : 'Sources'
      sourcesEl.appendChild(label)

      data.results.forEach(function (r) {
        var link = document.createElement('a')
        link.className = 'ai-msg__source-link'
        link.href = r.source_url || '#'
        link.target = '_blank'
        link.rel = 'noopener noreferrer'

        var title = document.createElement('span')
        title.className = 'ai-msg__source-title'
        title.textContent = r.title

        var preview = document.createElement('span')
        preview.className = 'ai-msg__source-preview'
        preview.textContent = r.preview

        link.appendChild(title)
        link.appendChild(preview)
        sourcesEl.appendChild(link)
      })

      bubble.appendChild(sourcesEl)
    }

    wrap.appendChild(bubble)
    messagesEl.appendChild(wrap)
    scrollToBottom()
  }

  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function setSendState(loading) {
    if (!sendBtn) return
    sendBtn.disabled = loading
    sendBtn.classList.toggle('is-loading', loading)
  }

  // ── Search bar semantic hint ──────────────────────────────────────────────

  function onSearchInput(e) {
    clearTimeout(searchDebounceTimer)
    var q = e.target.value.trim()

    if (q.length < 3) {
      hideSearchHint()
      return
    }

    searchDebounceTimer = setTimeout(function () {
      fetchQuery(q)
        .then(function (data) {
          if (!data.results || !data.results.length) {
            hideSearchHint()
            return
          }
          renderSearchHint(data.results.slice(0, 3))
        })
        .catch(function () {
          hideSearchHint()
        })
    }, SEARCH_DEBOUNCE_MS)
  }

  function onSearchKeydown(e) {
    if (e.key === 'Enter') {
      // Let Lunr handle it — but also hide our hint
      hideSearchHint()
    }
    if (e.key === 'Escape') {
      hideSearchHint()
    }
  }

  function renderSearchHint(results) {
    if (!searchHint || !searchHintResults) return

    searchHintResults.innerHTML = ''

    results.forEach(function (r) {
      var item = document.createElement('a')
      item.className = 'search-hint-item'
      item.href = r.source_url || '#'

      var title = document.createElement('span')
      title.className = 'search-hint-item__title'
      title.textContent = r.title

      var preview = document.createElement('span')
      preview.className = 'search-hint-item__preview'
      preview.textContent = r.preview

      item.appendChild(title)
      item.appendChild(preview)
      searchHintResults.appendChild(item)
    })

    searchHint.hidden = false
  }

  function hideSearchHint() {
    if (searchHint) searchHint.hidden = true
    if (searchHintResults) searchHintResults.innerHTML = ''
  }
})()
