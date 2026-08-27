import { useMemo, useState } from 'react';
import { Linking, ScrollView, Text, TextInput, View } from 'react-native';
import { saveSettings, useDB, wipe } from '../store';
import { brl, paydayOf } from '../budget';
import { Btn, Card, F, Input, Kicker, Link, Meta, Rule, SP, mono, useC } from '../ui';

export default function Ajustes() {
  const C = useC();
  const db = useDB();
  const [reserva, setReserva] = useState(String(db.settings.reserva || '').replace('.', ','));
  const [key, setKey] = useState('');
  const [trocando, setTrocando] = useState(false);
  const [armado, setArmado] = useState(false);

  const payday = paydayOf(db.tx);
  const mensais = useMemo(() => new Set(db.tx.filter((t) => t.recurring).map((t) => t.description.trim().toLowerCase())).size, [db.tx]);
  const mascara = db.settings.apiKey
    ? `sk-ant-••••••••••${db.settings.apiKey.slice(-4)}`
    : null;

  const salvarReserva = () => {
    const n = Number(reserva.replace(/\./g, '').replace(',', '.'));
    saveSettings({ reserva: Number.isFinite(n) && n > 0 ? n : 0 });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* 1 — reserva */}
      <Card style={{ paddingTop: 24 }}>
        <Text style={[F(800), { fontSize: 25, lineHeight: 30, color: C.text }]}>
          Quanto você quer deixar parado
        </Text>
        <Text style={[F(400), { fontSize: 15, lineHeight: 23, color: C.dim }]}>
          Sai do "dá para gastar", então você não gasta sem querer.
        </Text>
        <View style={[st.valorao, { borderBottomColor: C.rule }]}>
          <Text style={[F(800), { fontSize: 20, color: C.dimmer }]}>R$</Text>
          <TextInput
            value={reserva}
            onChangeText={setReserva}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0,00"
            placeholderTextColor={C.dimmer}
            accessibilityLabel="Quanto guardar por mês"
            selectionColor={C.accent}
            style={[F(800), mono, { fontSize: 42, color: C.text, flex: 1, padding: 0 }]}
          />
        </View>
        <Btn label="Salvar" onPress={salvarReserva} />
      </Card>

      {/* 2 — o que o app já sabe */}
      <Card>
        <Kicker>O que eu já sei de você</Kicker>
        <View>
          {[
            ['Salário cai todo dia', payday ? String(payday) : '—'],
            ['Coisas anotadas', String(db.tx.length)],
            ['Contas todo mês', String(mensais)],
          ].map(([k, v], i) => (
            <View key={k}>
              {i > 0 ? <Rule /> : null}
              <View style={st.linha}>
                <Text style={[F(400), { fontSize: 15, color: C.text, flex: 1 }]}>{k}</Text>
                <Text style={[F(800), mono, { fontSize: 15, color: C.text }]}>{v}</Text>
              </View>
            </View>
          ))}
        </View>
        <Meta>
          Descubro tudo isso sozinho pelo que você anota. Fica neste aparelho: não tem conta, não
          tem nuvem, e desinstalar apaga.
        </Meta>
      </Card>

      {/* 3 — leitura de documento */}
      <Card>
        <Kicker>Ler fatura e contracheque</Kicker>
        <Text style={[F(400), { fontSize: 15, lineHeight: 23, color: C.dim }]}>
          {mascara
            ? 'Ligado. Você paga só o que ler, direto à Anthropic. Anotar na mão funciona sem isso, e a conta do mês é feita aqui, de graça.'
            : 'Desligado. Anotar na mão funciona sem isso, e a conta do mês é feita aqui, de graça. Ligando, você paga só o que ler, direto à Anthropic.'}
        </Text>

        {mascara && !trocando ? (
          <View style={[st.chave, { backgroundColor: C.surface, borderColor: C.line }]}>
            <Text style={[F(400), mono, { fontSize: 15, color: C.text, flex: 1 }]} numberOfLines={1}>
              {mascara}
            </Text>
            <Link label="Trocar" onPress={() => setTrocando(true)} />
          </View>
        ) : (
          <>
            <Input
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="sk-ant-…"
              label="CHAVE"
            />
            <Btn
              label="Salvar chave"
              onPress={() => {
                saveSettings({ apiKey: key.trim() });
                setKey('');
                setTrocando(false);
              }}
              disabled={!key.trim()}
            />
            <Btn
              label="Onde pegar uma chave"
              kind="ghost"
              onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
            />
          </>
        )}
        <Meta>Quem tem o aparelho tem a chave.</Meta>
      </Card>

      {/* 4 — apagar */}
      <Card last>
        <Kicker>Apagar tudo</Kicker>
        <Meta>Precisa tocar duas vezes. Não tem backup.</Meta>
        <Btn
          label={armado ? 'Toque de novo para apagar' : `Apagar as ${db.tx.length} coisas anotadas`}
          kind="danger"
          onPress={() => (armado ? (wipe(), setArmado(false)) : setArmado(true))}
        />
        <Meta>Reserva atual: {brl(db.settings.reserva)}.</Meta>
      </Card>
    </ScrollView>
  );
}

const st = {
  valorao: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: SP.sm,
    borderBottomWidth: 2,
    paddingBottom: SP.sm,
  },
  linha: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, gap: SP.md },
  chave: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SP.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
};
