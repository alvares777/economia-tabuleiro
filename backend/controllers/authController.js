const pool   = require('../db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, tipo: user.tipo, nome: user.nome },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const result = await pool.query(
      'SELECT * FROM economia_usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas, tente novamente.' });
    }
    if (user.situacao !== 'A') {
      return res.status(403).json({ error: 'Seu usuário ainda não foi ativado. Contacte o administrador do jogo.' });
    }

    const userData = { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo, foto: user.foto };
    res.json({ token: signToken(user), user: userData });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hash = await bcrypt.hash(senha, 10);
    await pool.query(
      'INSERT INTO economia_usuarios (nome, email, senha, tipo, situacao) VALUES ($1,$2,$3,$4,$5)',
      [nome.trim(), email.toLowerCase().trim(), hash, 'C', 'I']
    );
    res.status(201).json({ ok: true, message: 'Conta criada! Aguarde ativação pelo administrador.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este email já está cadastrado.' });
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, tipo, situacao, foto FROM economia_usuarios WHERE id = $1',
      [req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/me
async function updateMe(req, res, next) {
  try {
    const { nome, email, senha, foto } = req.body;
    const updates = [];
    const params  = [];

    if (nome)               { updates.push(`nome = $${updates.length + 1}`);  params.push(nome.trim()); }
    if (email)              { updates.push(`email = $${updates.length + 1}`); params.push(email.toLowerCase().trim()); }
    if (foto !== undefined) { updates.push(`foto = $${updates.length + 1}`);  params.push(foto || null); }
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      updates.push(`senha = $${updates.length + 1}`);
      params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nada a atualizar' });
    params.push(req.user.userId);

    const result = await pool.query(
      `UPDATE economia_usuarios SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, nome, email, tipo, situacao, foto`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, getMe, updateMe };
