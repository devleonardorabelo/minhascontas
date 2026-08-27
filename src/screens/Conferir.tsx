import { ScrollView, Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native';
import { brl } from '../budget';
import { Band, Btn, F, Kicker, Meta, PAD, Rule, SP, mono, useC } from '../ui';
import type { ExtractWarning } from '../ai';
import type { Tx } from '../types';

const JUROS = /juros|encargo|iof|mora|rotativ|multa|anuidade|financiad|diferença/i;
const MOSTRA = 6;

/**
 * Tela cheia: a conferência saiu do fim de um formulário e ganhou o espaço que
 * merece. Nada é gravado sem tocar em Salvar — a regra do repositório continua.
 */
export default function Conferir({
  items,
  aviso,
  titulo,
  onValor,
  onRemover,
  onDiferenca,
  onSalvar,
  onCancelar,
}: {
  items: Tx[];
  aviso: ExtractWarning | null;
  titulo: string;
  onValor: (id: string, v: string) => void;
  onRemover: (id: string) => void;
  onDiferenca: () => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const C = useC();
  const total = items.reduce((s, t) => s + (t.type === 'income' ? -t.amount : t.amount), 0);
  const visiveis = items.slice(0, MOSTRA);
  const resto = items.length - visiveis.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.head, { borderBottomColor: C.rule }]}>
        <Kicker>{titulo}</Kicker>
        <Text
          onPress={onCancelar}
          accessibilityRole="button"
          accessibilityLabel="Cancelar e voltar"
          style={[F(800), { fontSize: 13, color: C.accentInk }]}>
          Cancelar
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: PAD, paddingVertical: 18, gap: SP.md }}>
          <Text style={[F(800), { fontSize: 25, lineHeight: 30, color: C.text }]}>
            {`Achei ${items.length} ${items.length === 1 ? 'coisa' : 'coisas'}.`}
          </Text>
          <Text style={[F(400), { fontSize: 15, lineHeight: 23, color: C.dim }]}>
            Confira os valores antes de salvar. Nada é gravado sem você tocar em Salvar.
          </Text>

          {aviso ? (
            <Band>
              <Text style={[F(800), { fontSize: 15, color: C.onAccent }]}>{aviso.text}</Text>
              {aviso.diff ? (
                <Pressable
                  onPress={onDiferenca}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    {
                      marginTop: SP.sm,
                      borderWidth: 1,
                      borderColor: C.onAccent,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      alignSelf: 'flex-start',
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text style={[F(800), { fontSize: 14, color: C.onAccent }]}>
                    Lançar a diferença de {brl(Math.abs(aviso.diff))}
                  </Text>
                </Pressable>
              ) : null}
            </Band>
          ) : null}

          <Rule />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Kicker>Total</Kicker>
            <Text style={[F(800), mono, { fontSize: 26, color: C.text }]}>{brl(total)}</Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: C.lineSoft }}>
          {visiveis.map((t) => {
            const juros = t.type === 'expense' && JUROS.test(t.description);
            return (
              <View
                key={t.id}
                style={[
                  st.item,
                  { borderBottomColor: C.lineSoft },
                  juros && { backgroundColor: C.accentTint },
                ]}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[F(juros ? 800 : 600), { fontSize: 16, color: juros ? C.accentInk : C.text }]}
                    numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Meta style={juros ? { color: C.accentInk } : undefined}>
                    {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                    {juros ? ' · não virou nada' : ` · ${t.category}`}
                    {t.installment ? ` · ${t.installment.replace('/', ' de ')}` : ''}
                  </Meta>
                </View>
                <TextInput
                  defaultValue={t.amount.toFixed(2).replace('.', ',')}
                  onChangeText={(v) => onValor(t.id, v)}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  accessibilityLabel={`Valor de ${t.description}`}
                  selectionColor={C.accent}
                  style={[
                    F(juros ? 800 : 600),
                    mono,
                    st.campo,
                    {
                      borderColor: juros ? C.accent : C.line,
                      backgroundColor: juros ? C.bg : C.surface,
                      color: juros ? C.accentInk : C.text,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => onRemover(t.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Tirar ${t.description} da lista`}
                  hitSlop={10}
                  style={({ pressed }) => [st.x, pressed && { opacity: 0.5 }]}>
                  <Text style={{ fontSize: 22, color: C.dimmer }}>×</Text>
                </Pressable>
              </View>
            );
          })}
          {resto > 0 ? (
            <View style={{ paddingHorizontal: PAD, paddingVertical: 14 }}>
              <Meta>e mais {resto} {resto === 1 ? 'coisa' : 'coisas'}</Meta>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[st.acoes, { borderTopColor: C.rule }]}>
        <Btn
          label={items.length === 1 ? 'Salvar' : `Salvar as ${items.length}`}
          onPress={onSalvar}
          style={{ flex: 1 }}
        />
        <Btn label="Jogar fora" kind="ghost" onPress={onCancelar} />
      </View>
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
  item: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SP.md,
    paddingHorizontal: PAD,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  campo: {
    width: 96,
    minHeight: 44,
    borderWidth: 1,
    textAlign: 'right' as const,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  x: { width: 28, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  acoes: {
    flexDirection: 'row' as const,
    gap: SP.sm,
    padding: PAD,
    borderTopWidth: 2,
  },
};
