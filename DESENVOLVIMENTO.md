# Economia dos Milionários — Documento de Desenvolvimento

> Versão 1.0 — 2026-05-11  
> Reescrita do sistema Oracle PL/SQL para Node.js + PostgreSQL + Docker

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Como Subir o Ambiente](#4-como-subir-o-ambiente)
5. [Regras de Negócio](#5-regras-de-negócio)
6. [Schema do Banco de Dados](#6-schema-do-banco-de-dados)
7. [API REST](#7-api-rest)
8. [Frontend — Módulos JS](#8-frontend--módulos-js)
9. [Fluxo do Jogo](#9-fluxo-do-jogo)
10. [Tabuleiro — 64 Casas](#10-tabuleiro--64-casas)
11. [Verificação End-to-End](#11-verificação-end-to-end)
12. [Próximos Passos](#12-próximos-passos)

---

## 1. Visão Geral

**"Curso de Economia dos Milionários — COFAM S1"** é um jogo de tabuleiro educacional que ensina finanças pessoais para crianças. Os jogadores administram salário, poupança (cofrinhos), investimentos (ações), bens (celular, moto, carro, casa), dívidas e impostos ao longo de até 30 rodadas.

O sistema original foi desenvolvido em Oracle PL/SQL (APEX/HTP) com um único pacote de 170 KB que renderizava HTML + JS do lado do servidor. Esta reescrita:

- Separa backend (Node.js/Express + PostgreSQL) do frontend (Bootstrap 5 + jQuery/Vanilla JS)
- Usa JSON puro nas comunicações (substituindo strings delimitadas por `:` e `|`)
- Roda completamente em Docker no Windows

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express 4.x |
| Driver DB | node-postgres (pg) 8.x |
| Banco | PostgreSQL 15 Alpine |
| Frontend | Bootstrap 5.3 + Vanilla JS ES Modules |
| Admin DB | Adminer 4 |
| Infra | Docker Compose v3.9 |

**Sem ORM, sem TypeScript, sem bundler** — máxima simplicidade para manutenção didática.

---

## 3. Estrutura do Projeto

```
economia-milionarios/
├── docker-compose.yml          # Orquestração de containers
├── .env                        # Variáveis de ambiente (não comitar)
├── .env.example                # Template de configuração
├── .gitignore
├── DESENVOLVIMENTO.md          # Este documento
│
├── db/
│   └── init.sql                # DDL (5 tabelas) + seed (38 perguntas)
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js               # Express entry point
│   ├── db.js                   # pg.Pool singleton
│   ├── routes/
│   │   ├── games.js            # /api/games
│   │   └── questions.js        # /api/questions
│   ├── controllers/
│   │   ├── gamesController.js  # CRUD de partidas (transacional)
│   │   └── questionsController.js
│   └── middleware/
│       └── errorHandler.js
│
└── frontend/
    ├── index.html              # SPA do jogo
    ├── lista.html              # Lista de partidas salvas
    ├── css/estilos.css         # Estilos (tema escuro + grid tabuleiro)
    ├── js/
    │   ├── state.js            # Estado canônico + regras de negócio
    │   ├── api.js              # Fetch wrappers
    │   ├── board.js            # Tabuleiro: 64 casas, renderização, piões
    │   ├── ui.js               # Painéis, modais, indicadores
    │   └── main.js             # Entry point, auto-save, handlers
    ├── audio/                  # Arquivos .mp3 de som
    └── icons/                  # piao-1.png … piao-9.png, dados
```

---

## 4. Como Subir o Ambiente

### Pré-requisito
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando

### Comandos (PowerShell)

```powershell
# 1. Entrar na pasta do projeto
cd "c:\Users\alvar\OneDrive\APLICATIVOS\projetos\ECONOMIA\economia-milionarios"

# 2. Subir (primeira vez — faz build da imagem Node)
docker compose up --build

# 3. Acessar
# Jogo:    http://localhost:3000
# Adminer: http://localhost:8080
#   Sistema: PostgreSQL | Servidor: postgres | BD: economia | Usuário: economia_user

# 4. Parar
docker compose down

# 5. Recriar banco (apaga todos os dados)
docker compose down -v
docker compose up --build
```

### Credenciais padrão (`.env`)
```
POSTGRES_USER=economia_user
POSTGRES_PASSWORD=uss05777
POSTGRES_DB=economia
PORT=3000
```

---

## 5. Regras de Negócio

Todas implementadas em `frontend/js/state.js` (lado cliente, como no Oracle original).

### RN-01 — Salário por Jogada
```
salario_da_rodada = vl_salario + nr_rodada × vl_incremento
ganho_na_jogada   = salario_da_rodada × valor_dado
```

### RN-02 — Custo de Bens (por rodada, fim de turno)
```
custo[b] = vl_bem[b] × (pe_bem[b] / 100) × qtde_bem[jogador][b]
total_custos = Σ custo[b]   (b = 0..3)
```

### RN-03 — Juros sobre Dívidas (por rodada, fim de turno)
```
juros = vl_deve[jogador] × (pe_juros / 100)
```

### RN-04 — Dividendos de Ações (por rodada, fim de turno)
```
dividendo[a] = qtde_acoes[jogador][a] × (pe_acao[a] / 100) × vl_acao[a]
total_dividendos = Σ dividendo[a]   (a = 0..4)
```

### RN-05 — Rendimento dos Cofrinhos (juros compostos)
```
Cofrinhos 0, 1, 2 (Emergências, Sonhos, Aposentadoria):
  Primeiro aporte:  acumulado = valor × 2    ← DOBRA NA PRIMEIRA VEZ
  Aportes seguintes: acumulado = acumulado × (1 + rendimento/100) + valor
  rendimento = pe_rendimento (padrão 10%)

Cofrinho 3 (Doações):
  Não rende; serve apenas como dedução fiscal
```

### RN-06 — Cálculo de Impostos e Dedução
```
cofrinhos_acumulados = Σ calcCofrinho(p, c)   c = 0..2
valor_acoes          = Σ qtde[a] × vl_acao[a]
riqueza              = cofrinhos + dinheiro - divida + valor_acoes
imposto              = riqueza × (pe_impostos / 100)
deducao              = MIN(calcCofrinho(p, 3), imposto)
riqueza_liquida      = riqueza - imposto + deducao
```

### RN-07 — Ranking
```
Jogadores presentes ordenados por riqueza_liquida DESC
🥇 1º lugar   🥈 2º lugar   🥉 3º lugar
```

### RN-08 — Fim de Jogo
```
fim = (nr_rodada > qt_rodadas)
```

### RN-09 — Movimentação no Tabuleiro
```
Avançar: nova_posicao = (posicao + casas_a_mover) % 64
Voltar:  nova_posicao = (posicao - casas_a_mover + 64) % 64
Só $:    posição não muda; jogador recebe ganho_na_jogada
casas_a_mover = ROUND(salario_da_rodada × valor_dado)
```

### RN-10 — Auto-save
```
Ao trocar de jogador: POST /api/games com gameId atual
gameId salvo em localStorage como economia_last_game
Ao reabrir a página: carrega automaticamente o último jogo
```

---

## 6. Schema do Banco de Dados

### `economia_tabuleiro` — Sessão de jogo (1 linha por partida)

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| game_id | UUID PK | gen_random_uuid() | ID único da partida |
| user_id | INTEGER | 1 | ID do usuário |
| saved_at | TIMESTAMPTZ | NOW() | Última gravação |
| no_estado | VARCHAR(100) | NULL | Nome da partida |
| vl_salario | NUMERIC(12,2) | 4 | Salário base |
| nr_rodada | INTEGER | 1 | Rodada atual |
| nr_jogador | INTEGER | 1 | Jogador atual |
| qt_rodadas | INTEGER | 30 | Total de rodadas |
| qt_jogadores | INTEGER | 6 | Nº de jogadores |
| qt_tempo | INTEGER | 360 | Tempo máx (min) |
| vl_incremento | NUMERIC | 2 | Incremento/rodada |
| pe_juros | NUMERIC(5,2) | 10 | Juros % (dívidas) |
| pe_impostos | NUMERIC(5,2) | 30 | Impostos % |
| vl_bem1–4 | NUMERIC | 10/20/50/100 | Valor dos bens |
| pe_bem1–4 | NUMERIC(5,2) | 10 | Manutenção % |
| pe_acao1–5 | NUMERIC(5,2) | 0/0/0/20/20 | Dividendo % |
| vl_acao1–5 | NUMERIC | 5/20/5/15/15 | Preço da ação |
| nr_proximapergunta | INTEGER | 1 | Próx. pergunta (1-38) |
| ao_tipodado | SMALLINT | 0 | 0=Sorteio, 1=Desafio |
| ao_som | SMALLINT | 1 | 0=off, 1=on |
| pe_rendimento | NUMERIC(5,2) | 10 | Rendimento cofrinhos % |
| ao_ensina_acoes | CHAR(1) | 'N' | Exibir casas BOLSA |

### `economia_cofrinho` — Aportes por rodada
- `game_id` FK → CASCADE DELETE
- `jogador` (0-based), `cofrinho` (0–3), `rodada` (0-based), `valor`

### `economia_bens` — Bens possuídos
- `game_id` FK → CASCADE DELETE
- `jogador` (0-based), `bem` (0=Celular, 1=Moto, 2=Carro, 3=Casa), `qtde`

### `economia_acoes` — Carteira de ações
- `game_id` FK → CASCADE DELETE
- `jogador` (0-based), `acao` (0=Banco..4=Telecom), `qtde`, `vl_acao`

### `economia_jogadores` — Estado por jogador
- `game_id` FK → CASCADE DELETE
- `nr_jogador` (0-based), `no_jogador`, `vl_dinheiro`, `vl_deve`, `nr_posicao`, `ao_presente`

### `economia_perguntas` — 38 perguntas (seed fixo)
- `id` (1–38), `pergunta`, `resposta` (HTML)

---

## 7. API REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/games/:userId` | Lista partidas salvas |
| GET | `/api/games/:userId/:gameId` | Carrega partida completa |
| POST | `/api/games` | Salva/atualiza estado (transação) |
| DELETE | `/api/games/:userId/:gameId` | Exclui partida (CASCADE) |
| PATCH | `/api/games/:userId/:gameId/name` | Renomeia partida |
| GET | `/api/questions` | Retorna 38 perguntas |

### Payload de save — `POST /api/games`

```json
{
  "userId": 1,
  "gameId": "uuid-ou-null",
  "tabuleiro": {
    "salario": 4, "rodada": 5, "jogador": 2, "rodadas": 30,
    "qtJogadores": 4, "tempo": 360, "incremento": 2,
    "juros": 10, "taxaImpostos": 30, "rendimento": 10, "ensinaAcoes": "N",
    "valorBem": [10, 20, 50, 100], "despesaBem": [10, 10, 10, 10],
    "dividendos": [0, 0, 0, 20, 20], "valorAcao": [5, 20, 5, 15, 15],
    "proximaPergunta": 7, "tipoDado": 0, "emiteSom": 1
  },
  "cofrinhos": [{ "jogador": 0, "cofrinho": 0, "rodada": 2, "valor": 5 }],
  "bens":      [{ "jogador": 1, "bem": 2, "qtde": 1 }],
  "acoes":     [{ "jogador": 0, "acao": 3, "qtde": 2, "vlAcao": 15 }],
  "jogadores": [{ "nrJogador": 0, "noJogador": "Ana", "vlDinheiro": 120,
                  "vlDeve": 0, "nrPosicao": 12, "aoPresente": "S" }]
}
```

**Resposta:** `{ "ok": true, "gameId": "uuid" }`

---

## 8. Frontend — Módulos JS

| Arquivo | Responsabilidade |
|---------|-----------------|
| `state.js` | Estado canônico, regras RN-01 a RN-10, serializers/deserializers |
| `api.js` | Fetch wrappers tipados (saveGame, loadGame, listGames, etc.) |
| `board.js` | Array de 64 casas, renderização do grid, movimentação de piões |
| `ui.js` | Renderização dos painéis (cofrinhos, ações, bens, jogadores, resumo) |
| `main.js` | Inicialização, auto-save, handlers de dado e ações de jogo |

Todos usam `<script type="module">` — sem bundler necessário.

---

## 9. Fluxo do Jogo

```
1. Abrir http://localhost:3000
   → Se há partida salva em localStorage, carrega automaticamente
   → Senão, inicia nova partida com valores padrão

2. Menu ⚙️ Variáveis → configurar Nº de jogadores, rodadas, etc.
   → Salvar e fechar → tabuleiro renderizado com configuração nova

3. Menu 👥 Jogadores → nomear jogadores, marcar presentes/ausentes

4. TURNO DE CADA JOGADOR:
   a. Clicar num dado (1–6)
   b. Modal aparece: Avançar | Voltar | Só Dinheiro
   c. Caso Avançar/Voltar: pião se move; casa especial é processada
   d. Opcional: depositar em cofrinho, comprar/vender ações, comprar/vender bens
   e. Clicar "➡ Próximo" para passar ao próximo jogador
      → Cobrado: manutenção bens + juros dívida; Recebido: dividendos ações
      → Auto-save executado

5. Ao completar todos os jogadores: rodada incrementa
6. Após qt_rodadas rodadas: mensagem de fim de jogo + ranking final

7. Menu 💾 Salvar → salva manualmente
8. Menu 📂 Minhas Partidas → lista.html com todas as partidas
```

---

## 10. Tabuleiro — 64 Casas

| Idx | Casa | Efeito |
|-----|------|--------|
| 0 | INÍCIO | — |
| 1 | Começou Bem | +5 salários |
| 2–5 | ESTRELA | Bônus 5× salário |
| 6, 8, 12, 14, 17, 23, 25, 29, 44 | INQUEBRÁVEIS | Pergunta de desafio |
| 7 | Estude mais | -4 salários |
| 9 | COMPROU CELULAR | +20 salários |
| 10, 31, 35, 42, 54, 57 | EMERGÊNCIAS | Depositar em Cofrinho 0 |
| 15 | Pequeno erro | -3 salários |
| 16, 21, 28, 32, 41, 46–47, 49, 53, 55–56, 58 | BOLSA/ESTRELA | BOLSA (se ensinaAcoes=S) |
| 20 | Bons Investimentos | +8 salários |
| 22 | COMPROU CELULAR | — |
| 27 | Clima bom | +20 salários |
| 30 | CRISE MUNDIAL | -20 salários |
| 34 | COMPROU MOTO | — |
| 38 | Escolha ruim | -6 salários |
| 39, 45, 51 | SONHOS | Depositar em Cofrinho 1 |
| 40 | Guerra | -10 salários |
| 43 | COMPROU CARRO | — |
| 48 | COMPROU CASA | — |
| 52 | Pandemia | -12 salários |
| 59 | Nunca Desista | -11 salários |
| 60 | Joga de novo | — |
| 61 | Foi só um susto | -7 salários |
| 63 | Aposentadoria | Fim (mensagem) |

---

## 11. Verificação End-to-End

```
1.  docker compose up --build
2.  Abrir http://localhost:3000
3.  Clicar Menu → ⚙️ Variáveis → definir 2 jogadores, 3 rodadas → Salvar
4.  Clicar Menu → 👥 Jogadores → nomear "Alice" e "Bob"
5.  Clicar dado "3" → modal → Avançar → pião se move no tabuleiro
6.  Clicar Menu → 🐷 Cofrinhos → depositar R$ 5 no Cofrinho 0 → confirmar
7.  Clicar ➡ Próximo → turno do Bob
8.  Abrir Adminer (http://localhost:8080) → tabela economia_tabuleiro → deve ter 1 linha
9.  Fechar e reabrir http://localhost:3000 → partida deve ser restaurada automaticamente
10. Abrir http://localhost:3000/lista.html → partida deve aparecer na lista
11. Renomear partida → verificar atualização no Adminer
12. Clicar Excluir → linha deve sumir da lista e do Adminer (CASCADE confirma tabelas filhas)
13. GET http://localhost:3000/api/questions → deve retornar 38 perguntas
```

---

## 12. Próximos Passos

### Pendentes para versão 1.0
- [ ] **Ícones dos piões:** copiar `piao-1.png` a `piao-9.png` do sistema Oracle para `frontend/icons/`
- [ ] **Arquivos de som:** copiar `.mp3` originais para `frontend/audio/`
- [ ] **Autenticação:** adicionar login simples (userId dinâmico) — atualmente fixo em `userId=1`
- [ ] **Testes de integração:** verificar round-trip save/load com Jest + supertest

### Melhorias futuras (v2)
- Histórico de movimentos por rodada
- Modo online multijogador (WebSocket)
- Relatório financeiro final em PDF
- Modo professor: visualizar todas as partidas da turma
- Dashboard de progresso das crianças

---

*Desenvolvido por: COFAM — Curso de Economia dos Milionários*  
*Reescrita: Node.js + PostgreSQL + Docker — 2026-05-11*
