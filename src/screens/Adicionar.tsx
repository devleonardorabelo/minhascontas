import { useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { addTx, newId, useDB } from '../store';
import {
  diffTx,
  extract,
  localParse,
  MissingKey,
  type ExtractResult,
  type ExtractWarning,
} from '../ai';
import { readBase64 } from '../readFile';
import { brl, todayISO } from '../budget';
import { Btn, Card, Chip, H, Input, Meta, SP, mono, st, useC } from '../ui';
import type { Tx } from '../types';

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const PADRAO = ['Mercado', 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Outros'];

export default function Adicionar() {
  const C = useC();
  const db = useDB();
  const [tipo, setTipo] = useState<'expense' | 'income'>('expense');
  const [valor, setValor] = useState('');
  const [cat, setCat] = useState('');
  const [nota, setNota] = useState('');
  const [texto, setTexto] = useState('');
  const [aiAberto, setAiAberto] = useState(false);
  const [preview, setPreview] = useState<Tx[]>([]);
  const [busy, setBusy] = useState<'' | 'text' | 'file'>('');
  const [err, setErr] = useState('');
  const [aviso, setAviso] = useState<ExtractWarning | null>(null);

  // As categorias que ela mais usa vêm primeiro; o resto completa a lista.
  const cats = useMemo(() => {
    const uso = new Map<string, number>();
    for (const t of db.tx) {
      if (t.type !== tipo) continue;
      uso.set(t.category, (uso.get(t.category) ?? 0) + 1);
    }
    const usadas = [...uso].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const base = tipo === 'income' ? ['Salário', 'Renda extra', 'Outros'] : PADRAO;
    return [...new Set([...usadas, ...base])].slice(0, 6);
  }, [db.tx, tipo]);

  const n = Number(valor.replace(/\./g, '').replace(',', '.'));
  const podeAnotar = Number.isFinite(n) && n > 0;

  const anotar = () => {
    if (!podeAnotar) return;
    const categoria = cat || 'Outros';
    addTx([
      {
        id: newId(),
        type: tipo,
        amount: Math.round(n * 100) / 100,
        date: todayISO(),
        description: nota.trim() || categoria,
        category: categoria,
        source: 'manual',
      },
    ]);
    setValor('');
    setNota('');
    setCat('');
  };

  const run = async (fn: () => Promise<ExtractResult>, which: 'text' | 'file') => {
    setBusy(which);
    setErr('');
    try {
      const { items, warning } = await fn();
      setPreview((p) => [...p, ...items]);
      setAviso(warning ?? null);
    } catch (e: any) {
      setErr(e instanceof MissingKey ? e.message : e?.message || 'Não deu certo. Tenta de novo.');
    } finally {
      setBusy('');
    }
  };

  const onText = () => {
    const t = texto.trim();
    if (!t) return;
    run(async () => {
      const r = db.settings.apiKey.trim()
        ? await extract({ kind: 'text', text: t }, db.settings.apiKey)
        : { items: localParse(t) };
      if (!r.items.length)
        throw new Error(
          'Sem a chave configurada eu só entendo frases como "mercado 32,90". Anotar o valor aí em cima funciona sempre.'
        );
      setTexto('');
      return r;
    }, 'text');
  };

  // O seletor de arquivo fica FORA do `busy`: no web o cancelamento não volta de
  // forma confiável, e o botão ficaria girando para sempre se ela desistisse.
  const onFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ACCEPT, multiple: true });
    if (r.canceled || !r.assets?.length) return;
    const assets = r.assets;
    run(async () => {
      const files = await Promise.all(
        assets.map(async (a) => ({
          base64: await readBase64(a.uri),
          mediaType: a.mimeType ?? 'application/pdf',
          name: a.name,
        }))
      );
      return extract({ kind: 'files', files }, db.settings.apiKey);
    }, 'file');
  };

  const total = preview.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

  const setAmount = (id: string, v: string) => {
    const x = Number(v.replace(/\./g, '').replace(',', '.'));
    setPreview((p) => p.map((t) => (t.id === id ? { ...t, amount: Number.isFinite(x) ? x : 0 } : t)));
  };

  const salvar = () => {
    addTx(preview.filter((t) => t.amount > 0));
    setPreview([]);
    setAviso(null);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      {/* caminho principal: dois toques e um número, sem depender de chave de API */}
      <Card>
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          <Chip
            label="Saiu"
            selected={tipo === 'expense'}
            onPress={() => {
              setTipo('expense');
              setCat('');
            }}
            style={{ flex: 1, alignItems: 'center' }}
          />
          <Chip
            label="Entrou"
            selected={tipo === 'income'}
            onPress={() => {
              setTipo('income');
              setCat('');
            }}
            style={{ flex: 1, alignItems: 'center' }}
          />
        </View>

        <TextInput
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          placeholderTextColor={C.dim}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel="Valor"
          style={[
            st.input,
            mono,
            {
              backgroundColor: C.card2,
              borderColor: C.line,
              color: tipo === 'income' ? C.good : C.text,
              fontSize: 34,
              fontWeight: '700',
              textAlign: 'center',
              minHeight: 72,
            },
          ]}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {cats.map((c) => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </View>

        <Input
          value={nota}
          onChangeText={setNota}
          placeholder={cat || 'Um lembrete, se quiser'}
          label="O que foi (opcional)"
        />

        <Btn
          label={tipo === 'income' ? 'Anotar entrada' : 'Anotar gasto'}
          onPress={anotar}
          disabled={!podeAnotar}
          hint="Guarda no aparelho, na hora"
        />
        <Meta>Anotado com a data de hoje. Fica só neste aparelho.</Meta>
      </Card>

      {/* atalhos: aceleram quem tem chave, mas nunca são a porta de entrada */}
      <Card>
        <H>Atalhos</H>
        <Btn
          label="Mandar fatura ou conta"
          kind="ghost"
          onPress={onFile}
          busy={busy === 'file'}
          disabled={busy !== ''}
          hint="Fatura, conta ou contracheque, em PDF ou foto. Pode mandar vários."
        />
        <Pressable
          onPress={() => setAiAberto((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: aiAberto }}
          style={({ pressed }) => [
            { minHeight: 44, justifyContent: 'center' },
            pressed && { opacity: 0.6 },
          ]}>
          <Text style={{ color: C.accent, fontSize: 15, fontWeight: '600' }}>
            {aiAberto ? 'Fechar' : 'Escrever em vez de digitar o valor'}
          </Text>
        </Pressable>
        {aiAberto ? (
          <>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={'Ex: almoço 32,90 hoje\nEx: recebi 1200 de bico ontem'}
              placeholderTextColor={C.dim}
              multiline
              accessibilityLabel="Escreva o gasto"
              style={[
                st.input,
                {
                  backgroundColor: C.card2,
                  borderColor: C.line,
                  color: C.text,
                  minHeight: 88,
                  textAlignVertical: 'top',
                },
              ]}
            />
            <Btn
              label="Entender o que escrevi"
              kind="ghost"
              onPress={onText}
              busy={busy === 'text'}
              disabled={!texto.trim() || busy !== ''}
            />
          </>
        ) : null}
        {!db.settings.apiKey.trim() ? (
          <Meta>Ler documento precisa da chave em Ajustes. Anotar na mão funciona sempre.</Meta>
        ) : null}
      </Card>

      {err ? (
        <Card tone="bad">
          <Text style={{ color: C.bad, fontSize: 15, lineHeight: 21 }}>{err}</Text>
        </Card>
      ) : null}

      {aviso && preview.length > 0 ? (
        <Card tone="warn">
          <Text style={{ color: C.warn, fontSize: 15, lineHeight: 21 }}>{aviso.text}</Text>
          {aviso.diff ? (
            <Btn
              label={`Lançar a diferença de ${brl(Math.abs(aviso.diff))}`}
              kind="ghost"
              onPress={() => {
                setPreview((p) => [...p, diffTx(aviso.diff!, aviso.dueDate)]);
                setAviso(null);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      {preview.length > 0 ? (
        <Card>
          <H
            right={
              <Text
                style={[
                  { color: total < 0 ? C.bad : C.good, fontWeight: '700', fontSize: 16 },
                  mono,
                ]}>
                {brl(total)}
              </Text>
            }>
            Confira {preview.length} {preview.length === 1 ? 'lançamento' : 'lançamentos'}
          </H>
          {preview.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15 }} numberOfLines={1}>
                  {t.description}
                </Text>
                <Meta>
                  {t.date.slice(8, 10)}/{t.date.slice(5, 7)} · {t.category}
                  {t.installment ? ` · ${t.installment}` : ''}
                  {t.dueDate ? ` · vence ${t.dueDate.slice(8, 10)}/${t.dueDate.slice(5, 7)}` : ''}
                </Meta>
              </View>
              <TextInput
                defaultValue={String(t.amount).replace('.', ',')}
                onChangeText={(v) => setAmount(t.id, v)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                accessibilityLabel={`Valor de ${t.description}`}
                style={[
                  st.input,
                  mono,
                  {
                    width: 104,
                    minHeight: 44,
                    paddingVertical: SP.sm,
                    paddingHorizontal: SP.sm,
                    textAlign: 'right',
                    fontSize: 15,
                    backgroundColor: C.card2,
                    borderColor: C.line,
                    color: t.type === 'income' ? C.good : C.text,
                  },
                ]}
              />
              <Pressable
                onPress={() => setPreview((p) => p.filter((x) => x.id !== t.id))}
                accessibilityRole="button"
                accessibilityLabel={`Tirar ${t.description} da lista`}
                hitSlop={12}
                style={({ pressed }) => [
                  { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
                  pressed && { opacity: 0.5 },
                ]}>
                <Text style={{ color: C.dim, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: SP.sm }}>
            <Btn label="Salvar" onPress={salvar} style={{ flex: 1 }} />
            <Btn
              label="Jogar fora"
              kind="ghost"
              onPress={() => {
                setPreview([]);
                setAviso(null);
              }}
            />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
