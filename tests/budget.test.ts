import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthView,
  projectInstallments,
  projectRecurring,
  dailyRate,
  canAfford,
  futureInstallments,
  daysInMonth,
} from '../src/budget.ts';
import type { Tx } from '../src/types.ts';

const tx = (p: Partial<Tx> & Pick<Tx, 'type' | 'amount' | 'date'>): Tx => ({
  id: Math.random().toString(36).slice(2),
  description: 'x',
  category: 'Outros',
  source: 'manual',
  ...p,
});

test('usa a data efetiva (dueDate) e não a data da compra', () => {
  const compraSetPagaEmOut = tx({ type: 'expense', amount: 100, date: '2026-09-03', dueDate: '2026-10-10' });
  assert.equal(monthView([compraSetPagaEmOut], '2026-09', 0, '2026-09-15').spent, 0);
  assert.equal(monthView([compraSetPagaEmOut], '2026-10', 0, '2026-10-31').spent, 100);
});

test('separa o que já saiu do que está comprometido', () => {
  const txs = [
    tx({ type: 'income', amount: 5000, date: '2026-08-05' }),
    tx({ type: 'expense', amount: 300, date: '2026-08-10' }),
    tx({ type: 'expense', amount: 1200, date: '2026-08-25' }),
  ];
  const v = monthView(txs, '2026-08', 500, '2026-08-15');
  assert.equal(v.income, 5000);
  assert.equal(v.spent, 300);
  assert.equal(v.committed, 1200);
  assert.equal(v.free, 5000 - 300 - 1200 - 500);
  assert.equal(v.daysLeft, 31 - 15 + 1);
});

test('projeta recorrente para o mês seguinte', () => {
  const salario = tx({ type: 'income', amount: 4000, date: '2026-07-05', recurring: true, description: 'Salário' });
  const proj = projectRecurring([salario], '2026-08');
  assert.equal(proj.length, 1);
  assert.equal(proj[0].date, '2026-08-05');
  assert.equal(monthView([salario], '2026-08', 0, '2026-08-10').income, 4000);
});

test('não duplica quando o lançamento real do mês chega', () => {
  const jul = tx({ type: 'income', amount: 4000, date: '2026-07-05', recurring: true, description: 'Salário' });
  const ago = tx({ type: 'income', amount: 4200, date: '2026-08-05', recurring: true, description: 'salário ' });
  assert.equal(projectRecurring([jul, ago], '2026-08').length, 0);
  assert.equal(monthView([jul, ago], '2026-08', 0, '2026-08-10').income, 4200);
});

test('dia 31 vira o último dia do mês curto', () => {
  const aluguel = tx({ type: 'expense', amount: 900, date: '2026-01-31', recurring: true, description: 'Aluguel' });
  assert.equal(projectRecurring([aluguel], '2026-02')[0].date, '2026-02-28');
  assert.equal(daysInMonth('2026-02'), 28);
});

test('dailyRate ignora recorrentes e conta 30 dias', () => {
  const txs = [
    tx({ type: 'expense', amount: 300, date: '2026-08-10' }),
    tx({ type: 'expense', amount: 900, date: '2026-08-01', recurring: true }),
    tx({ type: 'expense', amount: 999, date: '2026-06-01' }),
  ];
  assert.equal(dailyRate(txs, '2026-08-15'), 10);
});

test('os quatro veredictos', () => {
  const v = monthView([tx({ type: 'income', amount: 1000, date: '2026-08-01' })], '2026-08', 0, '2026-08-22');
  assert.equal(v.free, 1000);
  assert.equal(v.daysLeft, 10); // needed = avgDaily * 10
  assert.equal(canAfford(1001, v, 10).verdict, 'nao');
  assert.equal(canAfford(0, v, 10).verdict, 'pode'); // sobra 1000, precisa de 100
  assert.equal(canAfford(920, v, 10).verdict, 'aperta'); // sobra 80, entre 60 e 100
  assert.equal(canAfford(960, v, 10).verdict, 'risco'); // sobra 40, abaixo de 60
});

test('parcelas futuras caem nos meses certos', () => {
  const netflix = tx({ type: 'expense', amount: 200, date: '2026-08-05', installment: '3/5' });
  assert.deepEqual(futureInstallments([netflix], '2026-08', 4), [
    { month: '2026-09', total: 200 },
    { month: '2026-10', total: 200 },
  ]);
});

test('parcela é projetada nos meses seguintes, com o número certo', () => {
  const tenis = tx({
    type: 'expense', amount: 200, date: '2026-08-05', dueDate: '2026-08-28',
    description: 'Tênis', installment: '2/5', source: 'invoice',
  });
  const set = projectInstallments([tenis], '2026-09');
  assert.equal(set.length, 1);
  assert.equal(set[0].installment, '3/5');
  assert.equal(set[0].amount, 200);
  assert.equal(projectInstallments([tenis], '2026-11')[0].installment, '5/5');
  assert.equal(projectInstallments([tenis], '2026-12').length, 0); // plano acabou
});

test('parcela futura entra no comprometido do mês', () => {
  const txs = [
    tx({ type: 'income', amount: 3000, date: '2026-08-05', recurring: true, description: 'Salário' }),
    tx({ type: 'expense', amount: 200, date: '2026-08-05', dueDate: '2026-08-28',
         description: 'Tênis', installment: '2/5', source: 'invoice' }),
  ];
  const set = monthView(txs, '2026-09', 0, '2026-08-27');
  assert.equal(set.income, 3000);
  assert.equal(set.committed, 200);
  assert.equal(set.free, 2800);
});

test('quando a fatura real do mês chega, a parcela não duplica', () => {
  const ago = tx({ type: 'expense', amount: 200, date: '2026-08-05', dueDate: '2026-08-28',
                   description: 'Tênis', installment: '2/5', source: 'invoice' });
  const set = tx({ type: 'expense', amount: 200, date: '2026-09-04', dueDate: '2026-09-28',
                   description: 'tênis ', installment: '3/5', source: 'invoice' });
  assert.equal(projectInstallments([ago, set], '2026-09').length, 0);
  assert.equal(monthView([ago, set], '2026-09', 0, '2026-08-27').committed, 200);
});

test('recorrente com parcela não conta duas vezes', () => {
  const t = tx({ type: 'expense', amount: 90, date: '2026-08-10', recurring: true,
                 installment: '1/3', description: 'Curso' });
  assert.equal(projectRecurring([t], '2026-09').length, 0);
  assert.equal(monthView([t], '2026-09', 0, '2026-08-27').committed, 90);
});
