// ui.js — atualização de painéis, modais, indicadores

import { state, calcNetWorth, calcRanking, calcCofrinho, salarioDaRodada, calcValorMercadoBem } from './state.js';
import { getNomeCasa, COR_JOGADOR } from './board.js';

const SONS = {
  moeda:    'audio/button-8.mp3',
  bom:      'audio/button-5.mp3',
  ruim:     'audio/button-2.mp3',
  info:     'audio/button-4.mp3',
  pergunta: 'audio/Rome.mp3',
  fim:      'audio/button-8.mp3',
};

export function tocarSom(tipo) {
  if (!state.emiteSom) return;
  const audio = document.getElementById('audioGame');
  if (!audio) return;
  audio.src = SONS[tipo] || SONS.info;
  audio.play().catch(() => {});
}

export function mostrarMensagem(texto, tipo = 'info') {
  const el = document.getElementById('modalMensagemTexto');
  if (el) el.innerHTML = texto;
  const modal = new bootstrap.Modal(document.getElementById('modalMensagem'));
  modal.show();
  tocarSom(tipo === 'erro' ? 'ruim' : tipo === 'ok' ? 'bom' : 'info');
}

let _idxOperadorAtual = null;

function _popularCombo() {
  const sel = document.getElementById('selectPergunta');
  if (!sel || sel.options.length > 0) return;
  const ids = Object.keys(window._perguntas || {}).map(Number).sort((a, b) => a - b);
  ids.forEach(id => {
    const text = window._perguntas[id].pergunta;
    const short = text.length > 55 ? text.substring(0, 55) + '…' : text;
    sel.add(new Option(`${id} — ${short}`, id));
  });
}

function _atualizarConteudoModal(idx) {
  if (!window._perguntas?.[idx]) return;
  _idxOperadorAtual = idx;
  const p = window._perguntas[idx];
  document.getElementById('modalPerguntaTexto').innerHTML = `<strong>${p.pergunta}</strong>`;
  document.getElementById('modalRespostaTexto').innerHTML = p.resposta;
  const collapse = document.getElementById('collapseResposta');
  if (collapse) collapse.classList.remove('show');
  const sel = document.getElementById('selectPergunta');
  if (sel) sel.value = idx;
}

export function navPerguntaOperador(delta) {
  if (_idxOperadorAtual === null) return;
  const ids = Object.keys(window._perguntas || {}).map(Number).sort((a, b) => a - b);
  const pos = ids.indexOf(_idxOperadorAtual);
  if (pos === -1) return;
  _atualizarConteudoModal(ids[(pos + delta + ids.length) % ids.length]);
}

export function irParaPerguntaOperador(idx) {
  _atualizarConteudoModal(parseInt(idx));
}

export function getPerguntaAtualOperador() {
  return _idxOperadorAtual;
}

export function mostrarPergunta(idx) {
  if (!window._perguntas || !window._perguntas[idx]) return;
  _popularCombo();
  _atualizarConteudoModal(idx);

  const comboDiv = document.getElementById('comboNavPerguntas');
  if (comboDiv) comboDiv.style.display = '';

  document.getElementById('modalPerguntaFooterNormal').style.display = '';
  document.getElementById('modalPerguntaFooterResultado').style.display = 'none';

  // habilita Acertou/Errou apenas quando há dado pendente (rolado mas ainda sem movimento)
  const podeMarcar = (window._valorDadoAtual || 0) > 0;
  const btnA = document.getElementById('btnQAcertouAvulso');
  const btnE = document.getElementById('btnQErrouAvulso');
  if (btnA) btnA.disabled = !podeMarcar;
  if (btnE) btnE.disabled = !podeMarcar;

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPerguntas'));
  modal.show();
  tocarSom('pergunta');
}

// ── Indicadores do navbar ─────────────────────────────────────────────────────

export function atualizarIndicadores() {
  const v   = state.vista - 1;   // jogador sendo visualizado
  const ativo = state.jogador - 1; // jogador cujo turno é agora
  const sal = salarioDaRodada();

  // Avatar do jogador VISUALIZADO
  const elJ  = document.getElementById('indicadorJogador');
  if (elJ) elJ.innerHTML = avatarHtml(v, 26);
  setText('indicadorRodada',    `R${state.rodada}/${state.rodadas}`);
  setText('indicadorDinheiro',  `R$ ${fmt(state.jogadoresDinheiro[v])}`);
  setText('indicadorDivida',    `R$ ${fmt(state.jogadoresEmprestimos[v])}`);
  setText('indicadorSalario',   `R$ ${fmt(sal)}`);
  setText('indicadorNome',      state.jogadores[v] || '');

  // Destaque do jogador ativo (vez de quem é)
  const elAtivo = document.getElementById('indicadorJogadorAtivo');
  if (elAtivo) {
    const nomeAtivo = state.jogadores[ativo] || `Jogador ${ativo + 1}`;
    const corAtivo  = COR_JOGADOR[ativo] || '#aaa';
    elAtivo.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:50%;background:${corAtivo};color:#fff;font-weight:bold;font-size:0.7rem;padding:0 4px;">${ativo + 1}</span> ${nomeAtivo}`;
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function avatarHtml(p, size = 28) {
  const foto       = state.jogadoresFotos?.[p];
  const personagem = state.jogadoresPersonagem?.[p];
  const cor        = COR_JOGADOR[p] || '#aaa';
  const imgStyle   = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);`;
  if (foto) return `<img src="${foto}" style="${imgStyle}">`;
  if (personagem) {
    return personagem.includes('/')
      ? `<img src="${personagem}" style="${imgStyle}">`
      : `<span style="font-size:${size - 4}px;line-height:1;">${personagem}</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${cor};color:#fff;font-weight:bold;font-size:${Math.round(size * 0.5)}px;">${p + 1}</span>`;
}

export function fmt(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Painel de Jogadores ───────────────────────────────────────────────────────

export function renderJogadores() {
  const tbody = document.getElementById('tbodyJogadores');
  if (!tbody) return;
  const ranking     = calcRanking();
  const sysUsers    = window._systemUsers || [];

  let html = '';
  for (let p = 0; p < state.qtJogadores; p++) {
    const nw    = calcNetWorth(p);
    const pos   = ranking.indexOf(p);
    const medal = pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : '';
    const classeRow = pos === 0 ? 'table-warning' : pos === 1 ? 'table-secondary' : pos === 2 ? 'table-danger' : '';
    const presente  = state.jogadoresPresentes[p] === 'S';
    const nEvt      = state.extrato.filter(e => e.jogador === p).length;
    const sysId     = state.jogadoresSysId?.[p] ?? null;
    const foto      = state.jogadoresFotos?.[p];

    const userOptions = sysUsers.map(u =>
      `<option value="${u.id}" ${sysId == u.id ? 'selected' : ''}>${u.nome}</option>`
    ).join('');

    const personagem = state.jogadoresPersonagem?.[p];
    const fotoHtml = foto
      ? `<img src="${foto}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.5);" class="me-1">`
      : '';

    const _PERSONAGENS = ['🧙','🦸','🤖','👽','🧛','🧝','🐱','🐵','🦊','🐸','👻','💀'];
    const _ICONS = [
      'icons/menina01.png','icons/menina02.png','icons/menina03.png','icons/menina04.png',
      'icons/menina05.png','icons/menina06.png','icons/menina07.png','icons/menina08.png',
      'icons/menina09.png','icons/menina010.png','icons/menina011.png','icons/menina012.png',
      'icons/menino01.png','icons/menino02.png','icons/menino03.png','icons/menino04.png',
      'icons/menino05.png','icons/menino06.png','icons/menino07.png','icons/menino08.png',
      'icons/menino09.png','icons/menino010.png','icons/menino011.png','icons/menino012.png',
      'icons/kaique.png','icons/kaique-cruz.png','icons/kaique-grafico.png',
      'icons/tioPatinhas.png',
    ];
    const personagemBtns = _PERSONAGENS.map(em =>
      `<button class="btn-personagem ${personagem === em ? 'ativo' : ''}"
               title="${em}" onclick="window.selecionarPersonagem(${p},'${em}')">${em}</button>`
    ).join('');
    const iconBtns = _ICONS.map(path => {
      const nome = path.replace('icons/','').replace(/\.[^.]+$/,'');
      return `<button class="btn-personagem ${personagem === path ? 'ativo' : ''}"
                title="${nome}" onclick="window.selecionarPersonagem(${p},'${path}')">` +
        `<img src="${path}" alt="${nome}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;display:block;"></button>`;
    }).join('');
    const removerBtn = personagem
      ? `<button class="btn-personagem remover" title="Remover personagem"
                 onclick="window.selecionarPersonagem(${p},null)">✖</button>`
      : '';

    html += `
      <tr class="${classeRow} ${!presente ? 'opacity-50' : ''}">
        <td>${medal} ${p + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-1 flex-wrap">
            ${fotoHtml}
            <input class="form-control form-control-sm" value="${state.jogadores[p]}"
                   ${sysId ? 'readonly style="background:#0d1117;cursor:default"' : ''}
                   onchange="window.renomearJogador(${p}, this.value)">
          </div>
          <select class="form-select form-select-sm mt-1"
                  onchange="window.selecionarUsuarioSistema(${p}, this.value)">
            <option value="" ${!sysId ? 'selected' : ''}>— Avulso —</option>
            ${userOptions}
          </select>
          <div class="d-flex flex-wrap gap-1 mt-1">${personagemBtns}${removerBtn}</div>
          <div class="d-flex flex-wrap gap-1 mt-1" style="max-height:90px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.12);padding-top:3px;">${iconBtns}</div>
        </td>
        <td>R$ ${fmt(state.jogadoresDinheiro[p])}</td>
        <td>R$ ${fmt(state.jogadoresEmprestimos[p])}</td>
        <td>R$ ${fmt(nw.liquido)}</td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" ${presente ? 'checked' : ''}
                   onchange="window.togglePresente(${p}, this.checked)">
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-info" onclick="window.abrirExtrato(${p})">
            📋${nEvt > 0 ? ` <span class="badge bg-secondary">${nEvt}</span>` : ''}
          </button>
        </td>
      </tr>`;
  }
  tbody.innerHTML = html;
}

// ── Painel de Cofrinhos ───────────────────────────────────────────────────────

const NOMES_COFRINHOS = ['Emergências', 'Sonhos', 'Aposentadoria', 'Doações'];

export function renderCofrinhos() {
  const container = document.getElementById('containerCofrinhos');
  if (!container) return;
  const p        = state.vista - 1;
  const nomeCasa = getNomeCasa(state.jogadoresPosicao[p]);
  const saldo    = state.jogadoresDinheiro[p];

  // Regras de saque: EMERG → cofr. 0; SONHOS → cofr. 1; saldo negativo → qualquer
  const podeSacar = (c) => {
    if (saldo < 0) return true;
    if (nomeCasa === 'EMERG'  && c === 0) return true;
    if (nomeCasa === 'SONHOS' && c === 1) return true;
    return false;
  };

  const CORES  = ['primary', 'success', 'warning', 'info'];
  let html = '<div class="row g-3">';
  for (let c = 0; c < 4; c++) {
    const acumulado = calcCofrinho(p, c);
    const rendStr   = c < 3 ? `${state.rendimento}% a.r.` : 'Deduz imposto';
    const saqueHtml = podeSacar(c) ? `
      <div class="input-group input-group-sm mt-2">
        <span class="input-group-text text-warning fw-bold">↩ Sacar R$</span>
        <input type="number" id="saqueCofrinho${c}" class="form-control" min="0" max="${acumulado.toFixed(2)}" step="1" value="0">
        <button class="btn btn-outline-warning" onclick="window.sacarCofrinho(${c})">OK</button>
      </div>` : '';

    html += `
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 border-${CORES[c]}">
          <div class="card-header bg-${CORES[c]} text-white">
            <strong>${NOMES_COFRINHOS[c]}</strong>
          </div>
          <div class="card-body">
            <p class="mb-1 small text-muted">${rendStr}</p>
            <h5 class="card-title">R$ ${fmt(acumulado)}</h5>
            <div class="input-group input-group-sm mt-2">
              <span class="input-group-text">Depositar R$</span>
              <input type="number" id="depositoCofrinho${c}" class="form-control" min="0" step="1" value="0">
              <button class="btn btn-outline-primary" onclick="window.depositarCofrinho(${c})">+</button>
            </div>
            ${saqueHtml}
          </div>
        </div>
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── Painel de Ações ───────────────────────────────────────────────────────────

const _ACAO_VANTAGEM = [
  '🏦 Saque o valor da casa atual sem mover (a cada 2 rod.)',
  '⚡ Dobra o dado ao rolar',
  '🛡️ Cobre Emergências sem penalidade',
  '💧 Dividendo 20%/rod por ação',
  '📡 Dividendo 20%/rod por ação',
];

export function renderAcoes() {
  const tbody = document.getElementById('tbodyAcoes');
  if (!tbody) return;
  const p = state.vista - 1;
  let html = '';
  state.nomesAcoes.forEach((nome, a) => {
    const qty  = state.jogadoresAcoes[p][a];
    const div  = state.dividendos[a];
    const val  = state.valorAcao[a];
    const vant = _ACAO_VANTAGEM[a] || '';
    html += `
      <tr>
        <td>${nome}</td>
        <td>R$ ${fmt(val)}</td>
        <td>${div}%</td>
        <td>${qty}</td>
        <td>R$ ${fmt(qty * val)}</td>
        <td class="text-muted small">${vant}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="window.comprarAcao(${a})">+1</button>
          <button class="btn btn-sm btn-danger ms-1" onclick="window.venderAcao(${a})">-1</button>
        </td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

// ── Painel de Bens ────────────────────────────────────────────────────────────

const _BEM_VANTAGEM = [
  '📱 +R$3/rodada',
  '🏍️ -25% manutenção',
  '🚗 -30% aluguel',
  '🏠 +R$10/rodada',
];

export function renderBens() {
  const tbody = document.getElementById('tbodyBens');
  if (!tbody) return;
  const p = state.vista - 1;
  let html = '';
  state.nomesBens.forEach((nome, b) => {
    const qty    = state.jogadoresBens[p][b];
    const val    = state.valorBem[b];
    const mnt    = state.despesaBem[b];
    const vmkt   = calcValorMercadoBem(b);
    const vant   = _BEM_VANTAGEM[b];
    html += `
      <tr>
        <td>${nome}</td>
        <td>R$ ${fmt(val)}</td>
        <td class="text-warning small">R$ ${fmt(vmkt)}/un</td>
        <td>${mnt}%</td>
        <td>${qty}</td>
        <td>R$ ${fmt(qty * val * mnt / 100)}/r</td>
        <td class="small text-info">${vant}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="window.comprarBem(${b})">Comprar</button>
          <button class="btn btn-sm btn-danger ms-1" onclick="window.devolverBem(${b})">Devolver</button>
        </td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

// ── Painel de Variáveis ───────────────────────────────────────────────────────

export function carregarVariaveis() {
  // Preenche o select de jogador atual com jogadores presentes
  const selJogAtual = document.getElementById('varJogadorAtual');
  if (selJogAtual) {
    selJogAtual.innerHTML = '';
    for (let i = 0; i < state.qtJogadores; i++) {
      if (state.jogadoresPresentes[i] !== 'S') continue;
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = `${i + 1} — ${state.jogadores[i] || `Jogador ${i + 1}`}`;
      if (i + 1 === state.jogador) opt.selected = true;
      selJogAtual.appendChild(opt);
    }
  }
  const selRodAtual = document.getElementById('varRodadaAtual');
  if (selRodAtual) {
    selRodAtual.innerHTML = '';
    for (let r = 1; r <= state.rodadas; r++) {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = `Rodada ${r}`;
      if (r === state.rodada) opt.selected = true;
      selRodAtual.appendChild(opt);
    }
  }
  setVal('varRodadas',       state.rodadas);
  setVal('varJogadores',     state.qtJogadores);
  setVal('varTempo',         state.tempo);
  setVal('varSalario',       state.salario);
  setVal('varIncremento',    state.incremento);
  setVal('varJuros',         state.juros);
  setVal('varImpostos',      state.taxaImpostos);
  setVal('varRendimento',    state.rendimento);
  setCheck('varTipoDado',    state.tipoDado === 1);
  const lblTipoDado = document.getElementById('lblTipoDado');
  if (lblTipoDado) lblTipoDado.textContent = state.tipoDado === 1 ? 'Dado Desafio' : 'Dado Normal';
  setVal('varProxPergunta',  state.proximaPergunta);
  setCheck('varSom',         state.emiteSom === 1);
  setCheck('varEnsinaAcoes', state.ensinaAcoes === 'S');
  // Valores de bens
  setVal('varValorCelular',  state.valorBem[0]);
  setVal('varValorMoto',     state.valorBem[1]);
  setVal('varValorCarro',    state.valorBem[2]);
  setVal('varValorCasa',     state.valorBem[3]);
  setVal('varDespesaCelular', state.despesaBem[0]);
  setVal('varDespesaMoto',    state.despesaBem[1]);
  setVal('varDespesaCarro',   state.despesaBem[2]);
  setVal('varDespesaCasa',    state.despesaBem[3]);
  // Valores das ações
  setVal('varValorBanco',      state.valorAcao[0]);
  setVal('varValorEnergia',    state.valorAcao[1]);
  setVal('varValorSeguradora', state.valorAcao[2]);
  setVal('varValorSaneamento', state.valorAcao[3]);
  setVal('varValorTelecom',    state.valorAcao[4]);
}

export function salvarVariaveis() {
  state.rodadas          = getInt('varRodadas');
  state.qtJogadores      = getInt('varJogadores');
  state.tempo            = getInt('varTempo');
  state.salario          = getFloat('varSalario');
  state.incremento       = getFloat('varIncremento');
  state.juros            = getFloat('varJuros');
  state.taxaImpostos     = getFloat('varImpostos');
  state.rendimento       = getFloat('varRendimento');
  state.tipoDado         = document.getElementById('varTipoDado')?.checked ? 1 : 0;
  state.proximaPergunta  = getInt('varProxPergunta');
  state.emiteSom         = document.getElementById('varSom')?.checked ? 1 : 0;
  state.ensinaAcoes      = document.getElementById('varEnsinaAcoes')?.checked ? 'S' : 'N';
  // Valores de bens
  state.valorBem[0]  = getFloat('varValorCelular')  || state.valorBem[0];
  state.valorBem[1]  = getFloat('varValorMoto')     || state.valorBem[1];
  state.valorBem[2]  = getFloat('varValorCarro')    || state.valorBem[2];
  state.valorBem[3]  = getFloat('varValorCasa')     || state.valorBem[3];
  state.despesaBem[0] = getFloat('varDespesaCelular') || state.despesaBem[0];
  state.despesaBem[1] = getFloat('varDespesaMoto')    || state.despesaBem[1];
  state.despesaBem[2] = getFloat('varDespesaCarro')   || state.despesaBem[2];
  state.despesaBem[3] = getFloat('varDespesaCasa')    || state.despesaBem[3];
  // Valores das ações
  state.valorAcao[0] = getFloat('varValorBanco')      || state.valorAcao[0];
  state.valorAcao[1] = getFloat('varValorEnergia')    || state.valorAcao[1];
  state.valorAcao[2] = getFloat('varValorSeguradora') || state.valorAcao[2];
  state.valorAcao[3] = getFloat('varValorSaneamento') || state.valorAcao[3];
  state.valorAcao[4] = getFloat('varValorTelecom')    || state.valorAcao[4];
}

function setVal(id, v)   { const el = document.getElementById(id); if (el) el.value = v; }
function setCheck(id, v) { const el = document.getElementById(id); if (el) el.checked = v; }
function getInt(id)      { return parseInt(document.getElementById(id)?.value) || 0; }
function getFloat(id)    { return parseFloat(document.getElementById(id)?.value) || 0; }

// ── Extrato (conta corrente) ──────────────────────────────────────────────────

const _TIPO_LABEL = {
  SALARIO_DADO:         '🎲 Salário+Dado',
  MOVIMENTO:            '🎲 Movimento',
  BONUS_CASA:           '💰 Bônus Casa',
  PENALIDADE_CASA:      '📉 Penalidade',
  ESTRELA:              '⭐ Estrela',
  INQUEBRAVEIS:         '💪 Inquebráveis',
  COFRINHO:             '🐷 Depósito Cof.',
  BONUS_COFRINHO:       '🐷 Bônus Cof.',
  SAQUE_COFRINHO:       '🐷 Saque Cof.',
  PAGAMENTO_BEM:        '🛒 Pag. Bem ($)',
  CUSTO_BENS:           '🏠 Manutenção',
  JUROS_PAGOS:          '💸 Juros Pagos',
  DIVIDENDOS:           '📈 Dividendos',
  COMPRA_BEM:           '🛒 Compra Bem',
  DEVOLUCAO_BEM:        '↩ Devol. Bem',
  COMPRA_ACAO:          '📈 Compra Ação',
  VENDA_ACAO:           '📉 Venda Ação',
  EMPRESTIMO:           '💳 Empréstimo',
  PAGAMENTO_EMPRESTIMO: '💸 Pag. Dívida',
  ALUGUEL_PAGO:         '🏠 Aluguel pago',
  ALUGUEL_RECEBIDO:     '🏠 Aluguel recebido',
  BANCO_CASA:           '🏦 Banco (ficou)',
  RENDA_BENS:           '📱 Renda de bens',
  LEILAO_COMPRA:        '🔨 Compra em Leilão',
  LEILAO_VENDA:         '🔨 Venda em Leilão',
};

export function renderExtrato(p) {
  const tbody = document.getElementById('extratoBody');
  const totEl = document.getElementById('extratoTotais');
  if (!tbody) return;

  const eventos = state.extrato.filter(e => e.jogador === p);

  if (eventos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Nenhum evento registrado ainda.</td></tr>';
    if (totEl) totEl.innerHTML = '';
    return;
  }

  let html = '';
  eventos.forEach(e => {
    const isPos = e.valor > 0;
    const isNeg = e.valor < 0;
    const cor = isPos ? 'text-success' : isNeg ? 'text-danger' : 'text-muted';
    const label = _TIPO_LABEL[e.tipo] || e.tipo;
    const pBadge = e.perguntaId != null
      ? ` <span class="badge bg-${e.acertou ? 'success' : 'danger'} ms-1">P#${e.perguntaId}${e.acertou ? ' ✅' : ' ❌'}</span>`
      : '';
    const varTip = e.salarioRodada != null
      ? `Sal:${fmt(e.salarioRodada)} Jur:${e.peJuros}% Imp:${e.peImpostos}% Rend:${e.peRendimento}%`
      : '';
    html += `<tr>
      <td class="text-center">${e.rodada}</td>
      <td class="small">${label}</td>
      <td>${e.descricao}${pBadge}</td>
      <td class="${cor} text-end fw-bold text-nowrap">${isPos ? '+' : ''}R$ ${fmt(e.valor)}</td>
      <td class="text-end text-nowrap">R$ ${fmt(e.saldoDepois)}</td>
      <td class="text-muted" style="font-size:0.7rem;white-space:nowrap">${varTip}</td>
    </tr>`;
  });
  tbody.innerHTML = html;

  if (!totEl) return;

  const eventosCaixa = eventos.filter(e => e.tipo !== 'BONUS_COFRINHO');
  const entradas  = eventosCaixa.reduce((s, e) => s + Math.max(0, e.valor), 0);
  const saidas    = eventosCaixa.reduce((s, e) => s + Math.max(0, -e.valor), 0);
  const cofrinhos = eventosCaixa.filter(e => e.tipo === 'COFRINHO').reduce((s, e) => s + Math.abs(e.valor), 0);
  const saldoUlt  = (eventosCaixa[eventosCaixa.length - 1] ?? eventos[eventos.length - 1]).saldoDepois;
  const saldoReal = state.jogadoresDinheiro[p];
  const ok = Math.abs(saldoUlt - saldoReal) < 0.01;

  totEl.innerHTML = `
    <table class="table table-sm table-bordered mt-3 mb-0">
      <thead class="table-dark"><tr><th colspan="2">Validação de Saldo</th></tr></thead>
      <tbody>
        <tr><td>Total entradas</td><td class="text-success text-end fw-bold">+R$ ${fmt(entradas)}</td></tr>
        <tr><td>Total saídas (excl. cofrinhos)</td><td class="text-danger text-end fw-bold">-R$ ${fmt(saidas - cofrinhos)}</td></tr>
        <tr><td>Total depositado em cofrinhos</td><td class="text-warning text-end fw-bold">-R$ ${fmt(cofrinhos)}</td></tr>
        <tr class="${ok ? 'table-success' : 'table-danger fw-bold'}">
          <td>Saldo último evento</td>
          <td class="text-end">R$ ${fmt(saldoUlt)}</td>
        </tr>
        <tr class="${ok ? 'table-success' : 'table-danger fw-bold'}">
          <td>Saldo atual em caixa</td>
          <td class="text-end">R$ ${fmt(saldoReal)}</td>
        </tr>
        <tr class="${ok ? 'table-success' : 'table-danger'}">
          <td>Status</td>
          <td class="text-end fw-bold">${ok ? '✅ Saldos conferem!' : '⚠️ Divergência — verifique!'}</td>
        </tr>
      </tbody>
    </table>`;
}

// ── Painel de Resumo ──────────────────────────────────────────────────────────

export function renderResumo() {
  const container = document.getElementById('containerResumo');
  if (!container) return;
  const ranking = calcRanking();
  let html = '<div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th>#</th><th>Jogador</th><th>Cofrinhos</th><th>Ações</th><th>Bens</th><th>Imóveis</th><th>Dinheiro</th><th>Dívida</th><th>Riqueza</th><th>Imposto</th><th>Dedução</th><th class="table-success">Líquido</th></tr></thead><tbody>';
  ranking.forEach((p, rank) => {
    const nw = calcNetWorth(p);
    const medalha = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1;
    html += `<tr>
      <td>${medalha}</td>
      <td><div class="d-flex align-items-center gap-2">${avatarHtml(p, 30)}<span>${state.jogadores[p]}</span></div></td>
      <td>R$ ${fmt(nw.cofAccum)}</td>
      <td>R$ ${fmt(nw.stockValue)}</td>
      <td>R$ ${fmt(nw.bensValue)}</td>
      <td>R$ ${fmt(nw.casasValue)}</td>
      <td>R$ ${fmt(state.jogadoresDinheiro[p])}</td>
      <td>R$ ${fmt(state.jogadoresEmprestimos[p])}</td>
      <td>R$ ${fmt(nw.riqueza)}</td>
      <td>R$ ${fmt(nw.imposto)}</td>
      <td>R$ ${fmt(nw.deducao)}</td>
      <td class="fw-bold text-success">R$ ${fmt(nw.liquido)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}
