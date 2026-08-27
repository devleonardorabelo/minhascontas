import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { addTx, newId, saveSettings } from '../store';
import { todayISO } from '../budget';
import { Btn, Card, H, Input, Meta, SP, useC } from '../ui';
import type { Tx } from '../types';

const num = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

/**
 * Três perguntas e o app já serve para alguma coisa. Sem isso a primeira tela é
 * R$ 0,00 em tudo, e ninguém descobre sozinho por onde começar. (SPEC 04, E10)
 */
export default function Comecar() {
  const C = useC();
  const [salario, setSalario] = useState('');
  const [dia, setDia] = useState('');
  const [aluguel, setAluguel] = useState('');

  const d = Math.min(Math.max(Number(dia) || 5, 1), 28);
  const hoje = todayISO();
  const mes = hoje.slice(0, 7);
  const dataSalario = `${mes}-${String(d).padStart(2, '0')}`;

  const pronto = () => {
    const novos: Tx[] = [];
    const s = num(salario);
    if (s > 0)
      novos.push({
        id: newId(),
        type: 'income',
        amount: s,
        date: dataSalario,
        description: 'Salário',
        category: 'Salário',
        source: 'manual',
        recurring: true,
      });
    const a = num(aluguel);
    if (a > 0)
      novos.push({
        id: newId(),
        type: 'expense',
        amount: a,
        date: dataSalario,
        description: 'Aluguel',
        category: 'Moradia',
        source: 'manual',
        recurring: true,
      });
    if (novos.length) addTx(novos);
    saveSettings({ onboarded: true });
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' }}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: SP.sm, marginBottom: SP.sm }}>
        <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', lineHeight: 34 }}>
          Vamos começar pelo básico
        </Text>
        <Text style={{ color: C.dim, fontSize: 16, lineHeight: 23 }}>
          Três perguntas e eu já consigo te dizer quanto dá para gastar. Nada sai deste aparelho.
        </Text>
      </View>

      <Card>
        <H>Quanto entra por mês</H>
        <Input
          value={salario}
          onChangeText={setSalario}
          placeholder="0,00"
          keyboardType="decimal-pad"
          inputMode="decimal"
          label="Salário ou renda fixa"
          help="Se varia, coloque o que costuma ser o mínimo."
        />
      </Card>

      <Card>
        <H>Que dia cai</H>
        <Input
          value={dia}
          onChangeText={setDia}
          placeholder="5"
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          label="Dia do mês"
          help="É por aqui que eu conto quantos dias faltam para o próximo pagamento."
        />
      </Card>

      <Card>
        <H>A maior conta fixa</H>
        <Input
          value={aluguel}
          onChangeText={setAluguel}
          placeholder="0,00"
          keyboardType="decimal-pad"
          inputMode="decimal"
          label="Aluguel ou prestação"
          help="Depois você acrescenta luz, água e o resto."
        />
      </Card>

      <Btn label="Pronto" onPress={pronto} disabled={num(salario) === 0} />
      <Btn label="Pular por enquanto" kind="ghost" onPress={() => saveSettings({ onboarded: true })} />
      <Meta>Dá para mudar tudo isso depois em Ajustes.</Meta>
    </ScrollView>
  );
}
