-- Migration: adiciona tabela de extrato (conta corrente por jogador)
-- Rodar uma vez em bancos existentes que já têm o schema base

CREATE TABLE IF NOT EXISTS economia_extrato (
  id             BIGSERIAL PRIMARY KEY,
  game_id        UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL DEFAULT 1,
  jogador        SMALLINT NOT NULL,
  rodada         SMALLINT NOT NULL,
  seq            INTEGER NOT NULL DEFAULT 0,
  tipo           VARCHAR(30) NOT NULL,
  descricao      TEXT,
  valor          NUMERIC(12,2) NOT NULL DEFAULT 0,
  dado_valor     SMALLINT,
  pergunta_id    SMALLINT,
  acertou        BOOLEAN,
  cofrinho_idx   SMALLINT,
  bem_idx        SMALLINT,
  acao_idx       SMALLINT,
  salario_rodada NUMERIC(12,2),
  pe_juros       NUMERIC(5,2),
  pe_rendimento  NUMERIC(5,2),
  pe_impostos    NUMERIC(5,2),
  vl_incremento  NUMERIC(12,2),
  saldo_antes    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_depois   NUMERIC(12,2) NOT NULL DEFAULT 0,
  divida_antes   NUMERIC(12,2) NOT NULL DEFAULT 0,
  divida_depois  NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_extrato_game ON economia_extrato(game_id, jogador, rodada);
