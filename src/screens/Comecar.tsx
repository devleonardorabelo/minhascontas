import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { addTx, newId, saveSettings } from '../store';
import { todayISO } from '../budget';
import { Btn, Chip, F, Kicker, Meta, PAD, Rule, SP, mono, useC } from '../ui';
import type { Tx } from '../types';

const num = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const DIAS = [1, 5, 10, 15, 20];

/** Duas perguntas obrigatórias. A terceira trava quem não sabe o aluguel de cor. */
export default function Comecar() {
  const C = useC();
  const [salario, setSalario] = useState('');
  const [dia, setDia] = useState(5);
  const [outroDia, setOutroDia] = useState(false);
  const [diaTexto, setDiaTexto] = useState('');
  const [aluguel, setAluguel] = useState('');

  const d = Math.min(Math.max(outroDia ? Number(diaTexto) || 5 : dia, 1), 28);
  const dataSalario = `${todayISO().slice(0, 7)}-${String(d).padStart(2, '0')}`;

  const pronto = () => {
    const novos: Tx[] = [];
    const s = num(salario);
    if (s > 0)
      novos.push({
        id: newId(), type: 'income', amount: s, date: dataSalario,
        description: 'Salário', category: 'Salário', source: 'manual', recurring: true,
      });
    const a = num(aluguel);
    if (a > 0)
      novos.push({
        id: newId(), type: 'expense', amount: a, date: dataSalario,
        description: 'Aluguel', category: 'Moradia', source: 'manual', recurring: true,
      });
    if (novos.length) addTx(novos);
    saveSettings({ onboarded: true });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* poster */}
      <View style={{ backgroundColor: C.accentSurface, paddingHorizontal: PAD, paddingTop: 34, paddingBottom: 28, gap: SP.md }}>
        <Text style={[F(800), { fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: C.onAccent }]}>
          Minhas contas
        </Text>
        <Text style={[F(800), { fontSize: 40, lineHeight: 44, letterSpacing: -1, color: C.onAccent }]}>
          Duas perguntas e eu já sei quanto dá para gastar.
        </Text>
        <Text style={[F(400), { fontSize: 15, lineHeight: 23, color: C.onAccent }]}>
          Nada sai deste aparelho. Não tem conta, não tem assinatura.
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: PAD, paddingVertical: 18, gap: SP.sm, borderBottomWidth: 2, borderBottomColor: C.rule }}>
          <Kicker>1 · Quanto entra por mês</Kicker>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SP.sm, borderBottomWidth: 2, borderBottomColor: C.rule, paddingBottom: SP.sm }}>
            <Text style={[F(800), { fontSize: 20, color: C.dimmer }]}>R$</Text>
            <TextInput
              value={salario}
              onChangeText={setSalario}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0,00"
              placeholderTextColor={C.dimmer}
              accessibilityLabel="Quanto entra por mês"
              selectionColor={C.accent}
              style={[F(800), mono, { fontSize: 42, color: C.text, flex: 1, padding: 0 }]}
            />
          </View>
          <Meta>Se varia, coloque o que costuma ser o mínimo.</Meta>
        </View>

        <View style={{ paddingHorizontal: PAD, paddingVertical: 18, gap: SP.md, borderBottomWidth: 2, borderBottomColor: C.rule }}>
          <Kicker>2 · Que dia cai</Kicker>
          <View style={{ flexDirection: 'row', gap: SP.sm, flexWrap: 'wrap' }}>
            {DIAS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                size={48}
                center
                style={{ width: 56 }}
                selected={!outroDia && dia === n}
                onPress={() => {
                  setDia(n);
                  setOutroDia(false);
                }}
              />
            ))}
            <Chip
              label="outro"
              size={48}
              center
              style={{ minWidth: 72 }}
              selected={outroDia}
              onPress={() => setOutroDia(true)}
            />
          </View>
          {outroDia ? (
            <TextInput
              value={diaTexto}
              onChangeText={setDiaTexto}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              placeholder="dia"
              placeholderTextColor={C.dimmer}
              accessibilityLabel="Outro dia do mês"
              selectionColor={C.accent}
              style={[F(800), mono, { fontSize: 28, color: C.text, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 12, minHeight: 48 }]}
            />
          ) : null}
        </View>

        <View style={{ paddingHorizontal: PAD, paddingVertical: 18, gap: SP.sm }}>
          <Kicker>Opcional · a maior conta fixa</Kicker>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SP.sm, borderBottomWidth: 2, borderBottomColor: C.lineSoft, paddingBottom: SP.sm }}>
            <Text style={[F(800), { fontSize: 20, color: C.dimmer }]}>R$</Text>
            <TextInput
              value={aluguel}
              onChangeText={setAluguel}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0,00"
              placeholderTextColor={C.dimmer}
              accessibilityLabel="Aluguel ou prestação"
              selectionColor={C.accent}
              style={[F(800), mono, { fontSize: 42, color: aluguel ? C.text : C.dimmer, flex: 1, padding: 0 }]}
            />
          </View>
          <Meta>Aluguel ou prestação. Dá para deixar em branco e acrescentar depois.</Meta>
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 2, borderTopColor: C.rule, paddingHorizontal: PAD, paddingVertical: 14, gap: SP.md }}>
        <Btn label="Pronto" onPress={pronto} disabled={num(salario) === 0} />
        <Text
          onPress={() => saveSettings({ onboarded: true })}
          accessibilityRole="button"
          style={[F(800), { fontSize: 14, color: C.accentInk }]}>
          Pular por enquanto
        </Text>
      </View>
    </View>
  );
}
