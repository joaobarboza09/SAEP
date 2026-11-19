require('dotenv').config();

const crypto = require('node:crypto');
const cors = require('cors');
const express = require('express');
const mysql = require('mysql2/promise');
const {
  decryptCpf,
  encryptCpf,
  getEncryptionKey,
  hashPassword,
  verifyPassword,
} = require('./src/security');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map();
const sessionCleanup = setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}, 60_000);
sessionCleanup.unref();
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saep_vet',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));

function bearerToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { user, expiresAt });
  return { token, expiresAt, user };
}

function sessionForRequest(req, res, next) {
  const token = bearerToken(req);
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.user = session.user;
  req.sessionToken = token;
  req.sessionExpiresAt = session.expiresAt;
  next();
}

function requireText(value, field, maxLength = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw Object.assign(new Error(`O campo ${field} é obrigatório e deve ter até ${maxLength} caracteres.`), {
      status: 400,
    });
  }
  return value.trim();
}

function optionalText(value, maxLength = 5000) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw Object.assign(new Error('Um dos campos de texto excede o limite permitido.'), { status: 400 });
  }
  return value.trim();
}

function normalizeCpf(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11) {
    throw Object.assign(new Error('CPF deve conter 11 dígitos.'), { status: 400 });
  }
  return cpf;
}

function normalizeDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    throw Object.assign(new Error('Informe uma data e hora válidas.'), { status: 400 });
  }
  const normalized = value.replace('T', ' ');
  const isoValue = normalized.replace(' ', 'T');
  const [year, month, day] = isoValue.slice(0, 10).split('-').map(Number);
  const [hour, minute, second = 0] = isoValue.slice(11).split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
      date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) {
    throw Object.assign(new Error('Informe uma data e hora válidas.'), { status: 400 });
  }
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

async function seedInitialData() {
  getEncryptionKey();
  const defaultPassword = process.env.SEED_USER_PASSWORD || 'Vet@12345';
  const initialUsers = [
    { nome: 'Ana Veterinária', email: 'ana@clinica.com' },
    { nome: 'Bruno Silva', email: 'bruno@clinica.com' },
    { nome: 'Carla Souza', email: 'carla@clinica.com' },
  ];
  for (const user of initialUsers) {
    const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [user.email]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
        [user.nome, user.email, await hashPassword(defaultPassword)],
      );
    }
  }

  const demoCpfs = ['00000000001', '00000000002', '00000000003'];
  for (let index = 0; index < demoCpfs.length; index += 1) {
    const [rows] = await pool.execute(
      'SELECT id, cpf_ciphertext, cpf_iv FROM tutores WHERE id = ?',
      [index + 1],
    );
    if (rows.length && (!rows[0].cpf_ciphertext || !rows[0].cpf_iv)) {
      const encrypted = encryptCpf(demoCpfs[index]);
      await pool.execute(
        'UPDATE tutores SET cpf_ciphertext = ?, cpf_iv = ? WHERE id = ?',
        [encrypted.cpf_ciphertext, encrypted.cpf_iv, index + 1],
      );
    }
  }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
    }
    const [rows] = await pool.execute(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ? LIMIT 1',
      [email],
    );
    if (!rows.length || !(await verifyPassword(password, rows[0].senha_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const { senha_hash, ...user } = rows[0];
    return res.json(createSession(user));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/refresh', sessionForRequest, (req, res) => {
  res.json({ expiresAt: req.sessionExpiresAt });
});

app.post('/api/auth/logout', (req, res) => {
  const token = bearerToken(req);
  sessions.delete(token);
  res.status(204).end();
});

app.use('/api', sessionForRequest);

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user, expiresAt: req.sessionExpiresAt });
});

app.get('/api/tutores', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, telefone, cpf_ciphertext, cpf_iv FROM tutores ORDER BY nome ASC',
    );
    const tutors = rows.map(({ cpf_ciphertext, cpf_iv, ...tutor }) => ({
      ...tutor,
      cpf: decryptCpf(cpf_ciphertext, cpf_iv),
    }));
    const term = String(req.query.busca || '').trim().toLocaleLowerCase('pt-BR');
    res.json(term ? tutors.filter((tutor) =>
      [tutor.nome, tutor.email, tutor.telefone, tutor.cpf]
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term)),
    ) : tutors);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tutores', async (req, res, next) => {
  try {
    const nome = requireText(req.body.nome, 'nome', 120);
    const email = requireText(req.body.email, 'e-mail', 180).toLowerCase();
    const telefone = requireText(req.body.telefone, 'telefone', 30);
    const encrypted = encryptCpf(normalizeCpf(req.body.cpf));
    const [result] = await pool.execute(
      'INSERT INTO tutores (nome, email, telefone, cpf_ciphertext, cpf_iv) VALUES (?, ?, ?, ?, ?)',
      [nome, email, telefone, encrypted.cpf_ciphertext, encrypted.cpf_iv],
    );
    res.status(201).json({ id: result.insertId, nome, email, telefone, cpf: normalizeCpf(req.body.cpf) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/tutores/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Tutor inválido.'), { status: 400 });
    const nome = requireText(req.body.nome, 'nome', 120);
    const email = requireText(req.body.email, 'e-mail', 180).toLowerCase();
    const telefone = requireText(req.body.telefone, 'telefone', 30);
    const [current] = await pool.execute('SELECT cpf_ciphertext, cpf_iv FROM tutores WHERE id = ?', [id]);
    if (!current.length) return res.status(404).json({ error: 'Tutor não encontrado.' });
    const cpf = req.body.cpf
      ? encryptCpf(normalizeCpf(req.body.cpf))
      : { cpf_ciphertext: current[0].cpf_ciphertext, cpf_iv: current[0].cpf_iv };
    await pool.execute(
      'UPDATE tutores SET nome = ?, email = ?, telefone = ?, cpf_ciphertext = ?, cpf_iv = ? WHERE id = ?',
      [nome, email, telefone, cpf.cpf_ciphertext, cpf.cpf_iv, id],
    );
    res.json({ id, nome, email, telefone, cpf: decryptCpf(cpf.cpf_ciphertext, cpf.cpf_iv) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pets', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.tutor_id, p.nome, p.especie, p.raca, p.data_nascimento, p.observacoes,
              t.nome AS tutor_nome
       FROM pets p JOIN tutores t ON t.id = p.tutor_id ORDER BY p.nome ASC`,
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pets', async (req, res, next) => {
  try {
    const tutorId = Number(req.body.tutor_id);
    if (!Number.isInteger(tutorId) || tutorId < 1) {
      throw Object.assign(new Error('Selecione um tutor válido.'), { status: 400 });
    }
    const nome = requireText(req.body.nome, 'nome', 100);
    const especie = requireText(req.body.especie, 'espécie', 60);
    const raca = optionalText(req.body.raca, 100) || '';
    const dataNascimento = req.body.data_nascimento || null;
    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      throw Object.assign(new Error('Data de nascimento inválida.'), { status: 400 });
    }
    const observacoes = optionalText(req.body.observacoes);
    const [result] = await pool.execute(
      'INSERT INTO pets (tutor_id, nome, especie, raca, data_nascimento, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      [tutorId, nome, especie, raca, dataNascimento, observacoes],
    );
    res.status(201).json({ id: result.insertId, tutor_id: tutorId, nome, especie, raca, data_nascimento: dataNascimento, observacoes });
  } catch (error) {
    next(error);
  }
});

app.get('/api/agendamentos', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT a.id, a.tutor_id, a.pet_id,
              DATE_FORMAT(a.data_agendamento, '%Y-%m-%dT%H:%i') AS data_agendamento,
              a.motivo, a.observacoes, t.nome AS tutor_nome, p.nome AS pet_nome
       FROM agendamentos a
       JOIN tutores t ON t.id = a.tutor_id
       JOIN pets p ON p.id = a.pet_id
       ORDER BY a.data_agendamento ASC`,
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/agendamentos', async (req, res, next) => {
  try {
    const tutorId = Number(req.body.tutor_id);
    const petId = Number(req.body.pet_id);
    if (!Number.isInteger(tutorId) || tutorId < 1 || !Number.isInteger(petId) || petId < 1) {
      throw Object.assign(new Error('Selecione um tutor e um pet válidos.'), { status: 400 });
    }
    const dataAgendamento = normalizeDateTime(req.body.data_agendamento);
    const motivo = requireText(req.body.motivo, 'motivo', 255);
    const observacoes = optionalText(req.body.observacoes);
    const [pets] = await pool.execute('SELECT id FROM pets WHERE id = ? AND tutor_id = ?', [petId, tutorId]);
    if (!pets.length) {
      throw Object.assign(new Error('O pet selecionado não pertence ao tutor informado.'), { status: 400 });
    }
    const [result] = await pool.execute(
      'INSERT INTO agendamentos (tutor_id, pet_id, data_agendamento, motivo, observacoes) VALUES (?, ?, ?, ?, ?)',
      [tutorId, petId, dataAgendamento, motivo, observacoes],
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

app.put('/api/agendamentos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw Object.assign(new Error('Agendamento inválido.'), { status: 400 });
    }
    const dataAgendamento = normalizeDateTime(req.body.data_agendamento);
    const [result] = await pool.execute(
      'UPDATE agendamentos SET data_agendamento = ? WHERE id = ?',
      [dataAgendamento, id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    res.json({ id, data_agendamento: dataAgendamento });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Já existe um registro com esses dados.' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'O tutor ou pet selecionado não existe.' });
  }
  console.error(error);
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'Erro interno do servidor.',
  });
});

async function start() {
  await seedInitialData();
  await pool.query('SELECT 1');
  app.listen(PORT, () => console.log(`API disponível em http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error('Não foi possível iniciar a API:', error);
  process.exitCode = 1;
});
