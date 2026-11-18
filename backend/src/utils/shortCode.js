const { randomInt } = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_PATTERN = /^[A-Za-z0-9]{4,32}$/;

/** Cryptographically random base62 code. */
function generateCode(length = 7) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

const isValidCode = (code) => CODE_PATTERN.test(code);

module.exports = { generateCode, isValidCode };
