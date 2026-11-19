const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const SCRYPT_KEY_LENGTH = 64;

function getEncryptionKey() {
  const value = process.env.CPF_ENCRYPTION_KEY || '';
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new Error('CPF_ENCRYPTION_KEY precisa conter exatamente 64 caracteres hexadecimais.');
  }
  return Buffer.from(value, 'hex');
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash).split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== '16384') return false;
  try {
    const salt = Buffer.from(parts[2], 'base64');
    const expected = Buffer.from(parts[3], 'base64');
    if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function encryptCpf(cpf) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()]);
  return { cpf_ciphertext: ciphertext.toString('hex'), cpf_iv: iv.toString('hex') };
}

function decryptCpf(ciphertext, iv) {
  if (!ciphertext || !iv) return '';
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    getEncryptionKey(),
    Buffer.from(iv, 'hex'),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { decryptCpf, encryptCpf, getEncryptionKey, hashPassword, verifyPassword };
