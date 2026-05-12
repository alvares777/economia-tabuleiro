const pool = require('../db');

async function getQuestions(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, pergunta, resposta FROM economia_perguntas ORDER BY id'
    );
    res.json({ perguntas: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getQuestions };
