import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { removeTx, updateTx, useDB } from '../store';
import {
  addMonths,
  brl,
  byDay,
  fullDayLabel,
  monthOf,
  monthView,
  shortMonthLabel,
  todayISO,
} from '../budget';
import { Btn, Empty, F, Kicker, Meta, PAD, SP, mono, useC } from '../ui';

const ORIGEM: Record<string, string> = {
  invoice: 'do cartão',
  bill: 'conta',
  payslip: 'contracheque',
  manual: 'anotado',
};

const curto = (n: number) => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Extrato() {
  const C = useC();
  const db = useDB();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [editando, setEditando] = useState('');
  const [rascunho, setRascunho] = useState('');

  const view = useMemo(() => monthView(db.tx, month, 0), [db.tx, month]);
  const dias = useMemo(() => byDay(view.items), [view.items]);
  const saiu = useMemo(
    () => view.items.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    [view.items]
  );

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
    <View style={{ flex: 1 }}>
      <View style={[st.head, { borderBottomColor: C.rule }]}>
        <Kicker>Extrato</Kicker>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
          <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={16} accessibilityRole="button" accessibilityLabel="Mês anterior">
            <Text style={{ color: C.dimmer, fontSize: 20 }}>‹</Text>
          </Pressable>
          <Text style={[F(800), { fontSize: 13, letterSpacing: 0.52, color: C.text }]}>
            {shortMonthLabel(month).toUpperCase()}
          </Text>
          <Pressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={16} accessibilityRole="button" accessibilityLabel="Próximo mês">
            <Text style={{ color: C.dimmer, fontSize: 20 }}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* totais do mês */}
      <View style={[st.totais, { borderBottomColor: C.rule }]}>
        <View style={{ flex: 1 }}>
          <Text style={[F(400), { fontSize: 12, color: C.dim }]}>entrou</Text>
          <Text style={[F(800), mono, { fontSize: 20, color: C.text }]}>{brl(view.income)}</Text>
        </View>
        <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: C.lineSoft, paddingLeft: SP.md }}>
          <Text style={[F(400), { fontSize: 12, color: C.dim }]}>saiu</Text>
          <Text style={[F(800), mono, { fontSize: 20, color: C.text }]}>{brl(saiu)}</Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {dias.length === 0 ? (
          <View style={{ padding: PAD }}>
            <Empty>Nada anotado neste mês. Toque em Anotar para começar.</Empty>
          </View>
        ) : (
          dias.map((d) => (
            <View key={d.date}>
              <View style={[st.dia, { backgroundColor: C.surface, borderBottomColor: C.line }]}>
                <Kicker>{fullDayLabel(d.date, today)}</Kicker>
                <Text style={[F(800), mono, { fontSize: 13, color: d.total >= 0 ? C.text : C.dim }]}>
                  {d.total >= 0 ? '+' : '−'}
                  {curto(d.total)}
                </Text>
              </View>

              {d.items.map((t) => {
                const previsto = t.id.startsWith('proj:');
                const aberto = editando === t.id;
                if (aberto)
                  return (
                    <View key={t.id} style={[st.editando, { backgroundColor: C.surface, borderBottomColor: C.lineSoft }]}>
                      <Kicker>Corrigindo: {t.description}</Kicker>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={[F(800), { fontSize: 18, color: C.dimmer }]}>R$</Text>
                        <TextInput
                          value={rascunho}
                          onChangeText={setRascunho}
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          autoFocus
                          accessibilityLabel="Valor"
                          selectionColor={C.accent}
                          style={[F(800), mono, { fontSize: 34, color: C.text, flex: 1, padding: 0 }]}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: SP.sm }}>
                        <Btn label="Salvar" size={48} onPress={() => salvar(t.id)} style={{ flex: 1 }} />
                        <Btn
                          label="Apagar"
                          kind="danger"
                          size={48}
                          onPress={() => {
                            removeTx(t.id);
                            setEditando('');
                          }}
                        />
                      </View>
                    </View>
                  );
                return (
                  <Pressable
                    key={t.id}
                    disabled={previsto}
                    onPress={() => abrir(t.id, t.amount)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.description}, ${brl(t.amount)}`}
                    accessibilityHint={previsto ? 'Ainda vai cair, não dá para editar' : 'Toque para corrigir'}
                    accessibilityState={{ disabled: previsto }}
                    style={({ pressed }) => [
                      st.linha,
                      { borderBottomColor: C.lineSoft },
                      previsto && { opacity: 0.55 },
                      pressed && { backgroundColor: 'rgba(32,30,29,0.07)' },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[F(400), { fontSize: 16, color: C.text }]} numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Meta>
                        {t.description.toLowerCase() === t.category.toLowerCase() ? '' : `${t.category} · `}
                        {t.installment ? `${t.installment.replace('/', ' de ')} · ` : ''}
                        {previsto ? 'ainda vai cair' : ORIGEM[t.source] ?? t.source}
                      </Meta>
                    </View>
                    <Text
                      style={[F(t.type === 'income' ? 800 : 600), mono, { fontSize: 16, color: C.text }]}>
                      {t.type === 'income' ? '+' : '−'}
                      {curto(t.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = {
  head: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: PAD,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  totais: { flexDirection: 'row' as const, paddingHorizontal: PAD, paddingVertical: 14, borderBottomWidth: 2 },
  dia: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: PAD,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  linha: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SP.md,
    paddingHorizontal: PAD,
    paddingVertical: 13,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  editando: { paddingHorizontal: PAD, paddingVertical: 14, gap: SP.md, borderBottomWidth: 1 },
};
