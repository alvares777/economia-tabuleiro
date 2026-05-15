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

      <!-- Header: medalhão + título -->
      <div class="centro-header">
        <div class="centro-logo">$</div>
        <div class="centro-titulo">Economia<small>dos Milionários</small></div>
      </div>

      <!-- Game strip: dado + pílulas (rodada / turno / pergunta) -->
      <div class="centro-game-strip">
        <div class="centro-dado" id="dadoCentro">🎲</div>
        <div class="centro-game-info">
          <div class="info-pill">
            <span class="lbl">Rodada</span>
            <strong id="centroRodada">—</strong>
          </div>
          <div class="info-pill">
            <span class="lbl">Turno</span>
            <strong id="centroTurno">—</strong>
          </div>
          <div class="info-pill pergunta-pill">
            <span class="lbl">Pergunta</span>
            <strong id="centroPergunta">—</strong>
          </div>
        </div>
      </div>

      <!-- Card "Vez de [Jogador]" — sempre o ATIVO -->
      <div class="centro-jogador-ativo">
        <div class="ja-avatar" id="centroVezAvatar">—</div>
        <div class="ja-info">
          <div class="ja-label">Vez de</div>
          <div class="ja-nome" id="centroVezNome">—</div>
        </div>
        <div class="ja-ranking" id="centroVezRanking">—</div>
      </div>

      <!-- Tag de consulta (só aparece quando vista !== jogador) -->
      <div class="centro-consulta-tag" id="centroConsultaTag" style="display:none">
        🔍 Consultando <strong id="centroConsultaNome">—</strong>
      </div>

      <!-- Painel: cofrinhos / bens / ações do jogador CONSULTADO -->
      <div class="centro-ativos">
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Cofrinhos</div>
          <div class="centro-cofrinhos" id="centroCofrinhos">—</div>
        </div>
        <div class="centro-ativos-sep"></div>
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Bens</div>
          <div class="centro-bens-grid">
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoBem(0)" title="Celular"><span class="centro-bem-ico">📱</span><span class="centro-bem-nome-s">Celular</span><span class="centro-bem-qtd" id="cbem0">—</span><span class="centro-bem-lucro" id="cbemL0"></span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoBem(1)" title="Moto"><span class="centro-bem-ico">🏍️</span><span class="centro-bem-nome-s">Moto</span><span class="centro-bem-qtd" id="cbem1">—</span><span class="centro-bem-lucro" id="cbemL1"></span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoBem(2)" title="Carro"><span class="centro-bem-ico">🚗</span><span class="centro-bem-nome-s">Carro</span><span class="centro-bem-qtd" id="cbem2">—</span><span class="centro-bem-lucro" id="cbemL2"></span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoBem(3)" title="Casa"><span class="centro-bem-ico">🏠</span><span class="centro-bem-nome-s">Casa</span><span class="centro-bem-qtd" id="cbem3">—</span><span class="centro-bem-lucro" id="cbemL3"></span></div>
          </div>
          <div class="centro-casas-tab" id="centroCasasTab"></div>
        </div>
        <div class="centro-ativos-sep"></div>
        <div class="centro-ativos-col">
          <div class="centro-ativos-label">Ações</div>
          <div class="centro-bens-grid">
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoAcao(0)" title="Banco"><span class="centro-bem-ico">🏦</span><span class="centro-bem-nome-s">Banco</span><span class="centro-bem-qtd" id="cacao0">—</span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoAcao(1)" title="Energia"><span class="centro-bem-ico">⚡</span><span class="centro-bem-nome-s">Energia</span><span class="centro-bem-qtd" id="cacao1">—</span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoAcao(2)" title="Seguradora"><span class="centro-bem-ico">🛡️</span><span class="centro-bem-nome-s">Seguro</span><span class="centro-bem-qtd" id="cacao2">—</span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoAcao(3)" title="Saneamento"><span class="centro-bem-ico">💧</span><span class="centro-bem-nome-s">Sanea.</span><span class="centro-bem-qtd" id="cacao3">—</span></div>
            <div class="centro-bem-cell centro-cell-clicavel" onclick="window.mostrarInfoAcao(4)" title="Telecom"><span class="centro-bem-ico">📡</span><span class="centro-bem-nome-s">Telecom</span><span class="centro-bem-qtd" id="cacao4">—</span></div>
          </div>
        </div>
      </div>

      <!-- Legenda -->
      <div class="centro-legenda">
        ${LEGENDA_CASAS.map(l =>
          `<button class="legenda-item" onclick="window._abrirLegenda('${l.id}')">${l.icone} ${l.nome}</button>`
        ).join('')}
      </div>
    </div>`;
}



// ── Helper: aplica avatar/foto/personagem no elemento ──────────────────────
function _aplicarAvatarCentro(el, p) {
  if (!el || p < 0 || p >= state.qtJogadores) return;
  const cor        = COR_JOGADOR[p] || '#aaa';
  const foto       = state.jogadoresFotos?.[p];
  const personagem = state.jogadoresPersonagem?.[p];

  // limpa estilos inline anteriores
  el.style.padding = '';
  el.style.fontSize = '';
  el.style.background = '';

  if (foto) {
    el.style.padding    = '0';
    el.innerHTML = `<img src="${foto}" alt="${p+1}">`;
  } else if (personagem && personagem.includes('/')) {
    el.style.padding    = '0';
    el.innerHTML = `<img src="${personagem}" alt="${p+1}">`;
  } else if (personagem) {
    el.style.background = 'transparent';
    el.style.fontSize   = '1.4em';
    el.textContent      = personagem;
  } else {
    el.style.background = cor;
    el.textContent      = String(p + 1);
  }
}

function _setTextCentro(id, t) {
  const el = document.getElementById(id);
  if (el) el.textContent = t;
}

function _atualizarCentro() {
  const cofEl = document.getElementById('centroCofrinhos');
  if (!cofEl || !state.jogadores) return;

  const ja  = state.jogador - 1;   // jogador ATIVO (de quem é a vez)
  const v   = state.vista   - 1;   // jogador CONSULTADO (visualização)
  const isConsultando = (v !== ja);

  // ── Game strip — info global ──────────────────────────────────────
  _setTextCentro('centroRodada',   `${state.rodada}/${state.rodadas}`);
  _setTextCentro('centroTurno',    `${state.jogador}/${state.qtJogadores}`);
  _setTextCentro('centroPergunta', `P#${state.proximaPergunta}`);

  // ── Card "Vez de [X]" — jogador ATIVO ─────────────────────────────
  const avEl = document.getElementById('centroVezAvatar');
  if (avEl) _aplicarAvatarCentro(avEl, ja);
  _setTextCentro('centroVezNome', state.jogadores[ja] || `Jogador ${state.jogador}`);

  // ── Medalha de ranking — do jogador CONSULTADO ───────────────────
  const rankEl = document.getElementById('centroVezRanking');
  if (rankEl) {
    try {
      const ranking = calcRanking();
      const pos     = ranking.indexOf(v) + 1;
      const medal   = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}°`;
      rankEl.textContent = medal;
      rankEl.title       = isConsultando
        ? `Ranking de ${state.jogadores[v]}`
        : 'Seu ranking';
    } catch { rankEl.textContent = ''; }
  }

  // ── Tag "🔍 Consultando" ──────────────────────────────────────────
  const tagEl = document.getElementById('centroConsultaTag');
  if (tagEl) {
    if (isConsultando) {
      tagEl.style.display = '';
      _setTextCentro('centroConsultaNome',
        state.jogadores[v] || `Jogador ${state.vista}`);
    } else {
      tagEl.style.display = 'none';
    }
  }

  // ── Cofrinhos do jogador CONSULTADO ───────────────────────────────
  try {
    const ICONS  = ['🚨', '💭', '🏦', '🎁'];
    const LABELS = ['Emerg.', 'Sonhos', 'Aposen.', 'Doações'];
    const linhas = [0, 1, 2, 3].map(c => {
      const txt = `${ICONS[c]} ${LABELS[c]}: R$${_fmtR(calcCofrinho(v, c))}`;
      return c === 3
        ? `<span class="centro-doacao-link" onclick="window.mostrarInfoDoacao()">${txt}</span>`
        : txt;
    });
    cofEl.innerHTML = linhas.join('<br>');
  } catch { cofEl.textContent = ''; }

  // ── Bens do jogador CONSULTADO ────────────────────────────────────
  try {
    const bens      = state.jogadoresBens[v]      || [];
    const bensLucro = state.jogadoresBensLucro?.[v] || [0,0,0,0];
    [0,1,2,3].forEach(b => {
      const el  = document.getElementById(`cbem${b}`);
      const elL = document.getElementById(`cbemL${b}`);
      if (el)  el.textContent  = `×${bens[b] || 0}`;
      if (elL) elL.textContent = bensLucro[b] > 0 ? `R$${_fmtR(bensLucro[b])}` : '';
    });
  } catch { /* ignore */ }

  // ── Imóveis do tabuleiro do jogador CONSULTADO ────────────────────
  try {
    const casasEl = document.getElementById('centroCasasTab');
    if (casasEl) {
      const minhas = [];
      (state.casasDonos || []).forEach((dono, pos) => { if (dono === v) minhas.push(pos); });
      const aluguelTotal = (state.jogadoresCasasAluguel || [])[v] || 0;
      if (minhas.length > 0) {
        const nomesHtml = minhas.map(pos => getNomeCasa(pos)).join(', ');
        casasEl.innerHTML = `🏠 <b>${minhas.length}</b> imóvel(s): <small>${nomesHtml}</small> · Aluguel: R$${_fmtR(aluguelTotal)}`;
      } else {
        casasEl.innerHTML = '';
      }
    }
  } catch { /* ignore */ }

  // ── Ações do jogador CONSULTADO ───────────────────────────────────
  try {
    const acoes = state.jogadoresAcoes[v] || [];
    [0,1,2,3,4].forEach(a => {
      const el = document.getElementById(`cacao${a}`);
      if (el) el.textContent = `×${acoes[a] || 0}`;
    });
  } catch { /* ignore */ }
}


export function atualizarCentro() { _atualizarCentro(); }

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
    const inicioClick = i === 0 ? ' onclick="window.destacarJogadoresUmAUm()"' : '';
    html += `
      <div class="casa ${classe}${extraClass} pos${i}" data-pos="${i}"
           style="grid-row:${row};grid-column:${col}"${inicioClick}
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
