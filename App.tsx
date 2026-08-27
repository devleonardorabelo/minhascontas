import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { load, useDB, useReady } from './src/store';
import { SP, TAP, useC } from './src/ui';
import Resumo from './src/screens/Resumo';
import Adicionar from './src/screens/Adicionar';
import Extrato from './src/screens/Extrato';
import Ajustes from './src/screens/Ajustes';
import Comecar from './src/screens/Comecar';

const TABS = [
  { key: 'resumo', label: 'Resumo', Screen: Resumo },
  { key: 'add', label: 'Anotar', Screen: Adicionar },
  { key: 'extrato', label: 'Extrato', Screen: Extrato },
  { key: 'ajustes', label: 'Ajustes', Screen: Ajustes },
] as const;

export default function App() {
  const C = useC();
  const esquema = useColorScheme();
  const ready = useReady();
  const db = useDB();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('resumo');

  useEffect(() => {
    load();
  }, []);

  const primeiraVez = ready && !db.settings.onboarded && db.tx.length === 0;
  const Active = TABS.find((t) => t.key === tab)!.Screen;

  return (
    <SafeAreaProvider>
      <StatusBar style={esquema === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={s.frame}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1 }}>
            {!ready ? (
              <ActivityIndicator style={{ marginTop: 48 }} color={C.dim} />
            ) : primeiraVez ? (
              <Comecar />
            ) : (
              <Active />
            )}
          </View>

          {ready && !primeiraVez ? (
            <View style={[s.tabs, { borderTopColor: C.line }]}>
              {TABS.map((t) => {
                const ativa = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityLabel={t.label}
                    accessibilityState={{ selected: ativa }}
                    style={({ pressed }) => [s.tab, pressed && { opacity: 0.6 }]}>
                    <Text
                      style={[
                        s.tabText,
                        { color: ativa ? C.text : C.dim, fontWeight: ativa ? '700' : '600' },
                      ]}>
                      {t.label}
                    </Text>
                    <View
                      style={[
                        s.dot,
                        { backgroundColor: ativa ? C.good : 'transparent' },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SP.sm,
  },
  tab: {
    flex: 1,
    minHeight: TAP,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SP.xs,
  },
  tabText: { fontSize: 14 },
  dot: { width: 20, height: 3, borderRadius: 2 },
});
