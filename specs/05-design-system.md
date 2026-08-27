# SPEC 05 — Design system Modernist

Aplicado em 27/08/2026 a partir do handoff em
[design/handoff-modernist/](../design/handoff-modernist/), que é a fonte da
verdade visual. Este documento registra o que virou código, o que divergiu e por
quê.

O motor não mudou: `budget.ts`, `ai.ts` e `store.ts` estão intactos, e os 19
testes passaram do começo ao fim. É assim que se sabe que a reforma foi só de
pele e de fluxo.

## O sistema em cinco regras

1. **Um tema só, claro.** `useColorScheme()` não escolhe mais paleta. O argumento
   do [SPEC 04](04-ux.md) — ela usa o celular na rua, no sol — empurra para o
   claro, e o Modernist é um sistema claro por definição.
2. **Raio zero em tudo.** Nada é arredondado, nada flutua. `elevation` e
   `shadow*` ficam em 0.
3. **Régua no lugar de caixa.** `Card` deixou de ser um retângulo com fundo e
   virou uma seção de largura total separada por régua de 2px. É o que faz a
   hierarquia sobreviver a meio segundo de olhada.
4. **Um vermelho só.** `good`, `warn` e `bad` deixaram de existir. Positivo é
   tinta preta; negativo, juros e veredicto ruim são vermelhos.
5. **Tudo à esquerda.** Rótulo de botão largo começa na borda do padding. A única
   exceção são as células da tab bar, que são uma grade.

## Tokens

```ts
bg #f3f2f2 · surface #eae9e9 · lineSoft #d7d3d3 · line rgba(32,30,29,0.4) · rule #201e1d
text #201e1d · dim #605d5d · dimmer #7d7979
accent #ec3013 · accentSurface #ae1800 · accentInk #ae1800 · accentTint #fff2ef · onAccent #f3f2f2
SP 4/8/12/16/24/32 · PAD 20 · TAP 56 (44 em chip e campo de linha)
```

### A divergência do handoff, medida

O handoff pede `#ec3013` como fundo de texto pequeno — aba ativa, faixa de juros,
botão primário. Medido contra `onAccent`:

| par | razão | exigido |
|---|---|---|
| `#f3f2f2` sobre `#ec3013` | **3,76:1** | 4,5:1 (texto normal) |
| `#f3f2f2` sobre `#dd2b0f` | 4,25:1 | 4,5:1 |
| `#f3f2f2` sobre `#ae1800` | **6,41:1** | ✅ |

Nenhum degrau até `accent-600` passa. Como o próprio handoff manda não regredir
acessibilidade, **toda superfície vermelha usa `accent-700` (`#ae1800`)**, que é
uma cor do mesmo sistema — o degrau que ele já indica para texto vermelho.
`#ec3013` fica onde não há texto em cima: cursor do teclado, seleção de texto,
borda de foco.

Reverter é trocar `accentSurface` por `accent` em `src/ui.tsx`. Uma linha.

## Tipografia

**Archivo** 400 / 600 / 800, via `expo-font` + `@expo-google-fonts/archivo`.

**Fonte custom não sintetiza peso no React Native: peso é família.** Por isso
existe o helper `F(400 | 600 | 800)`, que devolve `fontFamily`. Usar
`fontWeight: '800'` com Archivo carregada não engorda nada — o texto sai fino e
ninguém percebe até comparar com o design.

O gate de render em `App.tsx` combina `useFonts` com o `ready` do store: sem isso
a primeira pintura sai na fonte do sistema e salta de família ao carregar.

Escala: herói 58 · valor digitado 62 · título de tela 40 · seção 25 · veredicto 30
· valor grande 42 · médio 19–26 · kicker 12/800 caixa alta `letterSpacing 0.96`
· corpo 15/400 `lineHeight 1.5` · item 16 · meta 13.

## Componentes (`src/ui.tsx`)

| | |
|---|---|
| `Card` | seção de largura total, régua de 2px embaixo. `last` tira a régua. A prop `tone` sumiu: cor mora no conteúdo, não na moldura |
| `Kicker` / `H` | rótulo 12/800 caixa alta; `H` aceita valor à direita |
| `Band` | faixa vermelha cheia. O único lugar onde o vermelho corre como campo |
| `Cells` | células iguais divididas por borda vertical (as três do Resumo, os totais do Extrato) |
| `Rule` | régua de 1px entre linhas de lista; `strong` para 2px |
| `Btn` | rótulo à esquerda, 19px/800, `minHeight` 56. Pressionado escurece; desabilitado é `opacity 0.45` sem trocar de cor |
| `Chip` | raio 0; selecionado = fundo `accentSurface` |
| `Bar` | raio 0, trilho `lineSoft`, preenchimento em tinta |

**O rótulo do botão primário subiu de 17px para 19px.** Não é gosto: 19px/800
conta como texto grande na WCAG, onde o mínimo é 3:1 — é o que mantém a cor viva
possível sobre vermelho.

## Fluxos que mudaram

- **Anotar não rola.** Teclado próprio de 3×4 na tela, porque o teclado do
  sistema cobre o botão de confirmar. Valor, categoria e botão ficam visíveis ao
  mesmo tempo. Cada tecla é um `Pressable` com `accessibilityLabel`.
- **O cartão "Atalhos" virou uma linha.** "Mandar fatura →" abre uma folha com as
  duas opções. A IA deixou de ter o mesmo peso visual do caminho principal — que
  é o que o README do projeto sempre disse.
- **Conferir virou tela cheia** (`src/screens/Conferir.tsx`), em `Modal`, com
  barra de ação fixa. A regra continua: nada é gravado sem tocar em Salvar.
- **Ajustes inverteu.** Abre na reserva; a chave é a última seção, mascarada,
  descrita pelo que faz. O acordeão "Avançado" sumiu.
- **Começar caiu para duas perguntas.** O dia do pagamento virou chips
  (1 · 5 · 10 · 15 · 20 · outro); o aluguel virou opcional, porque quem não sabe
  o valor de cor travava ali.

## Achados dos testes E2E (27/08/2026)

Bateria completa pelo navegador, com chave real. Quatro defeitos que só a
execução revelou:

1. **Dois `Modal` irmãos se atropelam no react-native-web.** A folha de
   importação e a tela Conferir eram ambas `Modal`. O Conferir montava no DOM —
   o texto estava lá — e não pintava: a leitura de fatura simplesmente não
   acontecia, sem erro nenhum. A folha virou overlay comum; **um portal só na
   árvore.**
2. **`adjustsFontSizeToFit` não funciona no react-native-web.** As três células do
   Resumo cortavam valores de três dígitos ("R$ 520,..."). Fonte para 17px e o
   "R$" saiu — o rótulo já diz o que é.
3. **`hitSlop` não vale no web.** Setas de mês mediam 8×23 e os links de texto,
   14px de altura. Entraram `Link` e `Seta` com área real; auditoria fechou em
   **zero alvos abaixo de 44px** nas cinco telas.
4. **Mês sem nada anotado exibia "Você já passou R$ 300"** — a reserva sozinha
   virando dívida. Verdade aritmética, mentira na vida dela. Virou estado vazio
   com o que fazer a seguir.

Também confirmado em execução: as três primeiras não aparecem no typecheck, nos
19 testes nem no `expo export`. Só rodando.

## O que não mudar

- `F(peso)` em vez de `fontWeight` em qualquer texto.
- Raio 0. Se aparecer um `borderRadius` no diff, é regressão.
- Cor só de `useC()`. Hex solto passa no typecheck e quebra o sistema.
- Superfície vermelha é `accentSurface`, nunca `accent` — ver a medição acima.
- O motor. Se um PR de UI mexer em `budget.ts` ou `ai.ts`, alguma coisa está errada.
