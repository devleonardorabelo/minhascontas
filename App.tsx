import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { load, useDB, useReady } from './src/store';
import { F, TAP, useC } from './src/ui';
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
  const dados = useReady();
  const db = useDB();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('resumo');
  const [fontes] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    load();
  }, []);

  // Um gate só: sem fonte carregada o texto salta de família na primeira pintura.
  const ready = dados && fontes;
  const primeiraVez = ready && !db.settings.onboarded && db.tx.length === 0;
  const Active = TABS.find((t) => t.key === tab)!.Screen;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
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
            <View style={[s.tabs, { borderTopColor: C.rule }]}>
              {TABS.map((t, i) => {
                const ativa = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityLabel={t.label}
                    accessibilityState={{ selected: ativa }}
                    style={({ pressed }) => [
                      s.tab,
                      i > 0 ? { borderLeftWidth: 1, borderLeftColor: C.lineSoft } : null,
                      ativa
                        ? { backgroundColor: C.accentSurface }
                        : pressed
                          ? { backgroundColor: 'rgba(32,30,29,0.07)' }
                          : null,
                    ]}>
                    <Text
                      style={[
                        s.tabText,
                        F(ativa ? 800 : 600),
                        { color: ativa ? C.onAccent : C.dim },
                      ]}>
                      {t.label}
                    </Text>
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
  tabs: { flexDirection: 'row', borderTopWidth: 2 },
  tab: { flex: 1, height: TAP, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, letterSpacing: 0.52, textTransform: 'uppercase' },
});
