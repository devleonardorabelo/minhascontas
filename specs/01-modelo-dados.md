# SPEC 01 — Modelo de dados

Tudo mora numa chave só do AsyncStorage: `mc.v1`.

```ts
type DB = { tx: Tx[]; settings: Settings }
```

## Tx (lançamento)
```ts
type Tx = {
  id: string            // crypto.randomUUID()
  type: 'expense' | 'income'
  amount: number        // BRL, sempre POSITIVO. O sinal vem do type.
  date: string          // 'YYYY-MM-DD' — quando ACONTECEU (compra, competência)
  dueDate?: string      // 'YYYY-MM-DD' — quando o dinheiro SAI/ENTRA de fato
  description: string
  category: string      // de CATEGORIES (SPEC 02)
  source: 'manual' | 'invoice' | 'payslip' | 'bill'
  recurring?: boolean   // repete todo mês (salário, aluguel, assinatura)
  installment?: string  // '3/12' — parcela n de N
  batchId?: string      // id da importação, permite desfazer o lote inteiro
}
```

### Por que dois campos de data
Compra no cartão dia 03/09 que só é paga na fatura de 10/10 não pode virar
"gastei em setembro" no fluxo de caixa. `date` = 03/09 (para relatório por
categoria), `dueDate` = 10/10 (para "quanto sobra").

**Data efetiva = `dueDate ?? date`.** Todo o motor de orçamento usa a efetiva.
Fatura preenche `dueDate` = vencimento da fatura em todos os itens; conta/boleto
(`source: 'bill'`) preenche com o vencimento do boleto. Despesa manual não
preenche (`dueDate` fica indefinido, cai em `date`).

### amount é sempre positivo
Estorno/crédito na fatura vira `type: 'income'`, não valor negativo. Um único
sinal de verdade evita somas erradas.

## Settings
```ts
type Settings = {
  apiKey: string   // chave Anthropic do usuário, só neste aparelho
  reserva: number  // colchão em BRL que o app finge que não existe
}
```

## Migração
`mc.v1` no nome da chave. Versão nova = chave nova + função de migração; nunca
reescrever o formato in-place, porque o único backup do usuário é o aparelho.

## Invariantes
- `amount > 0`
- `date` e `dueDate` sempre `YYYY-MM-DD` (comparação de datas é `string <` — só
  funciona nesse formato, e é por isso que ele é obrigatório)
- `id` único; deletar é filtrar por id, nunca por índice
