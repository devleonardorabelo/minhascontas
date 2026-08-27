# SPEC 03 — Motor de orçamento

`src/budget.ts`. Funções puras sobre `Tx[]`. Zero token, zero I/O, zero React.
É o cérebro do app; a IA é só o escâner.

## Data efetiva
`eff(tx) = tx.dueDate ?? tx.date`. Toda janela de mês usa a efetiva (SPEC 01).

## Recorrentes: projeção, não materialização
Salário e aluguel não viram 12 linhas gravadas. `projectRecurring(txs, mês)`:

1. agrupa os `recurring` **sem parcela** por `type|description` (minúsculo, sem espaço nas pontas);
2. pega a ocorrência mais recente de cada grupo;
3. se a mais recente é anterior ao mês pedido **e** o grupo não tem nada nesse mês,
   gera um lançamento virtual (`id` prefixado `proj:`) no mesmo dia do mês,
   com o dia limitado ao último dia do mês (31 → 30 em novembro).

Virtual não é gravado. Some sozinho quando o lançamento real chega — é por isso
que a checagem do passo 3 existe, senão o mês contaria salário duas vezes.

## Parcelas: projeção, igual aos recorrentes
`projectInstallments(txs, mês)` faz para `installment` o que `projectRecurring`
faz para mensalidade. Sem isso, `"3/12"` só existia no mês da fatura importada e
setembro aparecia vazio — o app mentiria sobre quanto sobra.

1. agrupa por `descrição|total de parcelas` (o mesmo lugar pode ter dois planos abertos);
2. da ocorrência mais recente de cada plano, calcula `ahead = meses até o mês pedido`;
3. projeta se `1 <= ahead <= (total − parcela atual)`, renumerando (`2/6` em agosto
   vira `4/6` em outubro);
4. não projeta se a fatura real daquele mês já foi importada.

`recurring` e `installment` juntos seriam projetados duas vezes, então
`projectRecurring` ignora quem tem parcela: parcela tem fim, mensalidade não.

`futureInstallments` é só a soma de `projectInstallments` mês a mês — uma fonte
de verdade só, para o card não divergir do saldo.

## `monthView(txs, mês, reserva, hoje)`
| campo | conta |
|---|---|
| `income` | entradas do mês (reais + projetadas) |
| `spent` | saídas com data efetiva `<= hoje` |
| `committed` | saídas com data efetiva `> hoje` (fatura a vencer, aluguel, conta, parcela projetada) |
| `free` | `income - spent - committed - reserva` |
| `daysLeft` | dias restantes do mês, hoje incluído (mês passado: 0; futuro: mês inteiro) |
| `perDay` | `free / daysLeft` |
| `byCategory` | saídas agrupadas, maior primeiro |

`free` é o número da tela: o que sobra depois de pagar tudo que já está de pé e
de separar a reserva.

## `canAfford(valor, view, avgDaily)`
`avgDaily` = média diária das saídas **não recorrentes** dos últimos 30 dias
(`dailyRate`) — o ritmo de gasto solto do usuário.

```
freeAfter = free - valor
needed    = avgDaily * daysLeft      // o que o ritmo atual ainda vai consumir
```
| condição | veredicto |
|---|---|
| `freeAfter < 0` | **não** — estoura o mês |
| `freeAfter >= needed` | **pode** |
| `freeAfter >= needed * 0.6` | **aperta** |
| resto | **risco** — cabe hoje, falta no fim do mês |

Sem histórico, `avgDaily = 0` e tudo que cabe vira "pode". É honesto: o app não
inventa um padrão que não viu.

### Viés conservador, de propósito
Fatura do cartão importada entra em `committed` (compras passadas) e essas mesmas
compras também puxam o `dailyRate` para cima. O mesmo dinheiro pesa duas vezes e o
veredicto fica mais duro do que a realidade. Mantido: em conselho sobre dinheiro,
errar para o lado apertado é o erro barato.

## Perspectiva dos próximos meses
A tela Resumo roda `monthView` nos 6 meses seguintes. Não é um modelo separado:
é o mesmo motor com recorrentes e parcelas projetados. O que ele **não** faz é
adivinhar gasto novo — mês futuro só tem o que já está assumido, e o texto do
card diz isso para ninguém ler a sobra como se fosse dinheiro livre.

## Testes
`tests/budget.test.ts`, `node --test`, sem framework. Cobre: janela por data
efetiva, projeção de recorrente, não-duplicação quando o real chega, clamp de dia
31, as quatro faixas de veredicto, renumeração e fim de plano de parcela, parcela
futura entrando no comprometido, e parcela+recorrente sem contagem dupla.
