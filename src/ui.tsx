import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Design system Modernist (handoff de 27/08/2026): tema único claro, raio zero,
 * réguas no lugar de caixas, Archivo, e um vermelho só.
 *
 * Uma divergência do handoff, medida e deliberada: ele pede `#ec3013` como fundo
 * de texto pequeno (aba ativa, faixa de juros, botão). Contra `onAccent` isso dá
 * 3,76:1 e AA exige 4,5:1 para texto normal. Superfície vermelha usa o degrau
 * `accent-700` do próprio sistema (6,41:1). O `#ec3013` fica onde não há texto
 * em cima. Reverter é trocar `accentSurface` por `accent` aqui.
 */
const C_ = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  line: 'rgba(32,30,29,0.4)',
  rule: '#201e1d',
  lineSoft: '#d7d3d3',
  text: '#201e1d',
  dim: '#605d5d',
  dimmer: '#7d7979',
  accent: '#ec3013',
  accentSurface: '#ae1800',
  accentPressed: '#8e1400',
  accentInk: '#ae1800',
  accentTint: '#fff2ef',
  onAccent: '#f3f2f2',
};

export type Colors = typeof C_;

/** Tema único: o Modernist é um sistema claro por definição. */
export const useC = (): Colors => C_;

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Padding lateral das telas, para bater com os frames de 390. */
export const PAD = 20;

/** Alvo de toque do sistema. Chips de categoria e campos de linha ficam em 44. */
export const TAP = 56;

/**
 * Fonte custom não sintetiza peso no React Native: peso é família.
 * Sempre `...F(800)` em vez de `fontWeight`.
 */
export const F = (peso: 400 | 600 | 800): TextStyle => ({
  fontFamily:
    peso === 800 ? 'Archivo_800ExtraBold' : peso === 600 ? 'Archivo_600SemiBold' : 'Archivo_400Regular',
});

export const mono: TextStyle = { fontVariant: ['tabular-nums'] };

/** Seção de largura total separada por régua. Substitui o cartão. */
export function Card({
  children,
  style,
  last,
}: {
  children: ReactNode;
  style?: ViewStyle;
  last?: boolean;
}) {
  return (
    <View style={[s.section, last ? { borderBottomWidth: 0 } : null, style]}>{children}</View>
  );
}

export function Kicker({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[s.kicker, style]}>{children}</Text>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.hRow}>
      <Kicker style={{ flexShrink: 1 }}>{children}</Kicker>
      {right}
    </View>
  );
}

/** Régua fina entre linhas de lista. */
export function Rule({ strong }: { strong?: boolean }) {
  return (
    <View
      style={{
        height: strong ? 2 : 1,
        backgroundColor: strong ? C_.rule : C_.lineSoft,
      }}
    />
  );
}

/** Células iguais divididas por borda vertical: rótulo em cima, valor embaixo. */
export function Cells({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C_.lineSoft }}>
      {items.map((c, i) => (
        <View
          key={c.label}
          style={[
            { flex: 1, paddingTop: SP.md, paddingBottom: 2, paddingRight: SP.md },
            i > 0 ? { borderLeftWidth: 1, borderLeftColor: C_.lineSoft, paddingLeft: SP.md } : null,
          ]}>
          <Text style={[s.cellLabel]}>{c.label}</Text>
          <Text style={[s.cellValue, mono]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Faixa vermelha cheia. O único lugar em que o vermelho corre como campo. */
export function Band({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.band, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  style,
  hint,
  size = TAP,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  hint?: string;
  size?: number;
}) {
  const off = disabled || busy;
  const fg = kind === 'primary' ? C_.onAccent : kind === 'danger' ? C_.accentInk : C_.text;
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
        { minHeight: size },
        kind === 'primary'
          ? { backgroundColor: pressed ? C_.accentPressed : C_.accentSurface }
          : {
              borderWidth: 1,
              borderColor: kind === 'danger' ? C_.accentSurface : C_.line,
              backgroundColor: pressed ? 'rgba(32,30,29,0.07)' : 'transparent',
            },
        off && { opacity: 0.45 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[s.btnText, F(800), { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  sub,
  onPress,
  selected,
  style,
  size = 44,
  center,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  selected?: boolean;
  style?: ViewStyle;
  size?: number;
  center?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        s.chip,
        { minHeight: size, alignItems: center ? 'center' : 'flex-start' },
        selected
          ? { backgroundColor: C_.accentSurface, borderColor: C_.accentSurface }
          : { borderColor: C_.line, backgroundColor: pressed ? 'rgba(32,30,29,0.07)' : 'transparent' },
        style,
      ]}>
      <Text
        style={[s.chipText, F(selected ? 800 : 600), { color: selected ? C_.onAccent : C_.text }]}
        numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={[s.chipSub, F(400), mono, { color: selected ? C_.onAccent : C_.dim }]}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string; help?: string }) {
  const { label, help, style, ...rest } = props;
  return (
    <View style={{ gap: SP.xs }}>
      {label ? <Text style={[s.label, F(600)]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C_.dimmer}
        accessibilityLabel={label}
        selectionColor={C_.accent}
        {...rest}
        style={[s.input, F(400), mono, style]}
      />
      {help ? <Text style={[s.help, F(400)]}>{help}</Text> : null}
    </View>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <View style={s.barBg}>
      <View
        style={{
          width: `${Math.max(2, Math.min(100, value * 100))}%`,
          height: '100%',
          backgroundColor: C_.text,
        }}
      />
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={[s.empty, F(400)]}>{children}</Text>;
}

export function Meta({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[s.meta, F(400), mono, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  section: {
    paddingHorizontal: PAD,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: C_.rule,
    gap: SP.md,
  },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm },
  kicker: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: C_.dim,
  },
  cellLabel: { fontFamily: 'Archivo_400Regular', fontSize: 12, color: C_.dim },
  cellValue: { fontFamily: 'Archivo_800ExtraBold', fontSize: 19, color: C_.text },
  band: { backgroundColor: C_.accentSurface, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  btn: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnText: { fontSize: 19 },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: SP.sm,
    justifyContent: 'center',
    gap: 1,
  },
  chipText: { fontSize: 14 },
  chipSub: { fontSize: 13 },
  label: { fontSize: 12, color: C_.dim },
  help: { fontSize: 13, lineHeight: 19, color: C_.dim },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C_.line,
    backgroundColor: C_.surface,
    color: C_.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  barBg: { height: 10, backgroundColor: C_.lineSoft, overflow: 'hidden' },
  empty: { fontSize: 15, lineHeight: 23, color: C_.dim },
  meta: { fontSize: 13, lineHeight: 19, color: C_.dim },
});

export const st = s;
