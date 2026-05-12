// ui.js — atualização de painéis, modais, indicadores

import { state, calcNetWorth, calcRanking, calcCofrinho, salarioDaRodada } from './state.js';

const SONS = {
  moeda:    'audio/beep-01a.mp3',
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

export function mostrarPergunta(idx) {
  if (!window._perguntas || !window._perguntas[idx]) return;
  _popularCombo();
  _atualizarConteudoModal(idx);

  const comboDiv = document.getElementById('comboNavPerguntas');
  if (comboDiv) comboDiv.style.display = '';

  document.getElementById('modalPerguntaFooterNormal').style.display = '';
  document.getElementById('modalPerguntaFooterResultado').style.display = 'none';

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPerguntas'));
  modal.show();
  tocarSom('pergunta');
}

// ── Indicadores do navbar ─────────────────────────────────────────────────────

export function atualizarIndicadores() {
  const p = state.jogador - 1;
  const sal = salarioDaRodada();
  const nw  = calcNetWorth(p);

  setText('indicadorJogador',   `J${state.jogador}`);
  setText('indicadorRodada',    `R${state.rodada}/${state.rodadas}`);
  setText('indicadorDinheiro',  `R$ ${fmt(state.jogadoresDinheiro[p])}`);
  setText('indicadorDivida',    `R$ ${fmt(state.jogadoresEmprestimos[p])}`);
  setText('indicadorSalario',   `R$ ${fmt(sal)}`);
  setText('indicadorNome',      state.jogadores[p] || '');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

export function fmt(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Painel de Jogadores ───────────────────────────────────────────────────────

export function renderJogadores() {
  const tbody = document.getElementById('tbodyJogadores');
  if (!tbody) return;
  const ranking = calcRanking();

  let html = '';
  for (let p = 0; p < state.qtJogadores; p++) {
    const nw    = calcNetWorth(p);
    const pos   = ranking.indexOf(p);
    const medal = pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : '';
    const classeRow = pos === 0 ? 'table-warning' : pos === 1 ? 'table-secondary' : pos === 2 ? 'table-danger' : '';
    const presente = state.jogadoresPresentes[p] === 'S';
    html += `
      <tr class="${classeRow} ${!presente ? 'opacity-50' : ''}">
        <td>${medal} ${p + 1}</td>
        <td><input class="form-control form-control-sm" value="${state.jogadores[p]}"
                   onchange="window.renomearJogador(${p}, this.value)"></td>
        <td>R$ ${fmt(state.jogadoresDinheiro[p])}</td>
        <td>R$ ${fmt(state.jogadoresEmprestimos[p])}</td>
        <td>R$ ${fmt(nw.liquido)}</td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" ${presente ? 'checked' : ''}
                   onchange="window.togglePresente(${p}, this.checked)">
          </div>
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
  const p = state.jogador - 1;
  let html = '<div class="row g-3">';
  for (let c = 0; c < 4; c++) {
    const acumulado = calcCofrinho(p, c);
    const rendStr   = c < 3 ? `${state.rendimento}% a.r.` : 'Deduz imposto';
    html += `
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 border-${['primary','success','warning','info'][c]}">
          <div class="card-header bg-${['primary','success','warning','info'][c]} text-white">
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
          </div>
        </div>
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── Painel de Ações ───────────────────────────────────────────────────────────

export function renderAcoes() {
  const tbody = document.getElementById('tbodyAcoes');
  if (!tbody) return;
  const p = state.jogador - 1;
  let html = '';
  state.nomesAcoes.forEach((nome, a) => {
    const qty = state.jogadoresAcoes[p][a];
    const div = state.dividendos[a];
    const val = state.valorAcao[a];
    html += `
      <tr>
        <td>${nome}</td>
        <td>R$ ${fmt(val)}</td>
        <td>${div}%</td>
        <td>${qty}</td>
        <td>R$ ${fmt(qty * val)}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="window.comprarAcao(${a})">+1</button>
          <button class="btn btn-sm btn-danger ms-1" onclick="window.venderAcao(${a})">-1</button>
        </td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

// ── Painel de Bens ────────────────────────────────────────────────────────────

export function renderBens() {
  const tbody = document.getElementById('tbodyBens');
  if (!tbody) return;
  const p = state.jogador - 1;
  let html = '';
  state.nomesBens.forEach((nome, b) => {
    const qty  = state.jogadoresBens[p][b];
    const val  = state.valorBem[b];
    const mnt  = state.despesaBem[b];
    html += `
      <tr>
        <td>${nome}</td>
        <td>R$ ${fmt(val)}</td>
        <td>${mnt}%</td>
        <td>${qty}</td>
        <td>R$ ${fmt(qty * val * mnt / 100)}/r</td>
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
  setVal('varRodadas',       state.rodadas);
  setVal('varJogadores',     state.qtJogadores);
  setVal('varTempo',         state.tempo);
  setVal('varSalario',       state.salario);
  setVal('varIncremento',    state.incremento);
  setVal('varJuros',         state.juros);
  setVal('varImpostos',      state.taxaImpostos);
  setVal('varRendimento',    state.rendimento);
  setVal('varTipoDado',      state.tipoDado);
  setVal('varProxPergunta',  state.proximaPergunta);
  setCheck('varSom',         state.emiteSom === 1);
  setCheck('varEnsinaAcoes', state.ensinaAcoes === 'S');
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
  state.tipoDado         = getInt('varTipoDado');
  state.proximaPergunta  = getInt('varProxPergunta');
  state.emiteSom         = document.getElementById('varSom')?.checked ? 1 : 0;
  state.ensinaAcoes      = document.getElementById('varEnsinaAcoes')?.checked ? 'S' : 'N';
}

function setVal(id, v)   { const el = document.getElementById(id); if (el) el.value = v; }
function setCheck(id, v) { const el = document.getElementById(id); if (el) el.checked = v; }
function getInt(id)      { return parseInt(document.getElementById(id)?.value) || 0; }
function getFloat(id)    { return parseFloat(document.getElementById(id)?.value) || 0; }

// ── Painel de Resumo ──────────────────────────────────────────────────────────

export function renderResumo() {
  const container = document.getElementById('containerResumo');
  if (!container) return;
  const ranking = calcRanking();
  let html = '<div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th>#</th><th>Jogador</th><th>Cofrinhos</th><th>Ações</th><th>Dinheiro</th><th>Dívida</th><th>Riqueza</th><th>Imposto</th><th>Dedução</th><th class="table-success">Líquido</th></tr></thead><tbody>';
  ranking.forEach((p, rank) => {
    const nw = calcNetWorth(p);
    const medalha = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1;
    html += `<tr>
      <td>${medalha}</td>
      <td>${state.jogadores[p]}</td>
      <td>R$ ${fmt(nw.cofAccum)}</td>
      <td>R$ ${fmt(nw.stockValue)}</td>
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
