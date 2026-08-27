import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { load, useReady } from './src/store';
import { C } from './src/ui';
import Resumo from './src/screens/Resumo';
import Adicionar from './src/screens/Adicionar';
import Lancamentos from './src/screens/Lancamentos';
import Ajustes from './src/screens/Ajustes';

const TABS = [
  { key: 'resumo', label: 'Resumo', Screen: Resumo },
  { key: 'add', label: 'Adicionar', Screen: Adicionar },
  { key: 'lanc', label: 'Lançamentos', Screen: Lancamentos },
  { key: 'ajustes', label: 'Ajustes', Screen: Ajustes },
] as const;

export default function App() {
  const ready = useReady();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('resumo');

  useEffect(() => {
    load();
  }, []);

  const Active = TABS.find((t) => t.key === tab)!.Screen;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1 }}>
            {ready ? <Active /> : <ActivityIndicator style={{ marginTop: 40 }} color={C.dim} />}
          </View>
          <View style={s.tabs}>
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={s.tab}>
                <Text style={[s.tabText, tab === t.key && { color: C.text }]}>{t.label}</Text>
                <View style={[s.dot, tab === t.key && { backgroundColor: C.good }]} />
              </Pressable>
            ))}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4 },
  tabText: { color: C.faint, fontSize: 12, fontWeight: '600' },
  dot: { width: 16, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
});
