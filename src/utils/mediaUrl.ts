const HTTP_URL_REGEX = /^https?:\/\//i

/**
 * Catalogue file names carry reserved characters ({S.A.W}, [], '). Native
 * players and iOS downloads reject or mangle them, so percent-encode remote
 * URLs, decoding first so an already-encoded %20 is not encoded twice.
 */
export const encodeMediaUrl = (uri: string): string => {
  if (!uri || !HTTP_URL_REGEX.test(uri)) {
    return uri
  }

  const encode = (value: string) => encodeURI(value).replace(/'/g, '%27')

  try {
    return encode(decodeURI(uri))
  } catch {
    return encode(uri)
  }
}
