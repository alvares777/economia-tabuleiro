// board.js — tabuleiro de 64 casas em layout de perímetro (17×17 grid)

import { state, calcCofrinho, calcRanking } from './state.js';

const _fmtR = v => Math.round(v || 0).toLocaleString('pt-BR');

export const CASAS_FIXAS = [
  'INÍCIO',              // 0
  'Começou Bem +05',     // 1
  'ESTRELA',             // 2
  'ESTRELA',             // 3
  'ESTRELA',             // 4
  'ESTRELA',             // 5
  'INQUEBRÁVEIS',        // 6
  'Estude mais -04',     // 7
  'INQUEBRÁVEIS',        // 8
  'COMPROU CELULAR +20', // 9
  'EMERGÊNCIAS',         // 10
  'ESTRELA',             // 11
  'INQUEBRÁVEIS',        // 12
  'ESTRELA',             // 13
  'INQUEBRÁVEIS',        // 14
  'Pequeno erro -03',    // 15
  'BOLSA_OU_ESTRELA',    // 16
  'INQUEBRÁVEIS',        // 17
  'ESTRELA',             // 18
  'ESTRELA',             // 19
  'Bons Investimentos +08', // 20
  'BOLSA_OU_ESTRELA',    // 21
  'COMPROU CELULAR',     // 22
  'INQUEBRÁVEIS',        // 23
  'ESTRELA',             // 24
  'INQUEBRÁVEIS',        // 25
  'ESTRELA',             // 26
  'Clima bom +20',       // 27
  'BOLSA_OU_ESTRELA',    // 28
  'INQUEBRÁVEIS',        // 29
  'CRISE MUNDIAL -20',   // 30
  'EMERGÊNCIAS',         // 31
  'BOLSA_OU_ESTRELA',    // 32
  'ESTRELA',             // 33
  'COMPROU MOTO',        // 34
  'EMERGÊNCIAS',         // 35
  'ESTRELA',             // 36
  'ESTRELA',             // 37
  'Escolha ruim -06',    // 38
  'SONHOS',              // 39
  'Guerra -10',          // 40
  'BOLSA_OU_ESTRELA',    // 41
  'EMERGÊNCIAS',         // 42
  'COMPROU CARRO',       // 43
  'INQUEBRÁVEIS',        // 44
  'SONHOS',              // 45
  'BOLSA_OU_ESTRELA',    // 46
  'BOLSA_OU_ESTRELA',    // 47
  'COMPROU CASA',        // 48
  'BOLSA_OU_ESTRELA',    // 49
  'ESTRELA',             // 50
  'SONHOS',              // 51
  'Pandemia -12',        // 52
  'BOLSA_OU_ESTRELA',    // 53
  'EMERGÊNCIAS',         // 54
  'BOLSA_OU_ESTRELA',    // 55
  'BOLSA_OU_ESTRELA',    // 56
  'EMERGÊNCIAS',         // 57
  'BOLSA_OU_ESTRELA',    // 58
  'Nunca Desista -11',   // 59
  'Joga de novo',        // 60
  'Foi só um susto -07', // 61
  'Tá quase',            // 62
  'Aposentadoria! Viva de Renda :)', // 63
];

export const CASAS_BONUS = [
   0,  5, 0, 0,   0, 0,  0, -4,  0, 20,   0, 0,  0, 0,  0, -3,
   0,  0, 0, 0,   8, 0,  0,  0,  0,  0,   0,20,  0, 0,-20,  0,
   0,  0, 0, 0,   0, 0, -6,  0,-10,  0,   0, 0,  0, 0,  0,  0,
   0,  0, 0, 0, -12, 0,  0,  0,  0,  0,   0,-11, 0,-7,  0,  0,
];

// Cores por índice de jogador (até 9)
const COR_JOGADOR = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e91e63', '#ff5722', '#607d8b',
];

export function getNomeCasa(idx) {
  const base = CASAS_FIXAS[idx] || '';
  if (base === 'BOLSA_OU_ESTRELA') return state.ensinaAcoes === 'S' ? 'BOLSA' : 'ESTRELA';
  return base;
}

export function getClasseCasa(idx) {
  const nome = getNomeCasa(idx);
  if (nome === 'ESTRELA')        return 'casa-estrela';
  if (nome === 'BOLSA')          return 'casa-bolsa';
  if (nome === 'EMERGÊNCIAS')    return 'casa-emergencias';
  if (nome === 'SONHOS')         return 'casa-sonhos';
  if (nome === 'INQUEBRÁVEIS')   return 'casa-inquebravelis';
  if (nome.startsWith('COMPROU')) return 'casa-compra';
  if (nome === 'INÍCIO')         return 'casa-inicio';
  if (CASAS_BONUS[idx] > 0)     return 'casa-bonus';
  if (CASAS_BONUS[idx] < 0)     return 'casa-penalidade';
  return 'casa-neutra';
}

function getIconeCasa(idx) {
  const nome = getNomeCasa(idx);
  if (nome === 'INÍCIO')          return '🏁';
  if (nome === 'ESTRELA')         return '⭐';
  if (nome === 'BOLSA')           return '📈';
  if (nome === 'EMERGÊNCIAS')     return '🚨';
  if (nome === 'SONHOS')          return '💭';
  if (nome === 'INQUEBRÁVEIS')    return '💪';
  if (nome.startsWith('COMPROU')) return '🛒';
  if (CASAS_BONUS[idx] > 0)      return '💰';
  if (CASAS_BONUS[idx] < 0)      return '📉';
  return '▪';
}

// Posição no grid 17×17 para cada casa no perímetro
// Bottom  (row 17): pos  0–16  → cols  1–17
// Right   (col 17): pos 17–32  → rows 16–1
// Top     (row  1): pos 33–48  → cols 16–1
// Left    (col  1): pos 49–63  → rows  2–16
function getGridPos(pos) {
  if (pos <= 16)  return { row: 17,            col: pos + 1 };
  if (pos <= 32)  return { row: 17 - (pos-16), col: 17 };
  if (pos <= 48)  return { row: 1,             col: 17 - (pos-32) };
  return               { row: 2  + (pos-49),  col: 1 };
}

function renderPioesNaCasa(pos) {
  let html = '<div class="casa-pioes">';
  for (let p = 0; p < state.qtJogadores; p++) {
    if (state.jogadoresPresentes[p] === 'S' && state.jogadoresPosicao[p] === pos) {
      const ativo = (p === state.jogador - 1) ? 'piao-ativo' : '';
      const cor   = COR_JOGADOR[p] || '#aaa';
      html += `<div class="piao ${ativo}" style="background:${cor}" data-jogador="${p}" title="${state.jogadores[p]}">${p+1}</div>`;
    }
  }
  html += '</div>';
  return html;
}

function _atualizarDestaquesJogadores() {
  document.querySelectorAll('.casa-com-jogador, .casa-jogador-ativo').forEach(el => {
    el.classList.remove('casa-com-jogador', 'casa-jogador-ativo');
  });
  for (let p = 0; p < state.qtJogadores; p++) {
    if (state.jogadoresPresentes[p] !== 'S') continue;
    const casaEl = document.querySelector(`.pos${state.jogadoresPosicao[p]}`);
    if (!casaEl) continue;
    casaEl.classList.add('casa-com-jogador');
    if (p === state.jogador - 1) casaEl.classList.add('casa-jogador-ativo');
  }
}

function buildCentro() {
  return `
    <div class="tabuleiro-centro" style="grid-row:2/17;grid-column:2/17">
      <div class="centro-logo">💰</div>
      <div class="centro-titulo">Economia<br>dos Milionários</div>
      <div class="centro-dado" id="dadoCentro">🎲</div>
      <div class="centro-player"   id="centroPlayer">—</div>
      <div class="centro-ranking"  id="centroRanking">—</div>
      <div class="centro-cofrinhos" id="centroCofrinhos">—</div>
      <div class="centro-legenda">
        <span>⭐ Estrela</span>
        <span>🚨 Emergências</span>
        <span>💪 Inquebráveis</span>
        <span>💭 Sonhos</span>
        <span>📈 Bolsa</span>
        <span>🛒 Compra</span>
        <span>💰 Bônus</span>
        <span>📉 Penalidade</span>
      </div>
    </div>`;
}

function _atualizarCentro() {
  const playerEl = document.getElementById('centroPlayer');
  const rankEl   = document.getElementById('centroRanking');
  const cofEl    = document.getElementById('centroCofrinhos');
  if (!playerEl || !state.jogadores) return;

  const p   = state.jogador - 1;
  const cor = COR_JOGADOR[p] || '#aaa';
  const nome = state.jogadores[p] || `Jogador ${state.jogador}`;
  playerEl.innerHTML = `<span style="color:${cor}">●</span> ${nome} · R${state.rodada}/${state.rodadas}`;

  if (rankEl) {
    try {
      const ranking = calcRanking();
      const pos = ranking.indexOf(p) + 1;
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}°`;
      rankEl.textContent = `Ranking: ${medal}`;
    } catch { rankEl.textContent = ''; }
  }

  if (cofEl) {
    try {
      const ICONS  = ['🚨', '💭', '🏦', '🎁'];
      const LABELS = ['Emerg.', 'Sonhos', 'Aposen.', 'Doações'];
      const linhas = [0, 1, 2, 3].map(c =>
        `${ICONS[c]} ${LABELS[c]}: R$${_fmtR(calcCofrinho(p, c))}`
      );
      cofEl.innerHTML = linhas.join('<br>');
    } catch { cofEl.textContent = ''; }
  }
}

export function renderTabuleiro() {
  const container = document.getElementById('divTabuleiro');
  if (!container) return;

  let html = `<div class="tabuleiro-wrapper"><div class="tabuleiro-frame"><div class="tabuleiro-grid">`;

  for (let i = 0; i <= 63; i++) {
    const { row, col } = getGridPos(i);
    const nome   = getNomeCasa(i);
    const classe = getClasseCasa(i);
    const icone  = getIconeCasa(i);
    const bonus  = CASAS_BONUS[i] !== 0
      ? `<span class="casa-bonus-tag">${CASAS_BONUS[i] > 0 ? '+' : ''}${CASAS_BONUS[i]}</span>`
      : '';

    // Label curto para exibição na casa
    let label = nome.replace('COMPROU ', '').replace('BOLSA_OU_ESTRELA', 'ESTRELA');
    if (label.length > 14) label = label.substring(0, 13) + '…';

    const pioes = renderPioesNaCasa(i);

    html += `
      <div class="casa ${classe} pos${i}" data-pos="${i}"
           style="grid-row:${row};grid-column:${col}"
           title="#${i} — ${nome}">
        <div class="casa-conteudo">
          <div class="casa-num">${i}</div>
          <div class="casa-icone">${icone}</div>
          <div class="casa-nome">${label}${bonus}</div>
          ${pioes}
        </div>
      </div>`;
  }

  html += buildCentro();
  html += `</div></div></div>`;
  container.innerHTML = html;
  _atualizarCentro();
  _atualizarDestaquesJogadores();
}

// movingPlayer: índice do jogador em movimento (recebe classe piao-movendo para animar o salto)
export function atualizarPosicoes(movingPlayer = -1) {
  // Limpa destaques de células anteriores
  document.querySelectorAll('.casa-com-jogador, .casa-jogador-ativo').forEach(el => {
    el.classList.remove('casa-com-jogador', 'casa-jogador-ativo');
  });

  document.querySelectorAll('.casa-pioes').forEach(el => { el.innerHTML = ''; });

  for (let p = 0; p < state.qtJogadores; p++) {
    if (state.jogadoresPresentes[p] !== 'S') continue;
    const pos    = state.jogadoresPosicao[p];
    const casaEl = document.querySelector(`.pos${pos}`);
    const el     = casaEl?.querySelector('.casa-pioes');
    if (!el) continue;

    // Destaca a célula
    casaEl.classList.add('casa-com-jogador');
    if (p === state.jogador - 1) casaEl.classList.add('casa-jogador-ativo');

    const ativo  = (p === state.jogador - 1) ? 'piao-ativo' : '';
    const bounce = (p === movingPlayer) ? ' piao-movendo' : '';
    const cor    = COR_JOGADOR[p] || '#aaa';
    const div    = document.createElement('div');
    div.className    = `piao ${ativo}${bounce}`;
    div.style.background = cor;
    div.title        = state.jogadores[p];
    div.textContent  = String(p + 1);
    div.dataset.jogador = String(p);
    el.appendChild(div);
  }
  _atualizarCentro();
}
