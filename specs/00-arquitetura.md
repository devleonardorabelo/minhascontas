# SPEC 00 — Arquitetura

## Objetivo
Assistente financeiro pessoal. Entra: fatura de cartão (PDF/foto), contracheque (PDF/foto),
despesa escrita em texto livre. Sai: visão de quanto sobra, e resposta direta a
"posso gastar X?".

## Restrições (dadas pelo usuário)
1. Custo = só token. Sem backend, sem servidor, sem assinatura.
2. Banco de dados = o próprio aparelho. Sem login, sem conta, sem sync.
3. Expo, rodando também na web.
4. IA barata.

## Consequências das restrições
- **Sem backend ⇒ BYOK.** A chave da Anthropic é do usuário, colada em Ajustes e
  guardada só no aparelho. O app nunca envia a chave para lugar nenhum além da API
  da Anthropic. É o único jeito de "custo = só token" sem servidor no meio.
- **Sem servidor ⇒ nenhum segredo é secreto.** Quem tem o aparelho tem a chave.
  Documentado na tela de Ajustes.
- **IA só onde texto vira dado.** Todo cálculo (saldo, projeção, veredicto
  "posso gastar?") é aritmética determinística em `src/budget.ts`, custo zero.
  A IA só faz extração: arquivo/frase → lista de lançamentos. Ver SPEC 02.

## Camadas
```
App.tsx                 navegação (4 abas, estado local, sem router)
src/types.ts            contratos de dado  ......... SPEC 01
src/store.ts            persistência AsyncStorage + store reativo
src/budget.ts           motor de orçamento (puro, testado) ....... SPEC 03
src/ai.ts               única chamada de API que existe .......... SPEC 02
src/ui.tsx              componentes e tokens visuais
src/screens/*.tsx       Resumo, Adicionar, Lançamentos, Ajustes
tests/budget.test.ts    node --test, sem framework
```

Regra de dependência: `screens → store/budget/ai → types`. `budget.ts` não importa
nada (função pura sobre arrays) — por isso é testável sem mock.

## Plataformas
| | iOS/Android | Web |
|---|---|---|
| Persistência | AsyncStorage (SQLite nativo) | AsyncStorage (localStorage) |
| Leitura de arquivo | `new File(uri).base64()` | `asset.uri` já vem `data:...;base64,` |
| Chamada da API | fetch nativo | fetch + `anthropic-dangerous-direct-browser-access` |

Único ponto com `Platform.OS`: `src/ai.ts → toBase64()`.

## Fora de escopo (e quando entra)
- Sync entre aparelhos / login → entra quando o usuário pedir mais de um aparelho.
- Open Banking / Pluggy → tem custo fixo mensal, viola a restrição 1.
- Metas, orçamento por categoria, gráfico histórico → depois de existir histórico real.
