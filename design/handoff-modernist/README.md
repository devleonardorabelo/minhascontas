# Handoff: Minhas Contas — redesenho Modernist (visual + fluxos)

## Visão geral

Redesenho completo do app **Minhas Contas** (`devleonardorabelo/minhascontas`, Expo SDK 57 / React Native 0.86, `main`).
Duas coisas mudam no mesmo PR:

1. **A pele.** Sai o tema escuro com cartões arredondados e quatro cores semânticas; entra o design system **Modernist**: fundo claro, Archivo, raio 0, réguas de 2px, vermelho `#ec3013` usado com parcimônia.
2. **Os fluxos.** Anotar ganha teclado próprio na tela, a conferência de fatura vira tela cheia, Ajustes inverte a ordem, Começar cai para duas perguntas obrigatórias.

O motor (`src/budget.ts`, `src/ai.ts`, `src/store.ts`) **não muda**. Nenhuma regra de cálculo, nenhum contrato de tool, nenhum formato de dado.

## Sobre os arquivos de design

Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos, não código de produção para copiar. A tarefa é **recriar esses designs em React Native**, com os componentes e padrões que o repositório já tem (`src/ui.tsx`, `StyleSheet`, `Pressable`, `TextInput`). Não introduza CSS, não introduza biblioteca de UI nova, não instale nada além de `expo-font` e o pacote da fonte.

- `Redesenho Modernist.dc.html` — o alvo. Seis frames de 390×844: Resumo, Anotar, Conferir, Extrato, Ajustes, Começar. À esquerda, a revisão crítica que motivou cada mudança.
- `Telas atuais.dc.html` — recriação fiel do estado de hoje, para comparação antes/depois.
- `_ds/modernist-…/styles.css` — a fonte dos tokens. Os valores abaixo saem daqui; em caso de divergência, o CSS ganha.
- `_ds/modernist-…/readme.md` — o guia do sistema (o "do" e o "don't").

Abra os HTML em qualquer navegador.

## Fidelidade

**Alta.** Cores, tipografia, espaçamento e tamanhos são finais. Recrie pixel a pixel, respeitando a plataforma (sombra não existe neste sistema; `elevation` fica em 0).

---

## Design tokens

Substituem por completo os objetos `DARK` e `LIGHT` de `src/ui.tsx`.

### Cor — tema único

O app passa a ter **um tema**. `useColorScheme()` deixa de escolher paleta; `useC()` devolve sempre o mesmo objeto. O argumento do SPEC 04 (ela usa o celular na rua, no sol) empurra para o claro, e o Modernist é um sistema claro por definição.

| token | valor | uso |
|---|---|---|
| `bg` | `#f3f2f2` | fundo da tela |
| `card` (renomear para `surface`) | `#eae9e9` | faixa de cabeçalho de dia no Extrato, fundo de input |
| `line` | `rgba(32,30,29,0.4)` | borda de controle (`--color-divider`) |
| `rule` | `#201e1d` | régua forte de 2px entre seções |
| `lineSoft` | `#d7d3d3` | régua de 1px entre linhas de lista (`--color-neutral-300`) |
| `text` | `#201e1d` | texto principal |
| `dim` | `#605d5d` | texto secundário (`--color-neutral-700`, AA sobre `bg`) |
| `dimmer` | `#7d7979` | prefixo "R$" e placeholders (`--color-neutral-600`) |
| `accent` | `#ec3013` | ação primária, aba ativa, faixa de juros |
| `accentInk` | `#ae1800` | vermelho em corpo de texto (`--color-accent-700`, AA sobre `bg`) |
| `accentTint` | `#fff2ef` | fundo da linha de juros em Conferir (`--color-accent-100`) |
| `onAccent` | `#f3f2f2` | texto sobre vermelho |

**As cores semânticas somem.** `good`, `warn` e `bad` deixam de existir como três vozes:

- **Positivo** (dá para gastar, salário, sobra) = `text`. Tinta preta. O valor já é positivo pelo sinal e pelo tamanho; não precisa de verde.
- **Negativo, juros, veredicto ruim, previsão negativa** = `accentInk` em texto, `accent` em preenchimento.
- **Aviso** deixa de ter cor própria. Onde hoje há borda amarela (`Card tone="warn"`), use a faixa vermelha cheia (ver "A fatura" no Resumo).

Isto é regra do sistema, não gosto: o Modernist é mono. Se a fatura já é amarela, "Dá, mas aperta" não assusta mais ninguém.

### Espaçamento

`SP` fica como está (`xs 4, sm 8, md 12, lg 16, xl 24, xxl 32`) — o Modernist usa a mesma escala de 4/8. O padding lateral das telas sobe de `SP.lg` (16) para **20**, para bater com os frames.

### Raio

**Zero em tudo.** `--radius-md: 0px`. Trocar em `src/ui.tsx`:

- `s.card.borderRadius: 16` → `0` (e ver "Card vira seção" abaixo)
- `s.btn.borderRadius: 12` → `0`
- `s.chip.borderRadius: 12` → `0`
- `s.input.borderRadius: 12` → `0`
- `s.barBg.borderRadius: 4` e o preenchimento interno → `0`
- `s.dot.borderRadius: 2` → o ponto da tab bar deixa de existir (ver Tab bar)

### Tipografia

**Archivo** nos pesos 400 / 600 / 800. Carregar com `expo-font` + `@expo-google-fonts/archivo`:

```ts
// App.tsx
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
```

Segurar o render até `fontsLoaded` (o app já tem o gate `ready`; combine os dois).

`fontWeight: '700'` em título vira **`'800'`**. Peso 600 continua 600. Corpo é 400.

Escala em uso (px):

| papel | tamanho | peso | onde |
|---|---|---|---|
| número herói | 58 | 800 | "R$ 892,40" no Resumo |
| valor digitado | 62 | 800 | Anotar |
| título de tela | 40 | 800 | poster do Começar |
| título de seção | 25 | 800 | "Achei 23 compras", "Quanto você quer deixar parado" |
| veredicto | 30 | 800 | "Pode." |
| valor grande | 42 | 800 | reserva, salário no onboarding |
| valor médio | 19–26 | 800 | totais de seção |
| kicker | 12 | 800 | caixa alta, `letterSpacing: 0.96` (0.08em) |
| corpo | 15 | 400 | parágrafos, `lineHeight` 1.5 |
| item de lista | 16 | 400/600 | descrição no Extrato |
| meta | 13 | 400 | categoria, data, origem |

Todo número mantém `fontVariant: ['tabular-nums']` (o `mono` que já existe).
Títulos herói levam `letterSpacing: -0.02` a `-0.03em`.

### Alvo de toque

`TAP` sobe de **48 → 56**. Botões, abas e chips grandes em 56; chips de categoria e campos de linha em 44.

### Alinhamento

**Tudo à esquerda.** Regra dura do sistema: o rótulo de um botão largo começa na borda esquerda do padding, nunca centralizado. Em `Btn`, trocar `alignItems: 'center'` por `'flex-start'` e `paddingHorizontal: SP.lg` → 18. Vale para "Anotar R$ 32,90", "Salvar", "Pronto", "Apagar tudo".

Exceção única: os rótulos da tab bar, que são centralizados por serem células iguais de uma grade.

### Sombra

Não existe. Nada flutua. `shadow*` e `elevation` ficam em zero em todos os componentes.

---

## Mudanças em `src/ui.tsx`

### `Card` vira seção

O maior ganho visual do PR. Hoje `Card` é uma caixa: fundo `#141922`, borda hairline, raio 16, padding 16. Vira uma **seção de largura total separada por régua**:

```
{ paddingHorizontal: 20, paddingVertical: 18,
  borderBottomWidth: 2, borderBottomColor: '#201e1d',
  backgroundColor: 'transparent', borderRadius: 0, gap: SP.md }
```

Sem fundo próprio, sem borda lateral, sem raio. A última seção de cada tela não leva régua.

A prop `tone` some. Onde havia `tone="warn"` / `tone="bad"`, o conteúdo carrega a cor (faixa vermelha, texto `accentInk`), não a moldura.

### `H` (título de seção) vira kicker

`fontSize: 13, fontWeight: '700'` → `fontSize: 12, fontWeight: '800', letterSpacing: 0.96, textTransform: 'uppercase', color: dim`. O `right` continua funcionando: o valor à direita fica em 15–20px peso 800, cor `text`.

### `Btn`

- `primary`: fundo `accent`, texto `onAccent`, peso 800, 17px, `minHeight: 56`, rótulo à esquerda.
- `ghost` (era fundo `card2`): borda de 1px em `line`, fundo transparente, texto `text`.
- `danger`: borda 1px `accent`, texto `accentInk`, fundo transparente.
- `disabled`: `opacity: 0.45` (regra do sistema), sem trocar de cor.
- Pressed: `primary` vai para `#dd2b0f` (`--color-accent-600`); `ghost`/`danger` recebem tinta de 7% do texto. O `opacity: 0.6` genérico de hoje sai.

### `Chip`

Raio 0, `minHeight: 44` (ou 56 nos atalhos do Resumo, que carregam duas linhas). Selecionado: fundo `accent`, texto `onAccent`, peso 800. Não selecionado: borda 1px `line`, fundo transparente, peso 600.

### `Input`

Raio 0, fundo `surface`, borda 1px `line`, `minHeight: 44`. `label` em 12px `dim`. Foco: borda `accent` (hoje não há estado de foco — adicionar).

### `Bar`

Raio 0. Trilho `lineSoft`, preenchimento **`text`** (tinta), não `accent`. Altura de 8 → 10.

### `Empty` e `Meta`

Sem mudança estrutural; só as cores novas.

---

## Telas

Todas as medidas conferem com `Redesenho Modernist.dc.html` num viewport de 390×844.

### 1. Resumo — `src/screens/Resumo.tsx`

**Cabeçalho fixo** (não rola): 14px vertical / 20px lateral, régua inferior de 2px. À esquerda o kicker "MINHAS CONTAS". À direita `‹ AGOSTO ›` — o mês em kicker de 13px/800, as setas em 20px `dimmer`, `hitSlop` 16.

**Seção 1 — o número.** Padding 24/20/20.
- Kicker: `DÁ PARA GASTAR ATÉ DIA 5`. O texto sai de `daysToPayday` como hoje, mas a formulação muda: em vez de "Faltam 9 dias para o salário" acima e "Dá para gastar" abaixo, uma linha só que junta as duas. Sem salário conhecido, cai para `DÁ PARA GASTAR EM AGOSTO`.
- Valor: 58px/800, `letterSpacing: -0.03em`, tinta. Negativo: mesmo tamanho, cor `accentInk`, kicker vira `VOCÊ JÁ PASSOU`.
- Abaixo, uma **régua de 1px e três células iguais** divididas por borda vertical de 1px: `por dia` / `ainda vai cair` / `guardado`. Rótulo 12px `dim`, valor 19px/800. Substitui as três frases soltas de hoje (`conselho` + `Meta` da reserva) — mesma informação, um terço do espaço, e comparável de relance.
- A célula `guardado` só aparece com `reserva > 0`; com duas células, cada uma ocupa metade.

**Seção 2 — Posso gastar?** Kicker, depois uma fileira de quatro células iguais de 56px: três atalhos de `typicalSpends` (rótulo 14px/800 + valor 13px sem "R$") e um `+` de 56×56 para outro valor. Selecionado = fundo `accent`.
- Resultado: veredicto em 30px/800 (`Pode.` / `Dá, mas aperta.` / `Melhor não.` / `Não dá.`) e a explicação em 15px/1.5 logo abaixo. `pode` em tinta; `aperta`, `risco` e `nao` em `accentInk`.
- Sem atalhos aprendidos, mantém o texto vazio de hoje.

**Seção 3 — A fatura.** Kicker `A FATURA, VENCE AMANHÃ` (o `dayLabel` entra no kicker) e o total em 20px/800 na mesma linha, à direita.
- Se `juros > 0`: **faixa vermelha cheia** logo abaixo, padding 10/12, texto `onAccent` — "R$ 48,70 disso foi só juros." em 15px/800 e "Esse dinheiro não virou nada." em 13px. É o único lugar do app onde o vermelho corre como campo.
- Depois, até três parcelas em linhas separadas por régua de 1px: descrição à esquerda, "faltam 9x de 189,90" à direita em 14px `dim`.

**Seção 4 — Ainda vai cair.** (Era "Ainda vai sair".) Kicker + total à direita em tinta, não amarelo. Linhas de 11px vertical com régua de 1px: descrição (flex 1) · dia (70px, `dim`) · valor (peso 600). Até 6.

**Seção 5 — Onde foi o dinheiro.** Igual em estrutura; barras em tinta, raio 0, altura 10, `gap` 10 entre categorias.

**Seção 6 — Os próximos meses.** Vira **lista de linhas**, não blocos: mês à esquerda (15px/800), faixa à direita (16px/800), régua de 1px entre elas. Faixa negativa em `accentInk`. Os valores perdem os centavos e o "R$" (`284 a 1.410`) — em linha, o que importa é a ordem de grandeza. A nota explicativa fica em 13px `dim` no fim. Sem régua de 2px depois (é a última seção).

### 2. Anotar — `src/screens/Adicionar.tsx`

A mudança de fluxo mais forte. Hoje: cartão de entrada + cartão de atalhos + cartão de conferência, tudo num `ScrollView`, com teclado do sistema cobrindo metade da tela. Passa a ser **uma tela que não rola**, dividida em faixas fixas.

De cima para baixo:

1. **Abas Saiu / Entrou** — duas células iguais de 52px, régua de 2px embaixo. Ativa: fundo `text`, texto `bg`. (Preto, não vermelho: é um seletor de modo, não a ação primária.) Trocar de aba limpa a categoria, como hoje.
2. **Valor** — kicker `QUANTO`, depois `R$` em 26px/800 `dimmer` e o número em **62px/800**, `letterSpacing: -0.03em`, tabular. Um cursor de 3×52px em `accent` à direita do número. Não é `TextInput`: é `Text`, alimentado pelo teclado próprio.
3. **Em quê** — kicker, chips de categoria em duas fileiras (as 6 de `cats`, mesma lógica de ordenação por uso), 44px, e abaixo um campo de nota opcional de 44px com placeholder "Um lembrete, se quiser".
4. **Teclado próprio** — grade 3×4 que ocupa o espaço restante (`flex: 1`), células divididas por régua de 1px `lineSoft`, dígitos em 26px/800: `1 2 3 / 4 5 6 / 7 8 9 / , 0 ←`. A tecla `←` em `accent`. Sem ponto de milhar: o usuário digita centavos e o formatador insere.
   Por que teclado próprio: o teclado do sistema em iOS cobre o botão de confirmar, empurra o layout e força `KeyboardAvoidingView`. Com grade própria, o valor, a categoria e o botão ficam visíveis ao mesmo tempo, e a tela deixa de rolar.
5. **Confirmar** — botão primário de 56px com o valor no rótulo: **"Anotar R$ 32,90"**. Desabilitado (opacity 0.45) enquanto o valor for zero. Abaixo, numa linha só: "Fica só neste aparelho, na hora." à esquerda em 13px `dim` e **"Mandar fatura →"** à direita em 13px/800 `accent`.

**O cartão "Atalhos" desaparece.** Vira aquele link de uma linha. "Escrever em vez de digitar o valor" sai da tela principal: abre pelo mesmo link ("Mandar fatura →" leva a uma folha com duas opções: escolher arquivo ou escrever). Motivo: o README diz que a conta é local e de graça e que a IA só lê documento — a interface dizia o contrário ao dar a ela um cartão do mesmo tamanho do caminho principal.

**O aviso "Ler documento precisa da chave em Ajustes" some daqui.** Ele aparece dentro da folha de importação, no momento em que é relevante.

### 3. Conferir — nova tela (extraída de `Adicionar.tsx`)

O bloco `preview` sai do fim do formulário e vira **tela cheia**, apresentada modalmente quando `extract()` retorna. Nada é gravado sem Salvar — a regra do repositório continua, só ganha o espaço que merece.

- **Cabeçalho:** kicker `FATURA DE AGOSTO` à esquerda, **Cancelar** em 13px/800 `accent` à direita. Régua de 2px.
- **Resumo do que foi lido:** título de 25px/800 — "Achei 23 compras." — e uma linha de corpo: "Confira os valores antes de salvar. Nada é gravado sem você tocar em Salvar." Depois régua de 1px e a linha `TOTAL` / `R$ 1.284,30` (26px/800).
- **Lista rolável:** cada item em 14/20, régua de 1px. Descrição 16px/600, meta 13px `dim` no formato `14/08 · Compras · 3 de 12` (note: **"3 de 12"**, não "3/12"). Valor num campo editável de 96×44 alinhado à direita, e um `×` de 28px para remover.
- **Linha de juros destacada:** fundo `accentTint`, descrição e valor em `accentInk`/800, meta "28/08 · não virou nada", borda do campo em `accent`. A regex `JUROS` de `budget.ts` já identifica esses itens; use a mesma.
- Fim da lista: "e mais 17 compras" em 13px `dim`.
- **Barra de ação fixa** (régua de 2px em cima): **"Salvar as 23"** primário à esquerda (rótulo conta os itens) e **"Jogar fora"** secundário ao lado.
- O aviso de divergência (`ExtractWarning`) entra como faixa vermelha cheia logo abaixo do título, com o botão "Lançar a diferença de X" como secundário dentro dela.

### 4. Extrato — `src/screens/Extrato.tsx`

- Cabeçalho igual ao do Resumo, com `EXTRATO` no lugar da marca.
- **Nova faixa de totais** logo abaixo, régua de 2px: duas células iguais divididas por borda vertical — `entrou` / `saiu`, rótulo 12px `dim` e valor 20px/800. Vem de `view.income` e da soma das despesas; hoje o mês só é somável dia a dia.
- **Cabeçalho de dia** deixa de ser título de cartão e vira **faixa de fundo `surface`** de largura total: `HOJE, 27/08` em kicker à esquerda, total do dia à direita em 13px/800 (`dim` quando negativo, `text` quando positivo). Régua de 1px `line` embaixo.
- **Linhas** em 13/20 com régua de 1px `lineSoft`: descrição 16px, meta 13px `dim`, valor 16px/600 à direita. Entrada em peso 800. Projetado (`proj:`) fica em `opacity: 0.55` e a meta termina em **"ainda vai cair"** (era "previsto").
- **Edição inline:** ao tocar, a linha é substituída por um bloco de fundo `surface`, padding 14/20: kicker `CORRIGINDO: PADARIA`, o valor em 34px/800 com `R$` em 18px `dimmer`, e dois botões de 48px — **Salvar** primário e **Apagar** com borda `accent`. Hoje isto é um `Input` com label "Valor" dentro de uma caixa arredondada; o valor grande deixa o alvo do polegar óbvio.

### 5. Ajustes — `src/screens/Ajustes.tsx`

A ordem inverte. Hoje abre em "Meu dinheiro" mas o assunto que domina a tela é a chave de API; agora a chave é a última coisa, descrita pelo que faz.

1. **Reserva** — título de 25px/800 **"Quanto você quer deixar parado"** (não "Meu dinheiro"), corpo explicando que sai do "dá para gastar". O campo vira **valor grande**: `R$` 20px `dimmer` + 42px/800, com régua de 2px embaixo em vez de caixa. Botão **Salvar** primário 56px.
2. **O que eu já sei de você** — kicker + três linhas de 12px com régua de 1px: `Salário cai todo dia · 5`, `Coisas anotadas · 128`, `Contas todo mês · 6`. Nota em 13px `dim`: "Descubro tudo isso sozinho pelo que você anota. Fica neste aparelho: não tem conta, não tem nuvem, e desinstalar apaga." Os dois primeiros vêm de `paydayOf` e `db.tx.length`; o terceiro é a contagem de `recurring`.
3. **Ler fatura e contracheque** — kicker pelo que faz, não por quem fornece. Corpo: "Ligado. Você paga só o que ler, direto à Anthropic. Anotar na mão funciona sem isso, e a conta do mês é feita aqui, de graça." A chave aparece **mascarada** numa caixa `surface` (`sk-ant-••••••••••4f2a`) com **Trocar** em `accent` à direita; o campo editável só aparece ao tocar em Trocar. Nota: "Quem tem o aparelho tem a chave."
   O acordeão "Avançado / Abrir / Fechar" some — era um cofre em volta de uma configuração de três linhas.
4. **Apagar tudo** — botão com borda `accent`, texto `accentInk`. Mantém a confirmação de dois toques; a nota "Precisa tocar duas vezes. Não tem backup." fica visível **antes** do primeiro toque, não só depois.

### 6. Começar — `src/screens/Comecar.tsx`

- **Poster vermelho** no topo, sem rolagem: fundo `accent`, padding 34/20/28. Kicker `MINHAS CONTAS` em `onAccent`, título de 40px/800 `letterSpacing: -0.025em` — "Duas perguntas e eu já sei quanto dá para gastar." — e corpo de 15px: "Nada sai deste aparelho. Não tem conta, não tem assinatura." É o "poster statement" do sistema, o único lugar do onboarding onde o vermelho corre como campo.
- **1 · Quanto entra por mês** — valor grande (42px/800) com régua de 2px, ajuda em 13px `dim`.
- **2 · Que dia cai** — deixa de ser digitação. Fileira de células de 56×48: `1 · 5 · 10 · 15 · 20 · outro`. Selecionada em `accent`. "Outro" abre o teclado numérico. Cobre a grande maioria dos casos com um toque.
- **Opcional · a maior conta fixa** — mesmo tratamento, em `--color-neutral-500` enquanto vazio, rotulada como opcional. Deixa de ser a terceira pergunta obrigatória: quem não sabe o valor do aluguel de cor trava aqui.
- **Rodapé fixo** com régua de 2px: **Pronto** primário 56px (habilitado com renda > 0) e **Pular por enquanto** em 14px/800 `accent`.

### Tab bar — `App.tsx`

Vira **grade de quatro células iguais**, 56px de altura, régua de 2px em cima e borda vertical de 1px `lineSoft` entre células. Rótulos em 13px caixa alta, `letterSpacing: 0.52` (0.04em). Ativa: **fundo `accent` inteiro**, texto `onAccent`, peso 800. Inativa: peso 600, cor `dim`.

O ponto de 20×3 embaixo do rótulo desaparece — a célula preenchida já é o indicador, e é visível de longe.

`SafeAreaView` e o `maxWidth: 640` do `frame` ficam como estão. O `KeyboardAvoidingView` pode sair de Anotar (teclado próprio), mas continua necessário em Ajustes e Começar.

---

## Interações e estados

| estado | tratamento |
|---|---|
| pressionado (primário) | fundo `#dd2b0f` |
| pressionado (secundário/ghost) | tinta de 7% do texto sobre o fundo |
| desabilitado | `opacity: 0.45`, sem troca de cor |
| foco (web) | borda `accent`; nunca o anel azul padrão |
| carregando | `ActivityIndicator` em `accent` dentro do botão, como hoje |
| erro | seção com faixa vermelha cheia e texto `onAccent`; sem borda colorida em volta |
| vazio | texto 15px `dim` dizendo o que fazer, como hoje |

Não há animação nova. Se quiser uma, que seja a transição de entrada de Conferir (slide de baixo, 240ms).

## Estado

Nenhum estado novo além de:
- `Adicionar`: o valor deixa de ser string de `TextInput` e passa a ser string montada pelo teclado próprio (mesmo parser: `replace(/\./g,'').replace(',','.')`).
- `Conferir`: `preview` sai de `Adicionar` e vira estado da nova tela (ou navegação com params).
- `Ajustes`: um booleano para "trocando a chave".
- `Comecar`: o dia vira seleção, com um caso "outro" que revela o campo.

`src/store.ts` não muda.

## Acessibilidade

O repositório é cuidadoso aqui — não regrida. Mantenha `accessibilityRole`, `accessibilityLabel`, `accessibilityState` e `accessibilityHint` em todo `Pressable`, incluindo as teclas do teclado próprio (cada uma é um botão com o rótulo do dígito) e as células de dia em Começar.

Contraste: `dim` (#605d5d) sobre `bg` (#f3f2f2) dá 6.4:1; `accentInk` (#ae1800) dá 6.0:1. **Nunca** use `accent` (#ec3013, ~3.4:1) em texto de corpo — só em preenchimento, em texto grande (≥19px/800) ou sobre `onAccent`.

## Assets

Nenhum novo. Ícones: o design atual não usa nenhum, e o redesenho também não — as setas `‹ › ← ×` são caracteres. Se for introduzir ícone, o sistema pede **Lucide**.

Os ícones de app em `assets/` continuam válidos; se quiser alinhá-los ao novo visual, é um item separado.

## Ordem sugerida do PR

Um PR só, mas nesta ordem de commits, porque cada passo deixa o app rodando:

1. `expo-font` + Archivo, e o gate de fonte em `App.tsx`.
2. Tokens em `src/ui.tsx`: tema único, raio 0, `TAP` 56, `Btn` à esquerda.
3. `Card` vira seção; `H` vira kicker. Aqui o app inteiro já muda de cara, com as telas ainda intactas.
4. Tab bar.
5. Resumo, Extrato, Ajustes, Começar — uma tela por commit.
6. Anotar + a extração de Conferir. Deixe por último: é a maior mudança estrutural.

`npm test` (`tests/budget.test.ts`, `tests/ai.test.ts`) deve continuar verde do começo ao fim — nenhum teste toca a UI, e é assim que se sabe que o motor não foi arranhado.

## Arquivos deste pacote

- `Redesenho Modernist.dc.html` — o design alvo (abrir no navegador)
- `Telas atuais.dc.html` — o estado de hoje, para comparação
- `_ds/modernist-5c4f9cfe-bed6-4bee-b38d-f10a55393ea3/styles.css` — tokens (fonte da verdade)
- `_ds/modernist-5c4f9cfe-bed6-4bee-b38d-f10a55393ea3/readme.md` — guia do design system
- `support.js` — runtime dos arquivos de design (não é código do app)
