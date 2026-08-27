import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { removeTx, useDB } from '../store';
import { addMonths, brl, eff, monthOf, monthView, todayISO } from '../budget';
import { C, Card, Empty, H, mono } from '../ui';

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const s = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SOURCE: Record<string, string> = {
  invoice: 'fatura',
  bill: 'conta',
  payslip: 'contracheque',
  manual: 'manual',
};

export default function Lancamentos() {
  const db = useDB();
  const [month, setMonth] = useState(monthOf(todayISO()));
  const [armed, setArmed] = useState('');

  const view = useMemo(() => monthView(db.tx, month, 0), [db.tx, month]);
  const items = useMemo(() => [...view.items].reverse(), [view.items]);

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
        <H right={<Text style={[{ color: C.dim, fontSize: 13 }, mono]}>{items.length}</Text>}>
          Lançamentos
        </H>
        {items.length === 0 ? (
          <Empty>Nada neste mês.</Empty>
        ) : (
          items.map((t) => {
            const proj = t.id.startsWith('proj:');
            const isArmed = armed === t.id;
            return (
              <Pressable
                key={t.id}
                disabled={proj}
                onPress={() => {
                  if (isArmed) {
                    removeTx(t.id);
                    setArmed('');
                  } else setArmed(t.id);
                }}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  paddingVertical: 8,
                  opacity: proj ? 0.55 : 1,
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isArmed ? C.bad : C.text, fontSize: 14 }} numberOfLines={1}>
                    {isArmed ? 'Tocar de novo para apagar' : t.description}
                  </Text>
                  <Text style={[{ color: C.faint, fontSize: 12 }, mono]}>
                    {eff(t)} · {t.category}
                    {t.installment ? ` · ${t.installment}` : ''}
                    {proj ? ' · previsto' : ` · ${SOURCE[t.source] ?? t.source}`}
                  </Text>
                </View>
                <Text
                  style={[{ color: t.type === 'income' ? C.good : C.text, fontSize: 14 }, mono]}>
                  {t.type === 'income' ? '+' : '−'}
                  {brl(t.amount).replace('R$', '').trim()}
                </Text>
              </Pressable>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}
