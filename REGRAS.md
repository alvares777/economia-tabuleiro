# Regras — Economia dos Milionários

> Manual do jogo gerado a partir do código-fonte.  
> Última atualização: 2026-05-12  
> Stack: Node.js + PostgreSQL + Bootstrap 5

---

## 1. Acesso ao Sistema

O jogo requer **login** com e-mail e senha.

- Novos usuários se cadastram em `/cadastro.html` e ficam **inativos** até um administrador ativá-los.
- Usuários inativos recebem a mensagem *"Seu usuário ainda não foi ativado. Contacte o administrador do jogo."*
- Credenciais inválidas: *"Credenciais inválidas, tente novamente."*
- O administrador padrão é criado automaticamente na primeira inicialização do servidor:
  - **E-mail:** `admin@economia.com.br`
  - **Senha:** `economia@2026`

### Tipos de usuário

| Tipo | Código | Permissões |
|------|--------|------------|
| Comum | C | Jogar, editar o próprio perfil |
| Administrador | A | Jogar + gerenciar usuários (ativar, editar, excluir) |

---

## 2. Configuração da Partida

Todas as variáveis abaixo podem ser alteradas pelo operador no painel **⚙️ Variáveis** a qualquer momento durante o jogo. As alterações são salvas junto com o estado da partida.

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| Rodadas | 30 | Número total de rodadas |
| Jogadores | 6 | Número de jogadores (2–9) |
| Tempo | 360 min | Tempo estimado da partida |
| Salário base | 4 | Valor do salário na rodada 1 |
| Incremento | 2 | Acréscimo ao salário por rodada |
| Juros | 10 % | Juros sobre empréstimos, cobrado ao final de cada turno |
| Impostos | 30 % | Alíquota de IR sobre a riqueza bruta no ranking final |
| Rendimento cofrinhos | 10 % | Taxa dos cofrinhos 1, 2 e 3 (por rodada) |
| Tipo de dado | Normal | Normal = sorteio automático 1–6; Desafio = dado especial |
| Ensina Ações | Não | Sim = casas BOLSA/ESTRELA viram BOLSA; Não = viram ESTRELA |

### Valores dos Bens (editáveis)

Os preços dos bens também são configuráveis no painel Variáveis e afetam diretamente as casas **$** do tabuleiro:

| Bem | Preço padrão | Manutenção padrão |
|-----|-------------|------------------|
| Celular | R$ 10 | 10 %/rodada |
| Moto | R$ 20 | 10 %/rodada |
| Carro | R$ 50 | 10 %/rodada |
| Casa | R$ 100 | 10 %/rodada |

---

## 3. Jogadores

Cada posição de jogador pode ser vinculada a um **usuário do sistema** (com foto de perfil) ou preenchida com nome avulso. Quando vinculado a um usuário, a foto do perfil aparece como pião no tabuleiro.

O painel **👥 Jogadores** exibe: saldo em caixa, dívida, riqueza líquida e permite marcar ausências, conceder empréstimos e ver o extrato individual.

---

## 4. Salário da Rodada (RN-01)

```
salário_rodada = salário_base + (número_da_rodada × incremento)
```

**Exemplo:** Rodada 5, salário base 4, incremento 2 → `4 + 5×2 = 14`

O salário cresce a cada rodada, simulando progressão de carreira.

---

## 5. Fluxo do Turno

### 5.1 Rolar o Dado

1. O operador clica no dado 🎲.
2. O sistema sorteia um valor de 1 a 6 e exibe a animação.
3. A **pergunta atual** é exibida (ver §6).
4. O operador informa se o jogador **acertou** ou **errou**.
5. O **modal de movimento** é exibido.

### 5.2 Modal de Movimento

| Botão | Acertou | Errou |
|-------|---------|-------|
| ▶ Avançar | Move `dado` casas para frente **+ recebe** `salário × dado` | Move `dado` casas para frente, **sem dinheiro** |
| ◀ Voltar | Move `dado` casas para trás, **sem dinheiro** | Move `dado` casas para trás, **sem dinheiro** |
| 💰 Só $ | Recebe `salário × dado` **sem mover** | Botão oculto |

### 5.3 Animação de Movimento

- O pião percorre as casas passo a passo (até 12 frames visuais).
- Ao parar, a **ação da casa é executada automaticamente** (ver §7).
- Em seguida, a **guia Cofrinhos abre automaticamente** para o jogador aplicar recursos.

### 5.4 Fim de Turno

Ao clicar em **▶ (Próximo Jogador)**:

1. Manutenção de bens é cobrada (`quantidade × valor_bem × manutenção%`)
2. Juros sobre empréstimos são cobrados (`dívida × juros%`)
3. Dividendos de ações são recebidos
4. A vez passa ao próximo jogador ativo
5. Quando todos os jogadores completam um turno, a **rodada avança**

### 5.5 Controle de Rodada — Avançar vs. Voltar

**Avançar (▶ Próximo Jogador)** é a única ação que pode incrementar a rodada. O incremento ocorre exatamente quando o último jogador ativo do ciclo encerra seu turno — ou seja, quando a sequência completa de todos os jogadores tiver passado pelo ▶.

**Voltar (◀ Anterior)** navega de volta ao jogador anterior **sem cobrar despesas e sem alterar o número da rodada**, independentemente de quantas vezes for acionado. Isso é intencional: o botão existe para que o operador possa **corrigir erros de operação** (movimento errado, dado relançado, etc.) reposicionando o turno sem efeito colateral no progresso do jogo.

> **Regra prática:** Se a rodada avançou indevidamente por engano, não há como revertê-la pelo fluxo normal. Planeje as correções antes de clicar em ▶ no último jogador do ciclo.

---

## 6. Perguntas (RN-03)

- Há 38 perguntas pré-cadastradas no banco de dados.
- A cada rolagem de dado, exibe-se a pergunta de número `proximaPergunta`.
- O índice avança automaticamente: `(atual % 38) + 1` (volta ao 1 após a 38ª).
- O operador decide se o jogador acertou ou errou.
- O resultado influencia o recebimento de dinheiro no movimento (ver §5.2).

---

## 7. Tabuleiro — 64 Casas (posições 0–63)

O tabuleiro é percorrido no sentido horário. Abaixo, todas as casas e seus efeitos:

### 7.1 Tipos de Casa

| Tipo | Ação ao parar |
|------|--------------|
| **INÍCIO** (pos. 0) | Ponto de partida |
| **⭐ ESTRELA** | Acerte a pergunta do dado → recebe `salário × 3` (multiplicador fixo) |
| **📈 BOLSA** | Jogue o dado especial: 🟢 VERDE = comprar ação obrigatoriamente · 🔴 VERMELHO = vender ação obrigatoriamente (se tiver) · ⚪ BRANCO = livre escolha. Sem "Ensina Ações", funciona como ESTRELA |
| **🚨 EMERG** | Pode sacar do cofrinho de **Emergências** (ver §8.2) |
| **💭 SONHOS** | Pode sacar do cofrinho de **Sonhos** (ver §8.2) |
| **💪 N.QUEBRE** | Deve aplicar **≥ 70 % do saldo atual** em cofrinhos antes de avançar (ver §8.3) |
| **🛒 $ CEL / $ MOTO / $ CAR / $ CASA** | Paga obrigatoriamente o valor do bem correspondente (pode ficar negativo — ver §8.4) |
| **Bônus** (número positivo) | Recebe `bônus × salário_rodada` |
| **Penalidade** (número negativo) | Paga `\|bônus\| × salário_rodada` (pode ficar negativo) |
| **Joga de novo** (pos. 60) | Rola o dado novamente **sem trocar a vez** |
| **Tá quase** (pos. 62) | Sem efeito — motivacional |
| **Viva de Renda** (pos. 63) | Casa final — sem efeito automático |

### 7.2 Mapa Completo das Casas

| Pos | Nome | Bônus/Efeito |
|-----|------|-------------|
| 0 | INÍCIO | — |
| 1 | Uhu +05 | +5 sal |
| 2–5 | ESTRELA | +3 sal (se acertou pergunta) |
| 6 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 7 | Estude -04 | −4 sal |
| 8 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 9 | $ CEL | **Paga valor do Celular** + bônus +20 sal |
| 10 | EMERG | Saque do cofrinho Emergências |
| 11 | ESTRELA | +3 sal (se acertou pergunta) |
| 12 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 13 | ESTRELA | +3 sal (se acertou pergunta) |
| 14 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 15 | Peq erro -03 | −3 sal |
| 16 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 17 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 18–19 | ESTRELA | +3 sal cada (se acertou pergunta) |
| 20 | Bons Invest +08 | +8 sal |
| 21 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 22 | $ CEL | **Paga valor do Celular** (sem bônus) |
| 23 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 24 | ESTRELA | +3 sal (se acertou pergunta) |
| 25 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 26 | ESTRELA | +3 sal (se acertou pergunta) |
| 27 | Clima bom +20 | +20 sal |
| 28 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 29 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 30 | CRISE -20 | −20 sal |
| 31 | EMERG | Saque do cofrinho Emergências |
| 32 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 33 | ESTRELA | +3 sal (se acertou pergunta) |
| 34 | $ MOTO | **Paga valor da Moto** |
| 35 | EMERG | Saque do cofrinho Emergências |
| 36–37 | ESTRELA | +3 sal cada (se acertou pergunta) |
| 38 | Esc ruim -06 | −6 sal |
| 39 | SONHOS | Saque do cofrinho Sonhos |
| 40 | Guerra -10 | −10 sal |
| 41 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 42 | EMERG | Saque do cofrinho Emergências |
| 43 | $ CAR | **Paga valor do Carro** |
| 44 | N.QUEBRE | Depositar ≥ 70 % do saldo |
| 45 | SONHOS | Saque do cofrinho Sonhos |
| 46–47 | BOLSA/ESTRELA | +3 sal cada (se acertou pergunta) |
| 48 | $ CASA | **Paga valor da Casa** |
| 49 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 50 | ESTRELA | +3 sal (se acertou pergunta) |
| 51 | SONHOS | Saque do cofrinho Sonhos |
| 52 | Pandemia -12 | −12 sal |
| 53 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 54 | EMERG | Saque do cofrinho Emergências |
| 55–56 | BOLSA/ESTRELA | +3 sal cada (se acertou pergunta) |
| 57 | EMERG | Saque do cofrinho Emergências |
| 58 | BOLSA/ESTRELA | +3 sal (se acertou pergunta) |
| 59 | Nunca Desista -11 | −11 sal |
| 60 | Joga de novo | Rola o dado de novo |
| 61 | Que susto -07 | −7 sal |
| 62 | Tá quase | — |
| 63 | Viva de Renda :) | — |

> **"sal"** = `salário_rodada` do momento do pouso.

---

## 8. Regras Especiais de Casas

### 8.1 Casas ESTRELA e BOLSA

- **ESTRELA**: ao pousar, o jogador responde à pergunta do dado. Se **acertar**, recebe `salário_rodada × 3` (multiplicador fixo — não depende do valor do dado). Se **errar**, apenas se move sem ganhar dinheiro.
- **BOLSA**: disponível quando a opção "Ensina Ações" está ativa. Ao pousar, jogue o **dado especial de 3 faces**:
  - 🟢 **VERDE** — jogador **deve comprar** pelo menos uma ação antes de passar a vez. O sistema bloqueia o avanço enquanto a compra não for registrada.
  - 🔴 **VERMELHO** — jogador **deve vender** pelo menos uma ação (se não tiver nenhuma, o bloqueio não é aplicado). O sistema bloqueia o avanço enquanto a venda não for registrada.
  - ⚪ **BRANCO** — jogador faz o que quiser: comprar, vender ou não fazer nada. Sem bloqueio.
  
  Se o jogador tentar avançar sem cumprir a obrigação de VERDE ou VERMELHO, o sistema exibe: *"Você precisa operar na bolsa antes de passar a vez, não tenha medo! Renda variável pode trazer boas surpresas"* e abre o painel de Ações automaticamente.
  
  Com "Ensina Ações" desligado, funciona exatamente como ESTRELA (`salário × 3` ao acertar).

### 8.2 Casas EMERG e SONHOS — Saque de Cofrinho

Ao pousar nessas casas, o jogador **pode** (não é obrigatório) sacar do cofrinho correspondente para cobrir gastos:

| Casa | Cofrinho disponível para saque |
|------|-------------------------------|
| EMERG | Emergências (cofrinho 1) |
| SONHOS | Sonhos (cofrinho 2) |

O saque reduz proporcionalmente os aportes do cofrinho e soma o valor ao saldo em caixa.

> **Saldo negativo**: quando o saldo do jogador é negativo (por penalidade de casa ou pagamento de bem), o painel Cofrinhos libera saque em **qualquer** dos quatro cofrinhos, independentemente da casa atual.

### 8.3 Casas N.QUEBRE (Inquebráveis)

Ao pousar em qualquer casa INQUEBRÁVEIS, o jogador recebe o seguinte alerta:

> *"Você pode ser inquebrável economicamente falando! Mas para isso você precisa aplicar no mínimo 70% do seu saldo atual em Cofrinhos"*

**Regra obrigatória:** o jogador **não pode avançar para o próximo turno** enquanto não depositar em cofrinhos pelo menos **70 % do saldo que tinha ao pousar**. Se o operador tentar avançar sem cumprir a obrigação, o alerta é exibido novamente e o avanço é bloqueado.

### 8.4 Casas $ — Pagamento Obrigatório de Bem

Ao pousar nessas casas, o jogador **deve pagar** o valor configurado para o bem correspondente:

| Casa | Bem | Preço (padrão) |
|------|-----|---------------|
| $ CEL (pos. 9 e 22) | Celular | R$ 10 |
| $ MOTO (pos. 34) | Moto | R$ 20 |
| $ CAR (pos. 43) | Carro | R$ 50 |
| $ CASA (pos. 48) | Casa | R$ 100 |

- O pagamento é **descontado automaticamente** do saldo ao pousar.
- O **saldo pode ficar negativo**. Nesse caso, o painel Cofrinhos abre com saque liberado em todos os cofrinhos.
- A posição 9 (`$ CEL`) também concede um bônus de `+20 × salário_rodada` (ambos aplicados juntos).
- Os valores padrão dos bens são configuráveis no painel **⚙️ Variáveis**.

### 8.5 Joga de Novo (pos. 60)

O jogador rola o dado novamente **sem trocar a vez** nem cobrar despesas.

### 8.6 Casa de Bônus — Sistema de Propriedade

As casas com bônus numérico positivo seguem a lógica de propriedade:

| Situação | Resultado |
|----------|-----------|
| Casa **sem dono** | Jogador recebe o bônus (`bônus × salário_rodada`) e **vira dono** da casa |
| Casa do **próprio jogador** | Nenhum bônus adicional; mensagem "Esta casa é sua!" |
| Casa de **outro jogador** | Jogador paga **aluguel = `valor_do_dado`** direto ao dono |

**Marcação visual:** ao tornar-se dono, um ícone de meia-escala do pião do jogador aparece no canto inferior direito da casa (com *tooltip* "🏠 Dono: [nome]"). O ícone usa a mesma prioridade que o pião normal: foto > personagem > pião colorido numerado.

**Persistência:** a lista de donos (64 posições, índice do jogador ou `null`) é salva com o estado do jogo na coluna `ao_casas_donos` da tabela `economia_tabuleiro`.

---

## 9. Cofrinhos (RN-07)

Cada jogador possui **4 cofrinhos**:

| # | Nome | Rendimento | Papel especial |
|---|------|-----------|----------------|
| 1 | Emergências | 10 % a.r. (configurável) | Saque permitido na casa EMERG |
| 2 | Sonhos | 10 % a.r. | Saque permitido na casa SONHOS |
| 3 | Aposentadoria | 10 % a.r. | Contabilizado na riqueza líquida |
| 4 | Doações | Não rende | Deduz IR no ranking final |

### 9.1 Cálculo do Rendimento

```
Para cada rodada r (em ordem cronológica):
    se acumulado == 0:
        acumulado = aporte × 2       ← primeira contribuição dobra
    senão:
        acumulado = acumulado × (1 + rendimento%) + aporte
```

> **RN-07a**: A **primeira contribuição** a qualquer cofrinho **dobra de valor** — incentivo ao início do hábito de poupar.

### 9.2 Depósito

- O operador digita o valor e clica em **+** no painel Cofrinhos.
- O valor é descontado do saldo em caixa e registrado no extrato.
- O depósito é lançado na rodada atual.

### 9.3 Saque

- O botão **↩ Sacar** aparece no cofrinho elegível (conforme regras §8.2 e §8.3).
- O valor é descontado proporcionalmente dos aportes já realizados.
- O valor sacado retorna ao saldo em caixa e é registrado no extrato.

---

## 10. Bens (RN-09)

| Bem | Valor (padrão) | Manutenção (padrão) |
|-----|---------------|---------------------|
| Celular | R$ 10 | 10 %/rodada |
| Moto | R$ 20 | 10 %/rodada |
| Carro | R$ 50 | 10 %/rodada |
| Casa | R$ 100 | 10 %/rodada |

- **Custo por rodada** = `quantidade × valor_bem × manutenção%`
- Cobrado automaticamente no final do turno (▶ Próximo).
- **Devolução**: reembolsa 50 % do valor de compra.
- Valores e percentuais são editáveis no painel **⚙️ Variáveis**.

---

## 11. Ações da Bolsa (RN-08)

Disponíveis apenas quando **"Ensina Ações"** está ativo.

| Empresa | Valor unit. | Dividendo |
|---------|------------|-----------|
| Banco | R$ 5 | 0 % |
| Energia | R$ 20 | 0 % |
| Seguradora | R$ 5 | 0 % |
| Saneamento | R$ 15 | 20 % |
| Telecom | R$ 15 | 20 % |

- **Dividendos**: recebidos ao final de cada turno (`dividendo% × valor × quantidade`).
- O jogador pode comprar ou vender 1 ação por clique no painel **📈 Ações**.
- **Correção de valor por rodada**: ao final de cada rodada completa (quando todos os jogadores passaram a vez), o valor de **todas as ações** é corrigido por `2 × Juros%`. Exemplo: Juros = 5 % → ações sobem 10 % por rodada.
- **Bônus de Energia** ⚡: jogador que possuir ao menos 1 ação de **Energia** tem o **valor do dado automaticamente dobrado** em cada rolagem. Exemplo: dado mostra 3 → o jogador se move 6 casas e ganha `salário × 6` (ou `salário × 3` em casa ESTRELA — o multiplicador fixo prevalece). O sistema exibe um aviso no modal de movimento.
- O operador pode ajustar o valor inicial de cada ação no painel **⚙️ Variáveis**.

---

## 12. Empréstimos (RN-10)

- O operador pode conceder empréstimo ao jogador a qualquer momento durante o turno.
- **Juros** = `dívida × juros%` — cobrado automaticamente ao final de cada turno.
- O pagamento de dívida reduz o saldo de empréstimo até o limite disponível em caixa.

---

## 13. Saldo Negativo

O saldo pode ficar negativo nas seguintes situações:

- Pouso em **casa de penalidade** (bônus negativo)
- Pouso em **casa $** (pagamento obrigatório de bem)

Quando o saldo é negativo, o painel **🐷 Cofrinhos** libera automaticamente o campo de saque em todos os quatro cofrinhos, permitindo ao jogador cobrir o déficit.

As cobranças de manutenção de bens e juros de empréstimos são **limitadas ao saldo disponível** (não geram saldo negativo por si sós).

---

## 14. Cálculo de Riqueza Líquida (RN-12 — Ranking)

```
riqueza_bruta   = cofrinhos(1+2+3) + dinheiro_caixa − dívidas + valor_ações
imposto         = riqueza_bruta × alíquota_IR%
dedução_IR      = min(cofrinho_Doações, imposto)
riqueza_líquida = riqueza_bruta − imposto + dedução_IR
```

> **Cofrinho de Doações** deduz impostos, simulando o incentivo fiscal brasileiro a doações.

O **Ranking** é exibido no painel 📊 Resumo e no centro do tabuleiro, ordenado por `riqueza_líquida` decrescente.

---

## 15. Rodadas e Fim de Jogo

- A rodada avança quando todos os jogadores **presentes** completam um turno.
- Ao atingir o total de rodadas configuradas, o jogo exibe **"🏆 Fim de jogo!"** e o ranking final é exibido no painel Resumo.
- Jogadores podem ser marcados como **ausentes** no painel Jogadores; eles são pulados automaticamente.

---

## 16. Extrato (Conta Corrente)

Cada jogador tem um extrato completo acessível pelo ícone 📋. Registra todos os eventos:

| Tipo | Descrição |
|------|-----------|
| 🎲 Salário+Dado | Recebimento de salário ao avançar |
| 🎲 Movimento | Movimento sem dinheiro |
| 💰 Bônus Casa | Bônus de casa com valor positivo |
| 📉 Penalidade | Desconto de casa com valor negativo |
| ⭐ Estrela | Bônus da casa Estrela |
| 💪 Inquebráveis | Registro da obrigação de 70 % |
| 🐷 Depósito Cof. | Depósito em cofrinho |
| 🐷 Saque Cof. | Saque de cofrinho |
| 🛒 Pag. Bem ($) | Pagamento obrigatório de bem |
| 🏠 Manutenção | Custo de manutenção de bens |
| 💸 Juros Pagos | Juros sobre empréstimos |
| 📈 Dividendos | Dividendos de ações |
| 🛒 Compra Bem | Compra voluntária de bem |
| ↩ Devol. Bem | Devolução de bem (50 % de reembolso) |
| 📈 Compra Ação | Compra de ação |
| 📉 Venda Ação | Venda de ação |
| 💳 Empréstimo | Empréstimo concedido |
| 💸 Pag. Dívida | Pagamento de dívida |
| 🏠 Aluguel pago | Aluguel pago ao dono de uma casa de bônus |
| 🏠 Aluguel recebido | Aluguel recebido como dono de uma casa de bônus |
| 🏦 Banco (ficou) | Jogador com ações do Banco optou por ficar na casa e receber seu valor sem se mover |

### Indicador de Pergunta (P#)

Cada evento gerado por rolagem de dado exibe um badge colorido com o número da pergunta respondida:

- **`P#12 ✅`** — pergunta 12 respondida corretamente
- **`P#12 ❌`** — pergunta 12 respondida incorretamente

O badge é gerado automaticamente a partir do campo `perguntaId` registrado no evento e serve para rastrear o histórico de acertos e erros de cada jogador ao longo da partida.

O extrato inclui validação de saldo: compara o saldo calculado pelo extrato com o saldo atual em caixa para detectar inconsistências.

---

## 17. Salvamento de Partidas

- O jogo realiza **auto-save** automático após cada ação relevante.
- Partidas ficam vinculadas ao usuário logado — cada usuário vê apenas as suas.
- A tela **📂 Minhas Partidas** lista todas as partidas salvas com opção de carregar, renomear ou excluir.
- É possível iniciar uma nova partida sem perder as anteriores.

---

## 18. Pendências / Pontos em Aberto

> Itens a decidir antes da publicação final do manual.

- [ ] **BOLSA** (quando `ensinaAcoes = S`): a compra ou venda de ação deve ser **obrigatória** ao pousar? Ou apenas educativa?
- [ ] **Viva de Renda (pos. 63)**: ao chegar nessa casa, o jogador deve ser declarado vencedor imediatamente, ou aguarda o fim das rodadas?
- [ ] **Tá quase (pos. 62)**: manter como casa neutra/motivacional?
- [ ] **Penalidades e manutenção**: o dinheiro pago vai para um "banco central" ou simplesmente sai do jogo?
- [ ] **Obrigatoriedade das casas $**: o jogador que não tem dinheiro suficiente para pagar o bem (saldo negativo) deve ser obrigado a sacar do cofrinho imediatamente ou apenas fica com saldo negativo?
