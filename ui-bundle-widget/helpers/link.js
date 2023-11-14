'use strict'

module.exports = (context) => {
  if (context === 'Help') {
    const docsUrl = process.env.KOBITON_DOCS_V2_URL || 'https://docs.kobiton.com'
    return "<a class='reference-resource-text-item' href='" + docsUrl + "' target='_blank'>" + context +"</a>"
  }

  if (context === 'API') {
    const apiDocUrl = process.env.KOBITON_API_V2_DOCS_URL || 'https://api.kobiton.com/v2/docs'
    return "<a class='reference-resource-text-item' href='" + apiDocUrl + "' target='_blank'>" + context +"</a>"
  }
}
