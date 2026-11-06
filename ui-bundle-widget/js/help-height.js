;(function () {
  'use strict'

  // Tells the portal Help popover how tall the Reference Resources rows are,
  // so the popover fits them.
  //
  // E.g. 4 rows on the shared cloud, but fewer on private clouds and standalone.
  // The portal keeps its default size when no message arrives.
  var MESSAGE_TYPE = 'kobiton-help-widget:height'

  if (window.parent === window) return

  var wrapper = document.querySelector('.reference-resource-wrapper')
  if (!wrapper) return

  var lastPosted = 0

  function postHeight () {
    var items = wrapper.querySelectorAll('.reference-resource-item')
    var last = items[items.length - 1]
    if (!last) return

    // 0 while the popover is display: none (no layout yet)
    var height = Math.ceil(last.getBoundingClientRect().bottom + window.scrollY)
    if (height <= 0 || height === lastPosted) return

    lastPosted = height
    // The payload is only a number, so any parent origin may read it
    window.parent.postMessage({type: MESSAGE_TYPE, height: height}, '*')
  }

  // The iframe loads while the popover is hidden, so measure again when its viewport appears or changes.
  window.addEventListener('load', postHeight)
  window.addEventListener('resize', postHeight)
  if (window.ResizeObserver) {
    new window.ResizeObserver(postHeight).observe(document.documentElement)
  }
  postHeight()
})()
