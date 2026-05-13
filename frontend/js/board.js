// board.js — tabuleiro de 64 casas em layout de perímetro (17×17 grid)

import { state, calcCofrinho, calcRanking } from './state.js';

const _fmtR = v => Math.round(v || 0).toLocaleString('pt-BR');

export const CASAS_FIXAS = [
  'INÍCIO',              // 0
  'Uhu',     // 1
  'EST',             // 2
  'EST',             // 3
  'EST',             // 4
  'BOLSA_OU_EST',             // 5
  'N.QUEBRE',        // 6
  'Estude',     // 7
  'N.QUEBRE',        // 8
  '$ CEL', // 9
  'EMERG',         // 10
  'EST',             // 11
  'N.QUEBRE',        // 12
  'EST',             // 13
  'N.QUEBRE',        // 14
  'Erro',    // 15
  'BOLSA_OU_EST',    // 16
  'N.QUEBRE',        // 17
  'EST',             // 18
  'EST',             // 19
  'Bons Invest', // 20
  'BOLSA_OU_EST',    // 21
  '$ CEL',     // 22
  'N.QUEBRE',        // 23
  'EST',             // 24
  'N.QUEBRE',        // 25
  'EST',             // 26
  'Clima bom',       // 27
  'BOLSA_OU_EST',    // 28
  'N.QUEBRE',        // 29
  'CRISE',   // 30
  'EMERG',         // 31
  'BOLSA_OU_EST',    // 32
  'EST',             // 33
  '$ MOTO',        // 34
  'EMERG',         // 35
  'EST',             // 36
  'EST',             // 37
  'Esc ruim',    // 38
  'SONHOS',              // 39
  'Guerra',          // 40
  'BOLSA_OU_EST',    // 41
  'EMERG',         // 42
  '$ CAR',       // 43
  'N.QUEBRE',        // 44
  'SONHOS',              // 45
  'BOLSA_OU_EST',    // 46
  'BOLSA_OU_EST',    // 47
  '$ CASA',        // 48
  'BOLSA_OU_EST',    // 49
  'EST',             // 50
  'SONHOS',              // 51
  'Pandemia',        // 52
  'BOLSA_OU_EST',    // 53
  'EMERG',         // 54
  'BOLSA_OU_EST',    // 55
  'BOLSA_OU_EST',    // 56
  'EMERG',         // 57
  'BOLSA_OU_EST',    // 58
  'Nunca Desista',   // 59
  'Joga de novo',        // 60
  'Que susto', // 61
  'Tá quase',            // 62
  'Viva de Renda :)', // 63
];

export const CASAS_BONUS = [
   0,  5, 0, 0,   0, 0,  0, -4,  0, 0,   0, 0,  0, 0,  0, -3,
   0,  0, 0, 0,   8, 0,  0,  0,  0,  0,   0,20,  0, 0,-20,  0,
   0,  0, 0, 0,   0, 0, -6,  0,-10,  0,   0, 0,  0, 0,  0,  0,
   0,  0, 0, 0, -12, 0,  0,  0,  0,  0,   0,-11, 0,-7,  0,  0,
];

// Legendas das casas — usadas no centro do tabuleiro e nos titles das casas
export const LEGENDA_CASAS = [
  {
    id: 'estrela',
    icone: '⭐', nome: 'Estrela',
    descricao: 'Casa de Bônus! Acerte a pergunta e receba Salário × 3 (multiplicador fixo). ' +
               'Se "Bolsa de Valores estiver desligado, as casas Bolsa também funcionam como Estrela.',
    match: (n, b) => n === 'BOLSA_OU_EST' || (b === 0 && n === 'EST'),
  },
  {
    id: 'emerg',
    icone: '🚨', nome: 'EMERG',
    descricao: 'Emergência! Ao pousar aqui você pode sacar dinheiro do seu ' +
               'Cofrinho de Emergências para usar no jogo. Saldo negativo ' +
               'também permite sacar de qualquer cofrinho.',
    match: (n) => n === 'EMERG',
  },
  {
    id: 'nquebre',
    icone: '💪', nome: 'N.QUEBRE',
    descricao: 'Inquebráveis! Você deve depositar pelo menos 70% do seu saldo ' +
               'atual nos Cofrinhos antes de passar a vez. Caso não cumpra, ' +
               'o operador não conseguirá avançar o jogador.',
    match: (n) => n === 'N.QUEBRE',
  },
  {
    id: 'sonhos',
    icone: '💭', nome: 'Sonhos',
    descricao: 'Realize um sonho! Ao pousar aqui você pode sacar dinheiro do ' +
               'seu Cofrinho de Sonhos e usar como quiser no jogo.',
    match: (n) => n === 'SONHOS',
  },
  {
    id: 'bolsa',
    icone: '📈', nome: 'Bolsa',
    descricao: 'Bolsa de Valores! Com "Bolsa de Valores" ativo, jogue o dado especial: ' +
               '🟢 VERDE = compra obrigatória · 🔴 VERMELHO = venda obrigatória (se tiver) · ⚪ BRANCO = livre escolha. ' +
               'Com "Bolsa de Valores" inativo, funciona como Estrela (Salário × 3 ao acertar).',
    match: (n) => n === 'BOLSA_OU_EST',
  },
  {
    id: 'compra',
    icone: '🛒', nome: 'Compra ($)',
    descricao: 'Compra obrigatória de bem! Ao pousar aqui você paga o valor do ' +
               'bem indicado (Celular, Moto, Carro ou Casa). O saldo pode ' +
               'ficar negativo — saque de um cofrinho se precisar.',
    match: (n) => n.startsWith('$'),
  },
  {
    id: 'bonus',
    icone: '💰', nome: 'Bônus',
    descricao: 'Bônus em dinheiro! O valor (positivo) está indicado no canto ' +
               'da casa. É creditado automaticamente ao pousar.',
    match: (n, b) => b > 0,
  },
  {
    id: 'penalidade',
    icone: '📉', nome: 'Penalidade',
    descricao: 'Penalidade! O valor (negativo) está indicado no canto da casa ' +
               'e é debitado automaticamente ao pousar. O saldo pode ficar negativo.',
    match: (n, b) => b < 0,
  },
];

function _descricaoCasa(nomeFixo, bonus) {
  const entry = LEGENDA_CASAS.find(l => l.match(nomeFixo, bonus));
  return entry ? entry.descricao : '';
}

// Cores por índice de jogador (até 9)
export const COR_JOGADOR = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e91e63', '#ff5722', '#607d8b',
];

export function getNomeCasa(idx) {
  const base = CASAS_FIXAS[idx] || '';
  if (base === 'BOLSA_OU_EST') return state.ensinaAcoes === 'S' ? 'BOLSA' : 'EST';
  return base;
}

export function getClasseCasa(idx) {
  const nome = getNomeCasa(idx);
  if (nome === 'EST')        return 'casa-estrela';
  if (nome === 'BOLSA')          return 'casa-bolsa';
  if (nome === 'EMERG')    return 'casa-emergencias';
  if (nome === 'SONHOS')         return 'casa-sonhos';
  if (nome === 'N.QUEBRE')   return 'casa-inquebravelis';
  if (nome.startsWith('COMPROU')) return 'casa-compra';
  if (nome === 'INÍCIO')         return 'casa-inicio';
  if (CASAS_BONUS[idx] > 0)     return 'casa-bonus';
  if (CASAS_BONUS[idx] < 0)     return 'casa-penalidade';
  return 'casa-neutra';
}

function getIconeCasa(idx) {
  const nome = getNomeCasa(idx);
  if (nome === 'INÍCIO')          return '🏁';
  if (nome === 'EST')         return '⭐';
  if (nome === 'BOLSA')           return '📈';
  if (nome === 'EMERG')     return '🚨';
  if (nome === 'SONHOS')          return '💭';
  if (nome === 'N.QUEBRE')    return '💪';
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
      const ativo      = (p === state.jogador - 1) ? 'piao-ativo' : '';
      const foto       = state.jogadoresFotos?.[p];
      const personagem = state.jogadoresPersonagem?.[p];
      if (foto) {
        html += `<div class="piao ${ativo}" data-jogador="${p}" title="${state.jogadores[p]}" style="padding:0;overflow:hidden;">` +
          `<img src="${foto}" alt="${p+1}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>`;
      } else if (personagem) {
        if (personagem.includes('/')) {
          html += `<div class="piao ${ativo}" data-jogador="${p}" title="${state.jogadores[p]}" style="padding:0;overflow:hidden;">` +
            `<img src="${personagem}" alt="${p+1}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>`;
        } else {
          html += `<div class="piao ${ativo}" data-jogador="${p}" title="${state.jogadores[p]}" style="background:transparent;font-size:1.1em;line-height:1;">${personagem}</div>`;
        }
      } else {
        const cor = COR_JOGADOR[p] || '#aaa';
        html += `<div class="piao ${ativo}" style="background:${cor}" data-jogador="${p}" title="${state.jogadores[p]}">${p+1}</div>`;
      }
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
      <div class="centro-ativos">
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Cofrinhos</div>
          <div class="centro-cofrinhos" id="centroCofrinhos">—</div>
        </div>
        <div class="centro-ativos-sep"></div>
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Bens</div>
          <div class="centro-bens" id="centroBens">—</div>
        </div>
        <div class="centro-ativos-sep"></div>
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Ações</div>
          <div class="centro-acoes" id="centroAcoes">—</div>
        </div>
      </div>
      <div class="centro-legenda">
        ${LEGENDA_CASAS.map(l =>
          `<button class="legenda-item" onclick="window._abrirLegenda('${l.id}')">${l.icone} ${l.nome}</button>`
        ).join('')}
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

  const acEl = document.getElementById('centroAcoes');
  if (acEl) {
    try {
      const ICONS_AC = ['🏦', '⚡', '🛡️', '💧', '📡'];
      const acoes = (state.jogadoresAcoes[p] || []);
      const comAcao = ICONS_AC.map((ic, a) => ({ ic, a, qty: acoes[a] || 0 }))
        .filter(({ qty }) => qty > 0);
      acEl.innerHTML = comAcao.length
        ? comAcao.map(({ ic, a, qty }) =>
            `${ic} ${state.nomesAcoes[a]}: ${qty}×`).join('<br>')
        : '<span style="opacity:.5">Sem ações</span>';
    } catch { acEl.textContent = ''; }
  }

  const bEl = document.getElementById('centroBens');
  if (bEl) {
    try {
      const ICONS_B = ['📱', '🏍️', '🚗', '🏠'];
      const bens = (state.jogadoresBens[p] || []);
      const comBem = ICONS_B.map((ic, b) => ({ ic, b, qty: bens[b] || 0 }))
        .filter(({ qty }) => qty > 0);
      bEl.innerHTML = comBem.length
        ? comBem.map(({ ic, b, qty }) =>
            `${ic} ${state.nomesBens[b]}: ${qty}×`).join('<br>')
        : '<span style="opacity:.5">Sem bens</span>';
    } catch { bEl.textContent = ''; }
  }
}

export function renderTabuleiro() {
  const container = document.getElementById('divTabuleiro');
  if (!container) return;

  let html = `<div class="tabuleiro-wrapper"><div class="tabuleiro-frame"><div class="tabuleiro-grid">`;

  for (let i = 0; i <= 63; i++) {
    const { row, col } = getGridPos(i);
    const nome      = getNomeCasa(i);
    const classe    = getClasseCasa(i);
    const icone     = getIconeCasa(i);
    const bonus     = CASAS_BONUS[i] !== 0
      ? `<span class="casa-bonus-tag">${CASAS_BONUS[i] > 0 ? '+' : ''}${CASAS_BONUS[i]}</span>`
      : '';

    // Casas laterais (col 17 = direita: 17-31, col 1 = esquerda: 49-63) ficam em modo paisagem
    const isLandscape = (i >= 17 && i <= 31) || (i >= 49 && i <= 63);
    const extraClass  = isLandscape ? ' casa-landscape' : '';

    // Paisagem tem mais largura para texto; retrato tem altura mas é estreito
    // Posições 1-15 (inferior) e 33-47 (superior) têm largura dupla no grid
    const isWide = (i >= 1 && i <= 15) || (i >= 33 && i <= 47);
    let label = nome.replace('COMPROU ', '').replace('BOLSA_OU_EST', 'EST');
    const maxLen = isLandscape ? 20 : isWide ? 15 : 11;
    if (label.length > maxLen) label = label.substring(0, maxLen - 1) + '…';

    const pioes = renderPioesNaCasa(i);

    const desc  = _descricaoCasa(CASAS_FIXAS[i], CASAS_BONUS[i]);
    html += `
      <div class="casa ${classe}${extraClass} pos${i}" data-pos="${i}"
           style="grid-row:${row};grid-column:${col}"
           title="#${i} — ${nome}${desc ? ': ' + desc : ''}">
        <div class="casa-conteudo">
          <div class="casa-num">${i}</div>
          <div class="casa-icone">${icone}</div>
          <div class="casa-nome">${label}${bonus}</div>
          <div class="casa-dono" id="cd-${i}"></div>
          ${pioes}
        </div>
      </div>`;
  }

  html += buildCentro();
  html += `</div></div></div>`;
  container.innerHTML = html;
  _atualizarCentro();
  _atualizarDestaquesJogadores();
  atualizarDonos();
}

function _renderDonoIcon(p) {
  const nome       = state.jogadores?.[p] || `Jogador ${p + 1}`;
  const foto       = state.jogadoresFotos?.[p];
  const personagem = state.jogadoresPersonagem?.[p];
  const cor        = COR_JOGADOR[p] || '#aaa';
  const title      = `🏠 Dono: ${nome}`;
  if (foto) {
    return `<div class="piao-dono" title="${title}" style="padding:0;overflow:hidden;">` +
           `<img src="${foto}" alt="${p+1}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>`;
  }
  if (personagem) {
    if (personagem.includes('/')) {
      return `<div class="piao-dono" title="${title}" style="padding:0;overflow:hidden;">` +
             `<img src="${personagem}" alt="${p+1}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"></div>`;
    }
    return `<div class="piao-dono" title="${title}" style="background:transparent;font-size:0.65em;line-height:1;">${personagem}</div>`;
  }
  return `<div class="piao-dono" title="${title}" style="background:${cor};">${p + 1}</div>`;
}

export function atualizarDonos() {
  const donos = state.casasDonos;
  if (!donos) return;
  for (let i = 0; i < 64; i++) {
    const el = document.getElementById(`cd-${i}`);
    if (!el) continue;
    const d = donos[i];
    el.innerHTML = (d !== null && d !== undefined) ? _renderDonoIcon(d) : '';
  }
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

    const ativo      = (p === state.jogador - 1) ? 'piao-ativo' : '';
    const bounce     = (p === movingPlayer) ? ' piao-movendo' : '';
    const foto       = state.jogadoresFotos?.[p];
    const personagem = state.jogadoresPersonagem?.[p];
    const div        = document.createElement('div');
    div.className       = `piao ${ativo}${bounce}`;
    div.title           = state.jogadores[p];
    div.dataset.jogador = String(p);
    if (foto) {
      div.style.padding  = '0';
      div.style.overflow = 'hidden';
      const img = document.createElement('img');
      img.src    = foto;
      img.alt    = String(p + 1);
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      div.appendChild(img);
    } else if (personagem) {
      if (personagem.includes('/')) {
        div.style.padding  = '0';
        div.style.overflow = 'hidden';
        const imgP = document.createElement('img');
        imgP.src           = personagem;
        imgP.alt           = String(p + 1);
        imgP.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
        div.appendChild(imgP);
      } else {
        div.style.background = 'transparent';
        div.style.fontSize   = '1.1em';
        div.style.lineHeight = '1';
        div.textContent      = personagem;
      }
    } else {
      div.style.background = COR_JOGADOR[p] || '#aaa';
      div.textContent      = String(p + 1);
    }
    el.appendChild(div);
  }
  _atualizarCentro();
}
