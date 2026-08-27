import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export const C = {
  bg: '#0C0F14',
  card: '#141922',
  card2: '#1B2230',
  line: '#232B39',
  text: '#E8EDF5',
  dim: '#8A94A8',
  faint: '#5A6478',
  good: '#3FD68C',
  warn: '#F5C451',
  bad: '#FF6B72',
  accent: '#7C8CFF',
};

export const mono: any = { fontVariant: ['tabular-nums'] };

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.hRow}>
      <Text style={s.h}>{children}</Text>
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
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'ghost' && s.btnGhost,
        kind === 'danger' && s.btnDanger,
        (pressed || off) && { opacity: 0.55 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? '#0C0F14' : C.text} size="small" />
      ) : (
        <Text
          style={[
            s.btnText,
            kind === 'primary' && { color: '#0C0F14' },
            kind === 'danger' && { color: C.bad },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.faint}
        {...rest}
        style={[s.input, mono, style]}
      />
    </View>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={s.barBg}>
      <View
        style={{
          width: `${Math.max(2, Math.min(100, value * 100))}%`,
          height: '100%',
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={s.empty}>{children}</Text>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 16,
    gap: 12,
  },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h: {
    color: C.dim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnPrimary: { backgroundColor: C.good },
  btnGhost: { backgroundColor: C.card2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  btnDanger: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: C.bad },
  btnText: { color: C.text, fontSize: 15, fontWeight: '700' },
  label: { color: C.dim, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: C.card2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    color: C.text,
    fontSize: 16,
    padding: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  barBg: { height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: 'hidden' },
  empty: { color: C.faint, fontSize: 14, paddingVertical: 8 },
});

export const st = s;
