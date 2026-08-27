import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { removeTx, updateTx, useDB } from '../store';
import { addMonths, brl, byDay, eff, fullDayLabel, monthLabel, monthOf, monthView, todayISO } from '../budget';
import { Btn, Card, Empty, H, Input, Meta, SP, mono, useC } from '../ui';

const ORIGEM: Record<string, string> = {
  invoice: 'do cartão',
  bill: 'conta',
  payslip: 'contracheque',
  manual: 'anotado',
};

export default function Extrato() {
  const C = useC();
  const db = useDB();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [editando, setEditando] = useState('');
  const [rascunho, setRascunho] = useState('');

  const view = useMemo(() => monthView(db.tx, month, 0), [db.tx, month]);
  const dias = useMemo(() => byDay(view.items), [view.items]);

  const abrir = (id: string, amount: number) => {
    setEditando(id);
    setRascunho(String(amount).replace('.', ','));
  };

  const salvar = (id: string) => {
    const n = Number(rascunho.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) updateTx(id, { amount: Math.round(n * 100) / 100 });
    setEditando('');
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => setMonth(addMonths(month, -1))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior">
          <Text style={{ color: C.dim, fontSize: 26, paddingHorizontal: SP.sm }}>‹</Text>
        </Pressable>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{monthLabel(month)}</Text>
        <Pressable
          onPress={() => setMonth(addMonths(month, 1))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês">
          <Text style={{ color: C.dim, fontSize: 26, paddingHorizontal: SP.sm }}>›</Text>
        </Pressable>
      </View>

      {dias.length === 0 ? (
        <Card>
          <Empty>Nada anotado neste mês. Toque em Anotar para começar.</Empty>
        </Card>
      ) : (
        dias.map((d) => (
          <Card key={d.date}>
            <H
              right={
                <Text
                  style={[
                    { color: d.total >= 0 ? C.good : C.dim, fontSize: 15, fontWeight: '700' },
                    mono,
                  ]}>
                  {d.total >= 0 ? '+' : '−'}
                  {brl(Math.abs(d.total)).replace('R$', '').trim()}
                </Text>
              }>
              {fullDayLabel(d.date, today)}
            </H>

            {d.items.map((t) => {
              const previsto = t.id.startsWith('proj:');
              const aberto = editando === t.id;
              return (
                <View key={t.id} style={{ gap: SP.sm }}>
                  <Pressable
                    disabled={previsto}
                    onPress={() => (aberto ? setEditando('') : abrir(t.id, t.amount))}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.description}, ${brl(t.amount)}`}
                    accessibilityHint={previsto ? 'Previsto, não dá para editar' : 'Toque para editar'}
                    accessibilityState={{ expanded: aberto, disabled: previsto }}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        gap: SP.md,
                        alignItems: 'center',
                        minHeight: 48,
                        opacity: previsto ? 0.6 : 1,
                      },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 16 }} numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Meta>
                        {t.description.toLowerCase() === t.category.toLowerCase()
                          ? ''
                          : `${t.category} · `}
                        {t.installment ? `${t.installment} · ` : ''}
                        {previsto ? 'previsto' : ORIGEM[t.source] ?? t.source}
                      </Meta>
                    </View>
                    <Text
                      style={[
                        { color: t.type === 'income' ? C.good : C.text, fontSize: 16, fontWeight: '600' },
                        mono,
                      ]}>
                      {t.type === 'income' ? '+' : '−'}
                      {brl(t.amount).replace('R$', '').trim()}
                    </Text>
                  </Pressable>

                  {aberto ? (
                    <View
                      style={{
                        gap: SP.sm,
                        padding: SP.md,
                        borderRadius: 12,
                        backgroundColor: C.card2,
                      }}>
                      <Input
                        value={rascunho}
                        onChangeText={setRascunho}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        label="Valor"
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: SP.sm }}>
                        <Btn label="Salvar" onPress={() => salvar(t.id)} style={{ flex: 1 }} />
                        <Btn
                          label="Apagar"
                          kind="danger"
                          onPress={() => {
                            removeTx(t.id);
                            setEditando('');
                          }}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
