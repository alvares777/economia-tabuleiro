require('dotenv').config();
const express = require('express');
const path = require('path');

const gamesRouter     = require('./routes/games');
const questionsRouter = require('./routes/questions');
const errorHandler    = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/games',     gamesRouter);
app.use('/api/questions', questionsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Economia dos Milionários rodando na porta ${PORT}`));
