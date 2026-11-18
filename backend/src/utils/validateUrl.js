const MAX_LENGTH = 2048;

/**
 * Normalise and validate a user-supplied URL.
 * Mirrors the frontend rules: http(s) only, host must contain a dot (or be localhost),
 * and a missing scheme defaults to https://.
 * @returns {string|null} the normalised URL, or null when invalid.
 */
function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null;
  raw = raw.trim();
  if (!raw || raw.length > MAX_LENGTH || /\s/.test(raw)) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch {
    return null;
  }
}

module.exports = { normalizeUrl, MAX_LENGTH };
