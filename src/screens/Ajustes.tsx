import { useState } from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import { saveSettings, useDB, wipe } from '../store';
import { brl } from '../budget';
import { Btn, C, Card, H, Input } from '../ui';

export default function Ajustes() {
  const db = useDB();
  const [key, setKey] = useState(db.settings.apiKey);
  const [reserva, setReserva] = useState(String(db.settings.reserva || ''));
  const [armed, setArmed] = useState(false);

  const salvar = () => {
    const n = Number(reserva.replace(/\./g, '').replace(',', '.'));
    saveSettings({ apiKey: key.trim(), reserva: Number.isFinite(n) ? n : 0 });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card>
        <H>Chave da Anthropic</H>
        <Text style={{ color: C.dim, fontSize: 13, lineHeight: 19 }}>
          O app não tem servidor nem conta. Você usa sua própria chave e paga só os tokens
          que gastar. Ela fica guardada só neste aparelho — quem tiver o aparelho tem a chave.
        </Text>
        <Input
          label="sk-ant-…"
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="cole aqui"
        />
        <Btn label="Salvar chave" onPress={salvar} />
        <Btn
          label="Pegar uma chave em console.anthropic.com"
          kind="ghost"
          onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
        />
      </Card>

      <Card>
        <H>Reserva</H>
        <Text style={{ color: C.dim, fontSize: 13, lineHeight: 19 }}>
          Valor que o app finge que não existe. Sai do "livre para gastar" e do simulador.
        </Text>
        <Input
          label="Guardar por mês"
          value={reserva}
          onChangeText={setReserva}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0,00"
        />
        <Btn label="Salvar reserva" onPress={salvar} />
      </Card>

      <Card>
        <H>Dados</H>
        <Text style={{ color: C.dim, fontSize: 13, lineHeight: 19 }}>
          {db.tx.length} lançamentos neste aparelho · reserva atual {brl(db.settings.reserva)}.
          Não há backup nem sincronia: desinstalar apaga tudo.
        </Text>
        <Btn
          label={armed ? 'Tocar de novo para apagar tudo' : 'Apagar todos os lançamentos'}
          kind="danger"
          onPress={() => {
            if (armed) {
              wipe();
              setArmed(false);
            } else setArmed(true);
          }}
        />
      </Card>
    </ScrollView>
  );
}
