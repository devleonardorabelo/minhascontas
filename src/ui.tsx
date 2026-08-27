import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Dois temas medidos: toda combinação de texto sobre superfície passa WCAG AA
 * (>= 4.5:1). O token `faint` foi removido — ele reprovava em 2,96:1 e era a cor
 * de todas as datas e categorias. Terceiro nível de hierarquia agora é tamanho e
 * peso, não contraste insuficiente. Ver SPEC 04, achado G.
 */
const DARK = {
  bg: '#0C0F14',
  card: '#141922',
  card2: '#1B2230',
  line: '#2A3342',
  text: '#E8EDF5',
  dim: '#98A3B6',
  good: '#3FD68C',
  warn: '#F5C451',
  bad: '#FF8A90',
  accent: '#8B9BFF',
  onAccent: '#0C0F14',
};

const LIGHT = {
  bg: '#F1F4F8',
  card: '#FFFFFF',
  card2: '#E9EDF3',
  line: '#D5DCE6',
  text: '#10151C',
  dim: '#4C5666',
  good: '#0E6B45',
  warn: '#8A5300',
  bad: '#B3261E',
  accent: '#2B45B8',
  onAccent: '#FFFFFF',
};

export type Colors = typeof DARK;

/** Ela usa o celular na rua, no sol: o tema claro não é preferência, é condição de uso. */
export const useC = (): Colors => (useColorScheme() === 'light' ? LIGHT : DARK);

/** Ritmo de 4/8. */
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Alvo mínimo de toque: 44pt no iOS, 48dp no Android. Usamos 48 nos dois. */
export const TAP = 48;

export const mono: TextStyle = { fontVariant: ['tabular-nums'] };

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'warn' | 'bad' | 'good';
}) {
  const C = useC();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: C.card, borderColor: tone ? C[tone] : C.line },
        tone ? { borderWidth: 1 } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

/** Título de card em sentence case: caixa alta com tracking custa legibilidade em tela pequena. */
export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const C = useC();
  return (
    <View style={s.hRow}>
      <Text style={[s.h, { color: C.text }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  style,
  hint,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  hint?: string;
}) {
  const C = useC();
  const off = disabled || busy;
  const bg = off
    ? C.card2
    : kind === 'primary'
      ? C.good
      : kind === 'ghost'
        ? C.card2
        : 'transparent';
  const fg = off ? C.dim : kind === 'primary' ? C.onAccent : kind === 'danger' ? C.bad : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: kind === 'danger' && !off ? C.bad : C.line },
        kind !== 'primary' || off ? { borderWidth: StyleSheet.hairlineWidth } : null,
        pressed && { opacity: 0.6 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[s.btnText, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Botão-atalho: o app já sabe o valor, ela não precisa digitar. */
export function Chip({
  label,
  sub,
  onPress,
  selected,
  style,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  selected?: boolean;
  style?: ViewStyle;
}) {
  const C = useC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: selected ? C.accent : C.card2,
          borderColor: selected ? C.accent : C.line,
        },
        pressed && { opacity: 0.6 },
        style,
      ]}>
      <Text
        style={[s.chipText, { color: selected ? C.onAccent : C.text }]}
        numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={[s.chipSub, mono, { color: selected ? C.onAccent : C.dim }]}>{sub}</Text>
      ) : null}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string; help?: string }) {
  const C = useC();
  const { label, help, style, ...rest } = props;
  return (
    <View style={{ gap: SP.xs }}>
      {label ? <Text style={[s.label, { color: C.dim }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.dim}
        accessibilityLabel={label}
        {...rest}
        style={[
          s.input,
          mono,
          { backgroundColor: C.card2, borderColor: C.line, color: C.text },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
          style,
        ]}
      />
      {help ? <Text style={[s.help, { color: C.dim }]}>{help}</Text> : null}
    </View>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  const C = useC();
  return (
    <View style={[s.barBg, { backgroundColor: C.card2 }]}>
      <View
        style={{
          width: `${Math.max(2, Math.min(100, value * 100))}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Vazio nunca é tela em branco: diz o que fazer. */
export function Empty({ children }: { children: ReactNode }) {
  const C = useC();
  return <Text style={[s.empty, { color: C.dim }]}>{children}</Text>;
}

export function Meta({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const C = useC();
  return <Text style={[s.meta, mono, { color: C.dim }, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SP.lg,
    gap: SP.md,
  },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm },
  h: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  btn: {
    minHeight: TAP,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SP.lg,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: {
    minHeight: TAP,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    justifyContent: 'center',
    gap: 2,
  },
  chipText: { fontSize: 15, fontWeight: '600' },
  chipSub: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600' },
  help: { fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: TAP,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
  },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  empty: { fontSize: 15, lineHeight: 21, paddingVertical: SP.xs },
  meta: { fontSize: 14, lineHeight: 19 },
});

export const st = s;
