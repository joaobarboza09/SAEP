const test = require('node:test');
const assert = require('node:assert/strict');
const { decryptCpf, encryptCpf, hashPassword, verifyPassword } = require('../src/security');

test('CPF é criptografado com IV aleatório e recuperado no backend', () => {
  process.env.CPF_ENCRYPTION_KEY = 'a'.repeat(64);
  const first = encryptCpf('00000000001');
  const second = encryptCpf('00000000001');

  assert.notEqual(first.cpf_iv, second.cpf_iv);
  assert.notEqual(first.cpf_ciphertext, second.cpf_ciphertext);
  assert.equal(decryptCpf(first.cpf_ciphertext, first.cpf_iv), '00000000001');
});

test('senha usa scrypt e só valida a senha correspondente', async () => {
  const hash = await hashPassword('senha-forte-de-teste');

  assert.match(hash, /^scrypt\$16384\$/);
  assert.equal(await verifyPassword('senha-forte-de-teste', hash), true);
  assert.equal(await verifyPassword('senha-errada', hash), false);
  assert.equal(await verifyPassword('qualquer', 'hash-invalido'), false);
});
