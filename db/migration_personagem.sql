-- Adiciona coluna de personagem (emoji) por jogador
ALTER TABLE economia_jogadores
  ADD COLUMN IF NOT EXISTS no_personagem TEXT;
