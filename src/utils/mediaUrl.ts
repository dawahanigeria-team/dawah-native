const HTTP_URL_REGEX = /^https?:\/\//i

/**
 * Catalogue file names carry reserved characters ({S.A.W}, [], '). Native
 * players and iOS downloads reject or mangle them, so percent-encode remote
 * URLs. Escapes already in the URL (%20, and reserved ones like %26 that
 * decodeURI would leave alone) are kept as they are, not encoded twice.
 */
export const encodeMediaUrl = (uri: string): string => {
  if (!uri || !HTTP_URL_REGEX.test(uri)) {
    return uri
  }

  return encodeURI(uri)
    .replace(/%25([0-9A-Fa-f]{2})/g, '%$1')
    .replace(/'/g, '%27')
}
