const pool = require('../db');

// GET /api/games  — lista partidas do usuário logado
async function listGames(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await pool.query(`
      SELECT game_id, saved_at, no_estado, qt_jogadores, nr_rodada, nr_jogador
      FROM economia_tabuleiro
      WHERE user_id = $1
      ORDER BY saved_at DESC
      LIMIT 50
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/games/:gameId
async function loadGame(req, res, next) {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const [tab, cof, ben, aco, jog, ext] = await Promise.all([
      pool.query('SELECT * FROM economia_tabuleiro WHERE game_id = $1 AND user_id = $2', [gameId, userId]),
      pool.query('SELECT jogador, cofrinho, rodada, valor FROM economia_cofrinho WHERE game_id = $1 ORDER BY jogador, cofrinho, rodada', [gameId]),
      pool.query('SELECT jogador, bem, qtde FROM economia_bens WHERE game_id = $1 ORDER BY jogador, bem', [gameId]),
      pool.query('SELECT jogador, acao, qtde, vl_acao FROM economia_acoes WHERE game_id = $1 ORDER BY jogador, acao', [gameId]),
      pool.query(`
        SELECT j.nr_jogador, j.no_jogador, j.vl_dinheiro, j.vl_deve,
               j.nr_posicao, j.ao_presente, j.sys_user_id, j.no_personagem, u.foto AS user_foto
        FROM economia_jogadores j
        LEFT JOIN economia_usuarios u ON j.sys_user_id = u.id
        WHERE j.game_id = $1
        ORDER BY j.nr_jogador
      `, [gameId]),
      pool.query(`
        SELECT jogador, rodada, seq, tipo, descricao, valor, dado_valor, pergunta_id, acertou,
               cofrinho_idx, bem_idx, acao_idx, salario_rodada, pe_juros, pe_rendimento,
               pe_impostos, vl_incremento, saldo_antes, saldo_depois, divida_antes, divida_depois
        FROM economia_extrato WHERE game_id = $1 ORDER BY seq
      `, [gameId]),
    ]);

    if (!tab.rows.length) return res.status(404).json({ error: 'Partida não encontrada' });

    res.json({
      tabuleiro: tab.rows[0],
      cofrinhos: cof.rows,
      bens:      ben.rows,
      acoes:     aco.rows,
      jogadores: jog.rows,
      extrato:   ext.rows,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/games
async function saveGame(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const { gameId, tabuleiro: t, cofrinhos, bens, acoes, jogadores, extrato } = req.body;

    const upsertTab = `
      INSERT INTO economia_tabuleiro (
        game_id, user_id, saved_at,
        vl_salario, nr_rodada, nr_jogador,
        qt_rodadas, qt_jogadores, qt_tempo, vl_incremento,
        pe_juros, pe_impostos,
        vl_bem1, vl_bem2, vl_bem3, vl_bem4,
        pe_bem1, pe_bem2, pe_bem3, pe_bem4,
        pe_acao1, pe_acao2, pe_acao3, pe_acao4, pe_acao5,
        vl_acao1, vl_acao2, vl_acao3, vl_acao4, vl_acao5,
        nr_proximapergunta, ao_tipodado, ao_som, pe_rendimento, ao_ensina_acoes,
        ao_casas_donos, ao_banco_uso, ao_bens_lucro, ao_casas_aluguel, ao_dividendos_acoes,
        ao_volumes_sons
      ) VALUES (
        COALESCE($1::uuid, gen_random_uuid()), $2, NOW(),
        $3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
        $30,$31,$32,$33,$34,$35,$36,$37,$38,$39,
        $40
      )
      ON CONFLICT (game_id) DO UPDATE SET
        saved_at           = NOW(),
        vl_salario         = EXCLUDED.vl_salario,
        nr_rodada          = EXCLUDED.nr_rodada,
        nr_jogador         = EXCLUDED.nr_jogador,
        qt_rodadas         = EXCLUDED.qt_rodadas,
        qt_jogadores       = EXCLUDED.qt_jogadores,
        qt_tempo           = EXCLUDED.qt_tempo,
        vl_incremento      = EXCLUDED.vl_incremento,
        pe_juros           = EXCLUDED.pe_juros,
        pe_impostos        = EXCLUDED.pe_impostos,
        vl_bem1 = EXCLUDED.vl_bem1, vl_bem2 = EXCLUDED.vl_bem2,
        vl_bem3 = EXCLUDED.vl_bem3, vl_bem4 = EXCLUDED.vl_bem4,
        pe_bem1 = EXCLUDED.pe_bem1, pe_bem2 = EXCLUDED.pe_bem2,
        pe_bem3 = EXCLUDED.pe_bem3, pe_bem4 = EXCLUDED.pe_bem4,
        pe_acao1 = EXCLUDED.pe_acao1, pe_acao2 = EXCLUDED.pe_acao2,
        pe_acao3 = EXCLUDED.pe_acao3, pe_acao4 = EXCLUDED.pe_acao4,
        pe_acao5 = EXCLUDED.pe_acao5,
        vl_acao1 = EXCLUDED.vl_acao1, vl_acao2 = EXCLUDED.vl_acao2,
        vl_acao3 = EXCLUDED.vl_acao3, vl_acao4 = EXCLUDED.vl_acao4,
        vl_acao5 = EXCLUDED.vl_acao5,
        nr_proximapergunta = EXCLUDED.nr_proximapergunta,
        ao_tipodado        = EXCLUDED.ao_tipodado,
        ao_som             = EXCLUDED.ao_som,
        pe_rendimento      = EXCLUDED.pe_rendimento,
        ao_ensina_acoes    = EXCLUDED.ao_ensina_acoes,
        ao_casas_donos     = EXCLUDED.ao_casas_donos,
        ao_banco_uso       = EXCLUDED.ao_banco_uso,
        ao_bens_lucro        = EXCLUDED.ao_bens_lucro,
        ao_casas_aluguel     = EXCLUDED.ao_casas_aluguel,
        ao_dividendos_acoes  = EXCLUDED.ao_dividendos_acoes,
        ao_volumes_sons      = EXCLUDED.ao_volumes_sons
      RETURNING game_id
    `;

    const tabResult = await client.query(upsertTab, [
      gameId || null, userId,
      t.salario, t.rodada, t.jogador,
      t.rodadas, t.qtJogadores, t.tempo, t.incremento,
      t.juros, t.taxaImpostos,
      t.valorBem[0],   t.valorBem[1],   t.valorBem[2],   t.valorBem[3],
      t.despesaBem[0], t.despesaBem[1], t.despesaBem[2], t.despesaBem[3],
      t.dividendos[0], t.dividendos[1], t.dividendos[2], t.dividendos[3], t.dividendos[4],
      t.valorAcao[0],  t.valorAcao[1],  t.valorAcao[2],  t.valorAcao[3],  t.valorAcao[4],
      t.proximaPergunta, t.tipoDado, t.emiteSom,
      t.rendimento || 10, t.ensinaAcoes || 'N',
      t.casasDonos         || null,
      t.bancoUso           || null,
      t.bensLucro          || null,
      t.casasAluguel       || null,
      t.dividendosPorAcao  || null,
      t.volumeSons         || null,
    ]);

    const newGameId = tabResult.rows[0].game_id;

    await client.query('DELETE FROM economia_cofrinho  WHERE game_id = $1', [newGameId]);
    await client.query('DELETE FROM economia_bens      WHERE game_id = $1', [newGameId]);
    await client.query('DELETE FROM economia_acoes     WHERE game_id = $1', [newGameId]);
    await client.query('DELETE FROM economia_jogadores WHERE game_id = $1', [newGameId]);
    await client.query('DELETE FROM economia_extrato   WHERE game_id = $1', [newGameId]);

    if (cofrinhos && cofrinhos.length > 0) {
      const placeholders = cofrinhos.map((_, i) =>
        `($1, $2, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5}, $${i * 4 + 6})`
      ).join(', ');
      const params = [newGameId, userId];
      cofrinhos.forEach(c => params.push(c.jogador, c.cofrinho, c.rodada, c.valor));
      await client.query(
        `INSERT INTO economia_cofrinho(game_id,user_id,jogador,cofrinho,rodada,valor) VALUES ${placeholders}`,
        params
      );
    }

    if (bens && bens.length > 0) {
      const placeholders = bens.map((_, i) =>
        `($1, $2, $${i * 3 + 3}, $${i * 3 + 4}, $${i * 3 + 5})`
      ).join(', ');
      const params = [newGameId, userId];
      bens.forEach(b => params.push(b.jogador, b.bem, b.qtde));
      await client.query(
        `INSERT INTO economia_bens(game_id,user_id,jogador,bem,qtde) VALUES ${placeholders}`,
        params
      );
    }

    if (acoes && acoes.length > 0) {
      const placeholders = acoes.map((_, i) =>
        `($1, $2, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5}, $${i * 4 + 6})`
      ).join(', ');
      const params = [newGameId, userId];
      acoes.forEach(a => params.push(a.jogador, a.acao, a.qtde, a.vlAcao));
      await client.query(
        `INSERT INTO economia_acoes(game_id,user_id,jogador,acao,qtde,vl_acao) VALUES ${placeholders}`,
        params
      );
    }

    if (jogadores && jogadores.length > 0) {
      const placeholders = jogadores.map((_, i) =>
        `($1, $2, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9}, $${i * 8 + 10})`
      ).join(', ');
      const params = [newGameId, userId];
      jogadores.forEach(j => params.push(
        j.nrJogador, j.noJogador, j.vlDinheiro, j.vlDeve,
        j.nrPosicao, j.aoPresente, j.sysUserId || null, j.noPersonagem || null
      ));
      await client.query(
        `INSERT INTO economia_jogadores(game_id,user_id,nr_jogador,no_jogador,vl_dinheiro,vl_deve,nr_posicao,ao_presente,sys_user_id,no_personagem)
         VALUES ${placeholders}`,
        params
      );
    }

    if (extrato && extrato.length > 0) {
      const COLS = 21;
      const BATCH = 200;
      for (let i = 0; i < extrato.length; i += BATCH) {
        const batch = extrato.slice(i, i + BATCH);
        const placeholders = batch.map((_, k) => {
          const base = k * COLS + 3;
          return `($1,$2,${Array.from({ length: COLS }, (__, j) => `$${base + j}`).join(',')})`;
        }).join(',');
        const params = [newGameId, userId];
        batch.forEach(e => params.push(
          e.jogador, e.rodada, e.seq, e.tipo, e.descricao ?? null,
          e.valor, e.dadoValor ?? null, e.perguntaId ?? null, e.acertou ?? null,
          e.cofrinhoIdx ?? null, e.bemIdx ?? null, e.acaoIdx ?? null,
          e.salarioRodada ?? null, e.peJuros ?? null, e.peRendimento ?? null,
          e.peImpostos ?? null, e.vlIncremento ?? null,
          e.saldoAntes ?? 0, e.saldoDepois ?? 0,
          e.dividaAntes ?? 0, e.dividaDepois ?? 0
        ));
        await client.query(
          `INSERT INTO economia_extrato(game_id,user_id,jogador,rodada,seq,tipo,descricao,valor,dado_valor,pergunta_id,acertou,cofrinho_idx,bem_idx,acao_idx,salario_rodada,pe_juros,pe_rendimento,pe_impostos,vl_incremento,saldo_antes,saldo_depois,divida_antes,divida_depois) VALUES ${placeholders}`,
          params
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, gameId: newGameId });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// DELETE /api/games/:gameId
async function deleteGame(req, res, next) {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;
    await pool.query('DELETE FROM economia_tabuleiro WHERE game_id = $1 AND user_id = $2', [gameId, userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/games/:gameId/name
async function renameGame(req, res, next) {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;
    const { name } = req.body;
    await pool.query(
      'UPDATE economia_tabuleiro SET no_estado = $1 WHERE game_id = $2 AND user_id = $3',
      [name, gameId, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listGames, loadGame, saveGame, deleteGame, renameGame };
