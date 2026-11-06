'use strict'

module.exports = (label, { data }) => {
  let href
  switch (label) {
    case 'Help':
      href = 'https://docs.kobiton.com'
      break
    case 'API':
      href = 'https://api.kobiton.com/v2/docs'
      break
    case 'Support':
      // Shown on every environment, standalone included.
      href = 'https://support.kobiton.com/hc/en-us/requests/new'
      break
    case 'Kobiton Status Page':
      // Only the shared public cloud widget build sets it.
      // Private-cloud and standalone builds leave it unset to hide the row.
      href = data.root.env.KOBITON_STATUS_PAGE_URL
      break
    default:
      href = ''
      break
  }
  
  return href 
    ? "<a class='reference-resource-text-item' href='" + href + "' target='_blank'>" + label +"</a>"
    : null
}
