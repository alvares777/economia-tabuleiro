-- Adiciona coluna para persistência dos donos das casas de bônus
ALTER TABLE economia_tabuleiro
  ADD COLUMN IF NOT EXISTS ao_casas_donos TEXT;
