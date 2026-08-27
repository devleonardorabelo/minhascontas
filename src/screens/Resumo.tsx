import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDB } from '../store';
import {
  addMonths,
  brl,
  canAfford,
  dailyRate,
  monthOf,
  monthView,
  futureInstallments,
  todayISO,
  eff,
  type Verdict,
} from '../budget';
import { Bar, Btn, C, Card, Empty, H, Input, mono } from '../ui';

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const s = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const dayLabel = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

const VERDICT: Record<Verdict, { title: string; color: string }> = {
  pode: { title: 'Pode.', color: C.good },
  aperta: { title: 'Dá, mas aperta.', color: C.warn },
  risco: { title: 'Melhor não.', color: C.warn },
  nao: { title: 'Não dá.', color: C.bad },
};

export default function Resumo() {
  const db = useDB();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [q, setQ] = useState('');

  const view = useMemo(
    () => monthView(db.tx, month, db.settings.reserva, today),
    [db.tx, month, db.settings.reserva, today]
  );
  const rate = useMemo(() => dailyRate(db.tx, today), [db.tx, today]);
  // Perspectiva: o mesmo motor rodado nos próximos meses. Salário e contas fixas
  // se repetem, parcelas já assumidas caem no mês certo.
  const proximos = useMemo(() => {
    const parcelas = new Map(futureInstallments(db.tx, month).map((p) => [p.month, p.total]));
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(month, i + 1);
      const v = monthView(db.tx, m, db.settings.reserva, today);
      return { month: m, free: v.free, income: v.income, committed: v.committed, parcelas: parcelas.get(m) ?? 0 };
    }).filter((p) => p.committed > 0 || p.income > 0);
  }, [db.tx, month, db.settings.reserva, today]);

  const amount = Number(q.replace(/\./g, '').replace(',', '.'));
  const sim = q && Number.isFinite(amount) && amount > 0 ? canAfford(amount, view, rate) : null;

  const maxCat = view.byCategory[0]?.total ?? 1;
  const freeColor = view.free < 0 ? C.bad : view.free < rate * view.daysLeft ? C.warn : C.good;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={12}>
          <Text style={{ color: C.dim, fontSize: 22 }}>‹</Text>
        </Pressable>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={12}>
          <Text style={{ color: C.dim, fontSize: 22 }}>›</Text>
        </Pressable>
      </View>

      <Card>
        <H>Livre para gastar</H>
        <Text style={[{ color: freeColor, fontSize: 40, fontWeight: '800' }, mono]}>
          {brl(view.free)}
        </Text>
        <Text style={[{ color: C.dim, fontSize: 13 }, mono]}>
          {view.daysLeft > 0
            ? `${brl(view.perDay)} por dia · ${view.daysLeft} ${view.daysLeft === 1 ? 'dia' : 'dias'} até o fim do mês`
            : 'Mês fechado'}
        </Text>
        {db.settings.reserva > 0 ? (
          <Text style={{ color: C.faint, fontSize: 12 }}>
            Reserva de {brl(db.settings.reserva)} já descontada.
          </Text>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="Entrou" value={view.income} color={C.good} />
        <Stat label="Já saiu" value={view.spent} color={C.text} />
        <Stat label="A pagar" value={view.committed} color={C.warn} />
      </View>

      <Card>
        <H>Posso gastar?</H>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input
              value={q}
              onChangeText={setQ}
              placeholder="0,00"
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
          {q ? <Btn label="Limpar" kind="ghost" onPress={() => setQ('')} /> : null}
        </View>
        {sim ? (
          <View style={{ gap: 6 }}>
            <Text style={{ color: VERDICT[sim.verdict].color, fontSize: 20, fontWeight: '800' }}>
              {VERDICT[sim.verdict].title}
            </Text>
            <Text style={[{ color: C.dim, fontSize: 13, lineHeight: 19 }, mono]}>
              {sim.freeAfter < 0
                ? `Você fica ${brl(-sim.freeAfter)} no vermelho neste mês.`
                : `Sobram ${brl(sim.freeAfter)} (${brl(sim.perDayAfter)} por dia).`}
              {rate > 0 && view.daysLeft > 0
                ? ` Seu ritmo dos últimos 30 dias pede ${brl(sim.needed)} até o fim do mês.`
                : ' Ainda não há histórico suficiente para prever o ritmo de gastos.'}
            </Text>
          </View>
        ) : (
          <Empty>Digite um valor para simular antes de gastar.</Empty>
        )}
      </Card>

      <Card>
        <H right={<Text style={[{ color: C.warn, fontSize: 13, fontWeight: '700' }, mono]}>{brl(view.committed)}</Text>}>
          Ainda vai sair
        </H>
        {view.upcoming.length === 0 ? (
          <Empty>Nada agendado até o fim do mês.</Empty>
        ) : (
          view.upcoming.slice(0, 8).map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: C.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
                <Text style={[{ color: C.faint }, mono]}>{dayLabel(eff(t))}  </Text>
                {t.description}
                {t.installment ? <Text style={{ color: C.faint }}>  {t.installment}</Text> : null}
              </Text>
              <Text style={[{ color: C.text, fontSize: 14 }, mono]}>{brl(t.amount)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <H>Para onde foi</H>
        {view.byCategory.length === 0 ? (
          <Empty>Sem saídas neste mês.</Empty>
        ) : (
          view.byCategory.map((c) => (
            <View key={c.category} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.text, fontSize: 14 }}>{c.category}</Text>
                <Text style={[{ color: C.dim, fontSize: 14 }, mono]}>{brl(c.total)}</Text>
              </View>
              <Bar value={c.total / maxCat} color={C.accent} />
            </View>
          ))
        )}
      </Card>

      {proximos.length > 0 ? (
        <Card>
          <H>Próximos meses</H>
          {proximos.map((p) => (
            <View
              key={p.month}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14 }}>{monthLabel(p.month)}</Text>
                <Text style={[{ color: C.faint, fontSize: 12 }, mono]}>
                  {brl(p.committed).replace('R$', '').trim()} a pagar
                  {p.parcelas > 0
                    ? ` · ${brl(p.parcelas).replace('R$', '').trim()} em parcelas`
                    : ''}
                </Text>
              </View>
              <Text style={[{ color: p.free < 0 ? C.bad : C.text, fontSize: 15, fontWeight: '700' }, mono]}>
                {brl(p.free)}
              </Text>
            </View>
          ))}
          <Text style={{ color: C.faint, fontSize: 12, lineHeight: 17 }}>
            Previsão: repete o que é mensal e soma as parcelas já assumidas. Não adivinha
            gasto novo.
          </Text>
        </Card>
      ) : null}

    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 6 }}>
      <Text style={{ color: C.dim, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>
        {label}
      </Text>
      <Text style={[{ color, fontSize: 15, fontWeight: '700' }, mono]} numberOfLines={1}>
        {brl(value).replace('R$', '').trim()}
      </Text>
    </Card>
  );
}
