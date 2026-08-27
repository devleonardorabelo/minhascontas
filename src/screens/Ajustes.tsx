import { useState } from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import { saveSettings, useDB, wipe } from '../store';
import { brl, paydayOf } from '../budget';
import { Btn, Card, H, Input, Meta, SP, useC } from '../ui';

export default function Ajustes() {
  const C = useC();
  const db = useDB();
  const [reserva, setReserva] = useState(String(db.settings.reserva || ''));
  const [key, setKey] = useState(db.settings.apiKey);
  const [avancado, setAvancado] = useState(false);
  const [armado, setArmado] = useState(false);
  const payday = paydayOf(db.tx);

  const salvarReserva = () => {
    const n = Number(reserva.replace(/\./g, '').replace(',', '.'));
    saveSettings({ reserva: Number.isFinite(n) && n > 0 ? n : 0 });
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      <Card>
        <H>Meu dinheiro</H>
        <Text style={{ color: C.dim, fontSize: 15, lineHeight: 22 }}>
          A reserva é o que você quer deixar parado. Some do "dá para gastar", então você não
          gasta sem querer.
        </Text>
        <Input
          value={reserva}
          onChangeText={setReserva}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0,00"
          label="Guardar por mês"
        />
        <Btn label="Salvar" onPress={salvarReserva} />
        <Meta>
          {payday
            ? `Seu salário cai todo dia ${payday}. Eu descubro isso sozinho pela sua entrada mensal.`
            : 'Assim que você anotar uma entrada mensal, eu descubro o dia do seu pagamento.'}
        </Meta>
      </Card>

      <Card>
        <H>Seus dados</H>
        <Text style={{ color: C.dim, fontSize: 15, lineHeight: 22 }}>
          {db.tx.length} {db.tx.length === 1 ? 'coisa anotada' : 'coisas anotadas'} · reserva de{' '}
          {brl(db.settings.reserva)}. Fica tudo neste aparelho: não tem conta, não tem nuvem, e
          desinstalar apaga.
        </Text>
        <Btn
          label={armado ? 'Toque de novo para apagar tudo' : 'Apagar tudo'}
          kind="danger"
          onPress={() => (armado ? (wipe(), setArmado(false)) : setArmado(true))}
          hint="Precisa tocar duas vezes"
        />
      </Card>

      <Card>
        <H
          right={
            <Text
              style={{ color: C.accent, fontSize: 15, fontWeight: '600' }}
              onPress={() => setAvancado((v) => !v)}
              accessibilityRole="button">
              {avancado ? 'Fechar' : 'Abrir'}
            </Text>
          }>
          Avançado
        </H>
        <Text style={{ color: C.dim, fontSize: 15, lineHeight: 22 }}>
          Ler fatura, conta e contracheque automaticamente precisa de uma chave da Anthropic.
          {db.settings.apiKey ? ' Já está configurada.' : ' Anotar na mão funciona sem ela.'}
        </Text>
        {avancado ? (
          <>
            <Input
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="sk-ant-…"
              label="Chave da Anthropic"
              help="Fica guardada só neste aparelho. Quem tiver o aparelho tem a chave. Você paga direto à Anthropic, só o que usar."
            />
            <Btn label="Salvar chave" onPress={() => saveSettings({ apiKey: key.trim() })} />
            <Btn
              label="Onde pegar uma chave"
              kind="ghost"
              onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
            />
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}
