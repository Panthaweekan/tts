/** Regex: must contain at least one alphanumeric or Thai character */
const HAS_READABLE_CHAR = /[a-zA-Z0-9ก-ฮ]/;

/**
 * Returns true if the message passes all validation rules.
 * @param {string} text
 * @param {string} messageType - tmi.js message-type tag value
 * @param {{ minLength: number, maxLength: number }} limits
 */
export function isValidMessage(text, messageType, { minLength, maxLength }) {
  if (messageType !== 'chat') return false;
  if (text.length < minLength || text.length > maxLength) return false;
  if (!HAS_READABLE_CHAR.test(text)) return false;
  return true;
}

/**
 * Returns true if the username is in the blacklist (case-insensitive).
 * @param {string} username
 * @param {string[]} blacklist
 */
export function isBlacklisted(username, blacklist) {
  return blacklist.includes(username.toLowerCase());
}
