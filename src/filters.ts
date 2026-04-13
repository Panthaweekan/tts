/** Regex: must contain at least one alphanumeric or Thai character */
const HAS_READABLE_CHAR = /[a-zA-Z0-9ก-ฮ]/;

export interface MessageLimits {
  minLength: number;
  maxLength: number;
}

/**
 * Returns true if the message passes all validation rules.
 * @param text
 * @param messageType - tmi.js message-type tag value
 * @param limits
 */
export function isValidMessage(
  text: string,
  messageType: string | undefined,
  { minLength, maxLength }: MessageLimits
): boolean {
  if (messageType !== 'chat') return false;
  if (text.length < minLength || text.length > maxLength) return false;
  if (!HAS_READABLE_CHAR.test(text)) return false;
  return true;
}

/**
 * Returns true if the username is in the blacklist (case-insensitive).
 * @param username
 * @param blacklist
 */
export function isBlacklisted(username: string | undefined, blacklist: string[]): boolean {
  if (!username) return false;
  return blacklist.includes(username.toLowerCase());
}
