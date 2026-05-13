-- ============================================================
-- MIGRAÇÃO: adiciona sistema de autenticação
-- Execute este script se o banco já foi criado antes dessa versão.
-- ============================================================

-- 1. Nova tabela de usuários
CREATE TABLE IF NOT EXISTS economia_usuarios (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  email     VARCHAR(150) NOT NULL UNIQUE,
  senha     VARCHAR(100) NOT NULL,
  tipo      CHAR(1) NOT NULL DEFAULT 'C',
  situacao  CHAR(1) NOT NULL DEFAULT 'I',
  foto      TEXT
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON economia_usuarios(email);

-- 2. Liga jogadores a usuários do sistema
ALTER TABLE economia_jogadores
  ADD COLUMN IF NOT EXISTS sys_user_id INTEGER REFERENCES economia_usuarios(id) ON DELETE SET NULL;
