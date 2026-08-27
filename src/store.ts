import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { DB, Settings, Tx } from './types';

const KEY = 'mc.v1';
const EMPTY: DB = { tx: [], settings: { apiKey: '', reserva: 0 } };

let db: DB = EMPTY;
let ready = false;
const subs = new Set<() => void>();

const emit = () => {
  for (const f of subs) f();
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

// ponytail: um blob JSON no AsyncStorage. Migrar para expo-sqlite quando passar
// de ~5k lançamentos (limite do localStorage na web).
const persist = () => {
  AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => {});
};

const set = (next: DB) => {
  db = next;
  persist();
  emit();
};

export async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DB>;
      db = {
        tx: parsed.tx ?? [],
        settings: { ...EMPTY.settings, ...parsed.settings },
      };
    }
  } catch {
    // storage corrompido: começa vazio em vez de travar o app
  }
  ready = true;
  emit();
}

export const useDB = () => useSyncExternalStore(subscribe, () => db, () => db);
export const useReady = () => useSyncExternalStore(subscribe, () => ready, () => ready);
export const getSettings = () => db.settings;

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const addTx = (items: Tx[]) => set({ ...db, tx: [...db.tx, ...items] });
export const removeTx = (id: string) =>
  set({ ...db, tx: db.tx.filter((t) => t.id !== id) });
export const removeBatch = (batchId: string) =>
  set({ ...db, tx: db.tx.filter((t) => t.batchId !== batchId) });
export const saveSettings = (patch: Partial<Settings>) =>
  set({ ...db, settings: { ...db.settings, ...patch } });
export const wipe = () => set({ ...EMPTY, settings: db.settings });
export const updateTx = (id: string, patch: Partial<Tx>) =>
  set({ ...db, tx: db.tx.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
