'use strict'

module.exports = (label) => {
  let href
  switch (label) {
    case 'Help':
      href = process.env.KOBITON_STANDALONE_DOCS_V2_URL || 'https://docs.kobiton.com'
      break
    case 'API':
      href = process.env.KOBITON_STANDALONE_API_V2_DOCS_URL || 'https://api.kobiton.com/v2/docs'
      break
    case 'Support':
      // Hide support items on the standalone and break new tickets to enhance on the next release (could be 4.9S)
      href = 'https://support.kobiton.com/hc/en-us/requests/new'
      break
    default:
      href = ''
      break
  }
  
  return href 
    ? "<a class='reference-resource-text-item' href='" + href + "' target='_blank'>" + label +"</a>"
    : null
}
