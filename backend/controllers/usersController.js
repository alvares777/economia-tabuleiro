const pool   = require('../db');
const bcrypt = require('bcryptjs');

// GET /api/users  (admin only)
async function listUsers(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, tipo, situacao, foto FROM economia_usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/active  (qualquer usuário logado — para selecionar jogadores)
async function listActiveUsers(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT id, nome, email, foto FROM economia_usuarios WHERE situacao = 'A' ORDER BY nome"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/users  (admin only — cria usuário já ativo por padrão)
async function createUser(req, res, next) {
  try {
    const { nome, email, senha, tipo, situacao } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    const hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO economia_usuarios (nome, email, senha, tipo, situacao) VALUES ($1,$2,$3,$4,$5) RETURNING id, nome, email, tipo, situacao',
      [nome.trim(), email.toLowerCase().trim(), hash, tipo || 'C', situacao || 'A']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este email já está cadastrado.' });
    next(err);
  }
}

// PUT /api/users/:id  (admin only)
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, email, senha, tipo, situacao, foto } = req.body;
    const updates = [];
    const params  = [];

    if (nome)              { updates.push(`nome = $${updates.length+1}`);     params.push(nome.trim()); }
    if (email)             { updates.push(`email = $${updates.length+1}`);    params.push(email.toLowerCase().trim()); }
    if (tipo)              { updates.push(`tipo = $${updates.length+1}`);     params.push(tipo); }
    if (situacao)          { updates.push(`situacao = $${updates.length+1}`); params.push(situacao); }
    if (foto !== undefined){ updates.push(`foto = $${updates.length+1}`);     params.push(foto || null); }
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      updates.push(`senha = $${updates.length+1}`);
      params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nada a atualizar' });
    params.push(id);

    const result = await pool.query(
      `UPDATE economia_usuarios SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, nome, email, tipo, situacao, foto`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este email já está cadastrado.' });
    next(err);
  }
}

// DELETE /api/users/:id  (admin only)
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
    }
    await pool.query('DELETE FROM economia_usuarios WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, listActiveUsers, createUser, updateUser, deleteUser };
