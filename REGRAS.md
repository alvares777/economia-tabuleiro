# Regras de Negócio — Economia dos Milionários

> Documento gerado automaticamente a partir do código-fonte (`state.js`, `main.js`, `board.js`).  
> Data de referência: 2026-05-11  
> Versão do sistema: Node.js + PostgreSQL + Bootstrap 5

---

## 1. Configuração da Partida

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| Rodadas | 30 | Número total de rodadas do jogo |
| Jogadores | 6 | Número de jogadores (2–9) |
| Tempo | 360 min | Tempo estimado da partida |
| Salário base | 4 | Valor do salário na rodada 1 |
| Incremento | 2 | Acréscimo ao salário por rodada |
| Juros | 10% | Juros sobre empréstimos, cobrado ao final de cada turno |
| Impostos | 30% | Alíquota de IR aplicada sobre a riqueza bruta no ranking |
| Rendimento cofrinhos | 10% | Taxa de juros dos cofrinhos 1, 2 e 3 (ao mês/rodada) |
| Tipo de dado | 0 | 0 = Sorteio automático; 1 = Desafio (reservado) |
| Ensina Ações | N | S = casas "BOLSA_OU_ESTRELA" viram BOLSA; N = viram ESTRELA |

---

## 2. Salário da Rodada (RN-01)

```
salário_rodada = salário_base + (número_da_rodada × incremento)
```

**Exemplo**: Rodada 5, salário base 4, incremento 2 → `4 + 5×2 = 14`

O salário cresce a cada rodada, simulando progressão de carreira.

---

## 3. Fluxo do Turno

### 3.1 Rolar o Dado

1. O operador clica no dado 🎲.
2. O sistema exibe animação de faces aleatórias e sorteia 1–6.
3. **A pergunta atual é exibida** (ver §4).
4. O operador informa se o jogador acertou ou errou.
5. O **modal de movimento** é exibido.

### 3.2 Modal de Movimento

| Botão | Acertou | Errou |
|-------|---------|-------|
| ▶ Avançar | Move **`dado`** casas para frente + recebe `salário_rodada × dado` em dinheiro | Move **`dado`** casas para frente sem dinheiro |
| ◀ Voltar | Move **`dado`** casas para trás sem dinheiro | Move **`dado`** casas para trás sem dinheiro |
| 💰 Só $ | Recebe `salário_rodada × dado` em dinheiro sem mover | Botão oculto |

> **RN-02**: O movimento no tabuleiro usa **somente o valor do dado (1–6)**. O dinheiro concedido é `salário_rodada × dado`, mas **apenas se o jogador acertou a pergunta**.

### 3.3 Animação de Movimento

- O pião se desloca passo a passo pelo tabuleiro (até 12 frames visuais).
- Ao chegar à casa de destino, a **ação da célula é executada** (ver §6).
- Em seguida, a **guia Cofrinhos é aberta automaticamente** (RN-11).

### 3.4 Fim de Turno

Ao clicar em **▶ (Próximo Jogador)** são cobradas as despesas do turno atual:
- Manutenção de bens (`quantidade × valor_bem × percentual_despesa`)
- Juros sobre empréstimos (`valor_emprestado × juros%`)
- O jogador recebe dividendos das ações (ver §8)

> O botão **◀ (Anterior)** apenas navega para o jogador anterior **sem cobrar despesas nem avançar rodadas**. Usado para correção de operação.

---

## 4. Perguntas (RN-03)

- Há um banco de 38 perguntas pré-cadastradas (tabela `perguntas`).
- A cada rolagem de dado, abre-se a pergunta de número `proximaPergunta`.
- `proximaPergunta` é incrementado automaticamente: `(atual % 38) + 1`, voltando ao 1 após a 38ª.
- O **operador** decide se o jogador acertou ou errou.
- Casas **INQUEBRÁVEIS** também disparam uma pergunta ao serem visitadas (sem julgamento de acerto; apenas leitura).

---

## 5. Tabuleiro — Casas (64 posições, 0–63)

### Tipos de Casa

| Tipo | Cor | Ação automática |
|------|-----|-----------------|
| INÍCIO (pos. 0) | Vermelho | Ponto de partida |
| ESTRELA | Laranja/amarelo | Recebe `salário_rodada × 5` |
| BOLSA | Verde-água | Igual a ESTRELA (quando `ensinaAcoes = S`, abre atividade de bolsa) |
| EMERGÊNCIAS | Rosa/vermelho | Nenhuma ação automática — operador conduz |
| SONHOS | Roxo | Nenhuma ação automática — operador conduz |
| INQUEBRÁVEIS | Azul | Dispara a próxima pergunta do banco |
| COMPROU [BEM] | Verde claro | Nenhuma ação automática — operador sugere compra |
| Bônus (valor > 0) | Verde | Recebe `\|bônus\| × salário_rodada` |
| Penalidade (valor < 0) | Vermelho escuro | Paga `\|bônus\| × salário_rodada` |
| Neutra | Cinza | Nenhuma ação |

### Casas com Bônus/Penalidade fixos

| Pos | Nome | Bônus |
|-----|------|-------|
| 1 | Começou Bem | +5 sal |
| 7 | Estude mais | −4 sal |
| 9 | Comprou Celular | +20 sal |
| 15 | Pequeno erro | −3 sal |
| 20 | Bons Investimentos | +8 sal |
| 27 | Clima bom | +20 sal |
| 30 | Crise Mundial | −20 sal |
| 38 | Escolha ruim | −6 sal |
| 40 | Guerra | −10 sal |
| 52 | Pandemia | −12 sal |
| 59 | Nunca Desista | −11 sal |
| 61 | Foi só um susto | −7 sal |

---

## 6. Ações de Célula (RN-04 a RN-06)

Executadas automaticamente ao final do movimento:

```
se (casa tem bônus monetário):
    se positivo: dinheiro[jogador] += |bônus| × salário_rodada
    se negativo: dinheiro[jogador] -= |bônus| × salário_rodada  (mín. 0)
senão se (ESTRELA):
    dinheiro[jogador] += 5 × salário_rodada
senão se (INQUEBRÁVEIS):
    abre pergunta do banco (sem julgamento)
```

---

## 7. Cofrinhos (RN-07)

Cada jogador tem **4 cofrinhos**:

| # | Nome | Rendimento |
|---|------|-----------|
| 1 | Emergências | 10% ao mês (configurável) |
| 2 | Sonhos | 10% ao mês |
| 3 | Aposentadoria | 10% ao mês |
| 4 | Doações | Não rende — serve como dedução de IR |

### Cálculo de Rendimento

```
Para cada rodada r em que há aporte:
    se acumulado = 0:
        acumulado = aporte × 2      ← primeira contribuição dobra
    senão:
        acumulado = acumulado × (1 + rendimento%) + aporte
```

> **RN-07a**: A **primeira contribuição a qualquer cofrinho dobra de valor** (incentivo ao início do hábito de poupar).

### Abertura Automática

Após cada movimento (avançar ou voltar), a **guia Cofrinhos abre automaticamente** para o jogador depositar valores (RN-11).

---

## 8. Ações da Bolsa (RN-08)

Ativadas somente quando `ensinaAcoes = S`.

| Empresa | Valor unitário | Dividendo | Disponível |
|---------|---------------|-----------|------------|
| Banco | R$ 5 | 0% | Sim |
| Energia | R$ 20 | 0% | Sim |
| Seguradora | R$ 5 | 0% | Sim |
| Saneamento | R$ 15 | 20% | Sim |
| Telecom | R$ 15 | 20% | Sim |

- **Dividendos**: recebidos no final de cada turno (`dividendo% × valor × quantidade`).
- O jogador pode comprar ou vender 1 ação por clique.

---

## 9. Bens (RN-09)

| Bem | Valor | Manutenção |
|-----|-------|-----------|
| Celular | R$ 10 | 10%/rodada |
| Moto | R$ 20 | 10%/rodada |
| Carro | R$ 50 | 10%/rodada |
| Casa | R$ 100 | 10%/rodada |

- **Custo por rodada** = `quantidade × valor_bem × manutenção%`
- Cobrado no **final do turno** ao clicar em ▶ (Próximo).
- Devolução reembolsa **50%** do valor de compra.

---

## 10. Empréstimos (RN-10)

- O operador pode conceder empréstimos ao jogador durante o turno.
- **Juros** = `valor_emprestado × juros%` cobrado por turno ao clicar em ▶.
- O pagamento reduz o saldo de dívida (até o limite disponível em caixa).

---

## 11. Cálculo de Riqueza Líquida (RN-12 — Ranking)

```
riqueza_bruta = cofrinhos (1+2+3) + dinheiro_em_caixa - dívidas + valor_de_ações
imposto       = riqueza_bruta × alíquota_IR%
dedução_IR    = min(cofrinho_4 (Doações), imposto)
riqueza_líquida = riqueza_bruta - imposto + dedução_IR
```

> O **Cofrinho de Doações** (4) deduz impostos (simulando incentivo fiscal a doações).

---

## 12. Rodadas e Fim de Jogo

- A cada vez que todos os jogadores completam um turno, avança uma **rodada**.
- Ao atingir `rodadas` configuradas, o jogo encerra.
- O ranking final é exibido no painel **Resumo**.

---

## 13. Pontos a Revisar / Questões em Aberto

> Esta seção deve ser preenchida durante a revisão das regras.

- [ ] **BOLSA**: qual exatamente é a dinâmica quando `ensinaAcoes = S`? Apenas mostrar a tabela de ações, ou há ação automática de compra?
- [ ] **SONHOS**: a casa "SONHOS" deve ter alguma ação automática ou é puramente informativa?
- [ ] **EMERGÊNCIAS**: deve disparar algum desconto automático ou é informativa?
- [ ] **COMPROU [BEM]**: cair na casa obriga a compra do bem, ou é apenas sugestão?
- [x] **"Joga de novo" (pos. 60)**: o jogador rola o dado novamente sem trocar de vez. ✅ Implementado — o dado é desbloqueado sem avançar o jogador.
- [ ] **"Tá quase" (pos. 62)**: casa sem ação — manter neutra?
- [ ] **Penalidades**: o dinheiro pago vai para o banco ou é redistribuído?
- [ ] **Dado tipo 1 (Desafio)**: como funciona? (não implementado)
- [ ] **Mínimo de dinheiro**: ao pagar penalidade, o saldo para em 0 — pode ficar negativo?
- [ ] **Posição 63 (Aposentadoria)**: deve encerrar o jogo para aquele jogador?
