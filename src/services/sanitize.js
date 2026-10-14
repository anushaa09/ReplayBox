const SECRET_KEY = /(authorization|cookie|password|passwd|token|secret|api[_-]?key|cvv|cvc|pin|card[_-]?number|account[_-]?number)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
function luhnValid(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (doubleDigit) { n *= 2; if (n > 9) n -= 9; }
    sum += n; doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}
function redactString(value) {
  return String(value).replace(EMAIL, '[REDACTED_EMAIL]').replace(/\b(?:\d[ -]*?){13,19}\b/g, match => luhnValid(match) ? '[REDACTED_CARD]' : match);
}
function sanitize(value, key = '') {
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(item => sanitize(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, k)]));
  return value;
}
function sanitizeHeaders(headers = {}) {
  const output = {};
  for (const [key, value] of Object.entries(headers)) {
    if (/^(authorization|cookie|set-cookie|proxy-authorization|x-api-key)$/i.test(key)) output[key.toLowerCase()] = '[REDACTED]';
    else output[key.toLowerCase()] = sanitize(value, key);
  }
  return output;
}
module.exports = { sanitize, sanitizeHeaders };
