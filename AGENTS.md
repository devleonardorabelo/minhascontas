# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# minhascontas — guia para sessões de IA

Leonardo não escreve código neste projeto. **Este repositório é a memória entre
sessões:** o que não estiver commitado e documentado aqui não existe na próxima
conversa.

## O que é

Assistente de finanças pessoais em PT-BR. Você manda a fatura do cartão, o
contracheque ou a conta de água; a IA lê e devolve lançamentos para conferir. A
tela responde "posso gastar isso?".

## Restrições invioláveis

Vieram do pedido original e mandam em quase toda decisão do projeto:

1. **Sem backend.** Nenhum servidor, nenhuma função serverless, nenhum proxy.
2. **Sem login.** Nenhuma conta, nenhum e-mail, nenhum OAuth.
3. **Dados só no aparelho.** AsyncStorage. Sem sync, sem nuvem.
4. **Custo = só token.** Nada de assinatura ou serviço pago no meio. É por isso
   que a chave da Anthropic é do próprio usuário (BYOK), colada em Ajustes.

Consequência prática: **Open Banking, Pluggy, Belvo e afins estão fora** — têm
custo fixo mensal. Se uma solução exigir servidor, ela está errada por definição.

## Antes de escrever código

Leia a spec da área que vai tocar. Elas registram o *porquê*, incluindo as
decisões descartadas e o número que as descartou:

| | |
|---|---|
| [specs/00-arquitetura.md](specs/00-arquitetura.md) | camadas, plataformas, o que está fora de escopo |
| [specs/01-modelo-dados.md](specs/01-modelo-dados.md) | o `Tx`, por que tem duas datas, invariantes |
| [specs/02-ia.md](specs/02-ia.md) | prompt, contrato da tool, custo, PDF protegido |
| [specs/03-orcamento.md](specs/03-orcamento.md) | projeção de recorrentes e parcelas, regra do veredicto |
| [specs/04-ux.md](specs/04-ux.md) | a persona, os 11 achados de UX, requisitos E1–E10 (aplicados) e a direção de UI |

## Mapa

```
App.tsx                 4 abas, estado local, sem router
src/types.ts            Tx, Settings, CATEGORIES
src/store.ts            AsyncStorage + useSyncExternalStore
src/budget.ts           motor de orçamento — puro, testado, zero token
src/ai.ts               a ÚNICA chamada de API do app
src/readFile.ts(.web)   base64 do arquivo, um por plataforma
src/ui.tsx              cores e componentes
src/screens/            Resumo, Adicionar, Lancamentos, Ajustes
tests/budget.test.ts    node --test, sem framework
```

Dependência: `screens → store/budget/ai → types`. `budget.ts` não importa nada em
runtime — é o que o torna testável sem mock.

## Comandos

```bash
npm run web          # também: ios, android
npm test             # motor de orçamento e contrato da chamada de API
npx tsc --noEmit     # typecheck
npx expo export --platform ios --platform android --platform web --output-dir /tmp/b
```

O `expo export` nas três plataformas é a verificação que pega o erro que o
typecheck não pega (ver armadilhas abaixo). Rode antes de dizer que terminou.

## Armadilhas já pagas

Cada uma custou uma sessão. Não reintroduza:

- **O SDK `@anthropic-ai/sdk` não empacota no React Native** — importa `node:fs`.
  Ele fica em `devDependencies` e entra **só como tipo** (`import type`); o
  runtime é `fetch`. Trocar para o SDK em runtime quebra o build nativo, e o
  typecheck passa mesmo assim.
- **`expo-document-picker` na web não devolve base64.** A doc diz que o default é
  `true`; o código usa `false`, e o `uri` vem como `blob:`. Por isso existem
  `readFile.ts` e `readFile.web.ts` separados.
- **O picker fica FORA do estado `busy`.** No web o evento de cancelar não volta,
  e o botão ficaria girando para sempre se o usuário desistisse.
- **Projeção não pode duplicar.** `projectRecurring` e `projectInstallments` só
  projetam se o lançamento real daquele mês ainda não chegou. Sem isso o salário
  conta duas vezes. Há teste para cada caso.
- **`amount` é sempre positivo.** O sinal vem do `type`. Estorno é `income`, não
  valor negativo.
- **A saída da IA é entrada não confiável.** Nada entra no banco sem passar pelo
  `toTx()` em `src/ai.ts`.
- **`expo-file-system` não roda na web** — nunca importe fora de `readFile.ts`.
- **`Platform.OS` é mentira no bundle web.** O Metro transpila o nosso
  `Platform.OS` para `Platform.default.OS` só no bundle web, e isso é `undefined`
  — a comparação não estoura, ela fica silenciosamente falsa. Já derrubou o header
  de CORS da API e quebrou a leitura de documentos inteira com "Failed to fetch".
  **Não condicione comportamento por plataforma dentro de um arquivo compartilhado.**
  Quando o comportamento realmente muda por plataforma, use arquivos separados
  (`arquivo.ts` / `arquivo.web.ts`), que é como `readFile` faz.
- **O header `anthropic-dangerous-direct-browser-access` vai sempre.** Sem ele o
  navegador barra a chamada no CORS; no nativo ele é inofensivo. Há teste.
- **Cor vem de `useC()`, nunca de hex na tela.** São dois temas, e toda combinação
  de texto sobre superfície foi medida em AA. Um hex solto passa no typecheck e
  quebra num dos temas — que é o bug que ninguém vê, porque ninguém testa os dois.
- **`TAP = 48` é piso, não sugestão.** Botão, chip, campo, linha tocável e aba.
- **Prompt de fatura é frágil.** Detalhar mais uma regra já derrubou a precisão de
  99,7% para 92% numa fatura real. Mexeu no prompt de `invoice`? Rode contra uma
  fatura de verdade e compare o total declarado antes de commitar. As quatro
  armadilhas conhecidas (próximas faturas, pagamento anterior, data sem ano, valor
  em dólar) estão em [specs/02-ia.md](specs/02-ia.md).

## Antes de mexer na interface

Leia [specs/04-ux.md](specs/04-ux.md). Toda mudança de UI deve citar o requisito
que atende (E1–E10, I1–I6) ou o achado que corrige (A–K). Mudança de UI sem
requisito é gosto pessoal, e gosto pessoal não sobrevive à próxima sessão.

A lista "o que não mudar" no fim da spec existe porque reforma de UI costuma
atropelar exatamente o que já estava certo.

## Fluxo de trabalho

1. Leia a spec da área.
2. Mude o código.
3. `npx tsc --noEmit`, `npm test`, e `expo export` nas três plataformas.
4. **Atualize a spec** se mudou uma decisão. Decisão descartada também vira
   documentação, com o número que a descartou.
5. **Commite.** Mensagens em português, no imperativo, com corpo explicando o
   *porquê* — o *o quê* já está no diff.

Passos 4 e 5 não são opcionais e não precisam ser pedidos.

## Onde a IA pode e não pode entrar

A IA faz **uma coisa**: documento ou frase → `Tx[]`. Ela não calcula saldo, não
dá conselho e não roda em background. Todo veredicto financeiro é aritmética em
`budget.ts`, de graça e determinística.

Se você está prestes a mandar uma pergunta do usuário para o modelo, provavelmente
é uma função pura disfarçada.
