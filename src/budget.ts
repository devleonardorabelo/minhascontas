import type { Tx } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const monthOf = (iso: string) => iso.slice(0, 7);

/** Data que importa para fluxo de caixa: quando o dinheiro sai/entra. */
export const eff = (t: Tx) => t.dueDate ?? t.date;

export const daysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const monthIndex = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return y * 12 + (mo - 1);
};
export const monthsBetween = (from: string, to: string) => monthIndex(to) - monthIndex(from);

const sum = (ts: Tx[]) => ts.reduce((a, t) => a + t.amount, 0);

const groupKey = (t: Tx) => `${t.type}|${t.description.trim().toLowerCase()}`;

/**
 * Recorrentes não são gravados 12 vezes: são projetados sob demanda.
 * Se o lançamento real do mês já existe, não projeta (senão o salário conta dobrado).
 */
export function projectRecurring(txs: Tx[], month: string): Tx[] {
  const latest = new Map<string, Tx>();
  const seenInMonth = new Set<string>();
  for (const t of txs) {
    const k = groupKey(t);
    if (monthOf(eff(t)) === month) seenInMonth.add(k);
    // Parcela tem fim: quem projeta é projectInstallments, senão viraria eterna.
    if (!t.recurring || t.installment) continue;
    const cur = latest.get(k);
    if (!cur || eff(t) > eff(cur)) latest.set(k, t);
  }
  const out: Tx[] = [];
  for (const [k, t] of latest) {
    if (seenInMonth.has(k)) continue;
    if (monthOf(eff(t)) >= month) continue;
    const day = Math.min(Number(eff(t).slice(8, 10)), daysInMonth(month));
    out.push({ ...t, id: `proj:${t.id}:${month}`, date: `${month}-${pad(day)}`, dueDate: undefined });
  }
  return out;
}

/**
 * Parcelas futuras viram lançamentos virtuais no mês em que caem, do mesmo jeito
 * que os recorrentes. Sem isso, "3/12" só existia no mês da fatura importada e os
 * meses seguintes apareciam vazios — mentindo sobre quanto sobra em outubro.
 */
export function projectInstallments(txs: Tx[], month: string): Tx[] {
  // Chave = descrição + total de parcelas: o mesmo lugar pode ter dois planos abertos.
  const key = (t: Tx) =>
    `${t.description.trim().toLowerCase()}|${t.installment?.split('/')[1] ?? ''}`;

  const seen = new Set<string>();
  const latest = new Map<string, Tx>();
  for (const t of txs) {
    if (t.type !== 'expense' || !t.installment) continue;
    const k = key(t);
    if (monthOf(eff(t)) === month) seen.add(k);
    const cur = latest.get(k);
    if (!cur || eff(t) > eff(cur)) latest.set(k, t);
  }

  const out: Tx[] = [];
  for (const [k, t] of latest) {
    if (seen.has(k)) continue; // a fatura real do mês já chegou
    const [n, of] = t.installment!.split('/').map(Number);
    if (!n || !of || of <= n) continue;
    const ahead = monthsBetween(monthOf(eff(t)), month);
    if (ahead < 1 || ahead > of - n) continue; // fora do plano
    const day = Math.min(Number(eff(t).slice(8, 10)), daysInMonth(month));
    out.push({
      ...t,
      id: `proj:${t.id}:${month}`,
      installment: `${n + ahead}/${of}`,
      date: `${month}-${pad(day)}`,
      dueDate: undefined,
    });
  }
  return out;
}

export type MonthView = {
  month: string;
  income: number;
  spent: number;
  committed: number;
  reserva: number;
  free: number;
  daysLeft: number;
  perDay: number;
  byCategory: { category: string; total: number }[];
  upcoming: Tx[];
  items: Tx[];
};

export function monthView(
  txs: Tx[],
  month: string,
  reserva = 0,
  today = todayISO()
): MonthView {
  const items = [
    ...txs.filter((t) => monthOf(eff(t)) === month),
    ...projectRecurring(txs, month),
    ...projectInstallments(txs, month),
  ].sort((a, b) => eff(a).localeCompare(eff(b)));

  const income = sum(items.filter((t) => t.type === 'income'));
  const exp = items.filter((t) => t.type === 'expense');
  const spent = sum(exp.filter((t) => eff(t) <= today));
  const upcoming = exp.filter((t) => eff(t) > today);
  const committed = sum(upcoming);
  const free = income - spent - committed - reserva;

  const total = daysInMonth(month);
  const curMonth = monthOf(today);
  const daysLeft =
    month < curMonth ? 0 : month > curMonth ? total : total - Number(today.slice(8, 10)) + 1;

  const cats = new Map<string, number>();
  for (const t of exp) cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);

  return {
    month,
    income,
    spent,
    committed,
    reserva,
    free,
    daysLeft,
    perDay: daysLeft > 0 ? free / daysLeft : free,
    byCategory: [...cats].map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
    upcoming,
    items,
  };
}

/** Ritmo de gasto solto: média diária das saídas não recorrentes dos últimos 30 dias. */
export function dailyRate(txs: Tx[], today = todayISO()) {
  const [y, m, d] = today.split('-').map(Number);
  const from = todayISO(new Date(y, m - 1, d - 29));
  const recent = txs.filter(
    (t) => t.type === 'expense' && !t.recurring && t.date >= from && t.date <= today
  );
  return sum(recent) / 30;
}

export type Verdict = 'pode' | 'aperta' | 'risco' | 'nao';

export function canAfford(amount: number, view: MonthView, avgDaily: number) {
  const freeAfter = view.free - amount;
  const needed = avgDaily * view.daysLeft;
  const verdict: Verdict =
    freeAfter < 0 ? 'nao'
    : freeAfter >= needed ? 'pode'
    : freeAfter >= needed * 0.6 ? 'aperta'
    : 'risco';
  return {
    verdict,
    freeAfter,
    needed,
    perDayAfter: view.daysLeft > 0 ? freeAfter / view.daysLeft : freeAfter,
  };
}

/** Quanto de parcela cai em cada um dos próximos meses. */
export function futureInstallments(txs: Tx[], from: string, months = 6) {
  const out: { month: string; total: number }[] = [];
  for (let i = 1; i <= months; i++) {
    const month = addMonths(from, i);
    const total = sum(projectInstallments(txs, month));
    if (total > 0) out.push({ month, total });
  }
  return out;
}

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─────────────────────────────────────────────────────────────────────────────
// Formatação em português (SPEC 04, achado F)
// ─────────────────────────────────────────────────────────────────────────────

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const asDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${MESES[m - 1]} de ${y}`;
};

export const shortMonthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${MESES[m - 1]}${y !== new Date().getFullYear() ? ` de ${y}` : ''}`;
};

/** "hoje", "ontem", "quinta", ou "20/08". Sem Intl: o ICU do Android é irregular. */
export function dayLabel(iso: string, today = todayISO()) {
  const diff = Math.round((asDate(iso).getTime() - asDate(today).getTime()) / 864e5);
  if (diff === 0) return 'hoje';
  if (diff === -1) return 'ontem';
  if (diff === 1) return 'amanhã';
  if (diff > -7 && diff < 7) return DIAS[asDate(iso).getDay()];
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Cabeçalho de dia no extrato: "Hoje, 27/08" / "Quarta, 19/08". */
export function fullDayLabel(iso: string, today = todayISO()) {
  const dm = `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const rel = dayLabel(iso, today);
  // Longe da janela relativa, dayLabel já devolve a data: aí usa o dia da semana.
  const nome = rel === dm ? DIAS[asDate(iso).getDay()] : rel;
  return `${nome.charAt(0).toUpperCase() + nome.slice(1)}, ${dm}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// A janela dela vai de pagamento a pagamento, não do dia 1 ao 31 (achado B)
// ─────────────────────────────────────────────────────────────────────────────

/** Dia do mês em que o salário cai, deduzido da entrada recorrente mais recente. */
export function paydayOf(txs: Tx[]): number | null {
  const inc = txs.filter((t) => t.type === 'income' && t.recurring);
  if (!inc.length) return null;
  const last = inc.reduce((a, b) => (eff(a) > eff(b) ? a : b));
  return Number(eff(last).slice(8, 10));
}

/** Dias até o próximo pagamento, hoje incluído. `null` quando não há salário conhecido. */
export function daysToPayday(txs: Tx[], today = todayISO()): number | null {
  const p = paydayOf(txs);
  if (!p) return null;
  const day = Number(today.slice(8, 10));
  const thisMonth = monthOf(today);
  const here = Math.min(p, daysInMonth(thisMonth));
  if (day < here) return here - day;
  const next = addMonths(thisMonth, 1);
  return daysInMonth(thisMonth) - day + Math.min(p, daysInMonth(next));
}

// ─────────────────────────────────────────────────────────────────────────────
// Atalhos aprendidos: ela não sabe quanto custa "ir ao mercado" (achado H)
// ─────────────────────────────────────────────────────────────────────────────

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * As categorias variáveis que ela mais repete, com o valor mediano de cada uma.
 * Mediana e não média: uma compra de mês inteiro não pode distorcer o atalho.
 */
export function typicalSpends(txs: Tx[], today = todayISO(), limit = 3) {
  const [y, m, d] = today.split('-').map(Number);
  const from = todayISO(new Date(y, m - 1, d - 89));
  const byCat = new Map<string, number[]>();
  for (const t of txs) {
    if (t.type !== 'expense' || t.recurring || t.installment) continue;
    if (t.date < from || t.date > today) continue;
    byCat.set(t.category, [...(byCat.get(t.category) ?? []), t.amount]);
  }
  return [...byCat]
    .filter(([, v]) => v.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([category, v]) => ({ category, amount: Math.round(median(v)) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// A fatura é uma coisa só na cabeça dela, não sete categorias (achado E)
// ─────────────────────────────────────────────────────────────────────────────

const JUROS = /juros|encargo|iof|mora|rotativ|multa|anuidade|financiad/i;

export function cardInvoice(txs: Tx[], month: string) {
  const items = txs.filter((t) => t.source === 'invoice' && monthOf(eff(t)) === month);
  if (!items.length) return null;
  const total = items.reduce((a, t) => a + (t.type === 'income' ? -t.amount : t.amount), 0);
  const juros = items
    .filter((t) => t.type === 'expense' && JUROS.test(t.description))
    .reduce((a, t) => a + t.amount, 0);
  const parcelas = items
    .filter((t) => t.installment)
    .map((t) => {
      const [n, of] = t.installment!.split('/').map(Number);
      return { description: t.description, amount: t.amount, restantes: of - n };
    })
    .filter((p) => p.restantes > 0)
    .sort((a, b) => b.amount * b.restantes - a.amount * a.restantes);
  return { total, juros, parcelas, due: eff(items[0]), count: items.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Previsão honesta: faixa, não número único (achado D)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `otimista` é o que o motor projeta hoje: só recorrentes e parcelas.
 * `pessimista` desconta o ritmo de gasto solto dos últimos 30 dias — que é o que
 * de fato acontece todo mês. Mostrar só o otimista convida a planejar em cima de
 * uma sobra que não existe.
 */
export function forecast(txs: Tx[], month: string, reserva = 0, today = todayISO()) {
  const v = monthView(txs, month, reserva, today);
  const variavel = dailyRate(txs, today) * daysInMonth(month);
  return {
    month,
    income: v.income,
    committed: v.committed,
    variavel,
    otimista: v.free,
    pessimista: v.free - variavel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extrato agrupado por dia (achado F / requisito I1)
// ─────────────────────────────────────────────────────────────────────────────

export function byDay(items: Tx[]) {
  const map = new Map<string, Tx[]>();
  for (const t of items) {
    const k = eff(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      items: list,
      total: list.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0),
    }));
}
