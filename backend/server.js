require('dotenv').config();
const express = require('express');
const path    = require('path');
const bcrypt  = require('bcryptjs');

const authRouter      = require('./routes/auth');
const usersRouter     = require('./routes/users');
const gamesRouter     = require('./routes/games');
const questionsRouter = require('./routes/questions');
const errorHandler    = require('./middleware/errorHandler');
const pool            = require('./db');

const app = express();

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',      authRouter);
app.use('/api/users',     usersRouter);
app.use('/api/games',     gamesRouter);
app.use('/api/questions', questionsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

async function seedAdmin() {
  try {
    const result = await pool.query(
      "SELECT id FROM economia_usuarios WHERE email = 'admin@economia.com.br'"
    );
    if (result.rows.length === 0) {
      const hash = await bcrypt.hash('economia@2026', 10);
      await pool.query(
        "INSERT INTO economia_usuarios (nome, email, senha, tipo, situacao) VALUES ($1,$2,$3,$4,$5)",
        ['Administrador', 'admin@economia.com.br', hash, 'A', 'A']
      );
      console.log('Admin padrão criado: admin@economia.com.br');
    }
  } catch (err) {
    console.error('Aviso: não foi possível verificar/criar admin:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Economia dos Milionários rodando na porta ${PORT}`);
  await seedAdmin();
});
