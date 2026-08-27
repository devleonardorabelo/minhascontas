import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { addTx, useDB } from '../store';
import { diffTx, extract, localParse, MissingKey, type ExtractResult, type ExtractWarning } from '../ai';
import { readBase64 } from '../readFile';
import { brl } from '../budget';
import { Btn, C, Card, H, mono, st } from '../ui';
import type { Tx } from '../types';

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export default function Adicionar() {
  const db = useDB();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Tx[]>([]);
  const [busy, setBusy] = useState<'' | 'text' | 'file'>('');
  const [err, setErr] = useState('');
  const [aviso, setAviso] = useState<ExtractWarning | null>(null);

  const run = async (fn: () => Promise<ExtractResult>, which: 'text' | 'file') => {
    setBusy(which);
    setErr('');
    try {
      const { items, warning } = await fn();
      setPreview((p) => [...p, ...items]);
      setAviso(warning ?? null);
    } catch (e: any) {
      setErr(e instanceof MissingKey ? e.message : e?.message || 'Falhou. Tente de novo.');
    } finally {
      setBusy('');
    }
  };

  const onText = () => {
    const t = text.trim();
    if (!t) return;
    run(async () => {
      const r = db.settings.apiKey.trim()
        ? await extract({ kind: 'text', text: t }, db.settings.apiKey)
        : { items: localParse(t) };
      if (!r.items.length)
        throw new Error(
          'Sem chave da Anthropic, só entendo frases no formato "descrição 32,90". Configure a chave em Ajustes para leitura completa.'
        );
      setText('');
      return r;
    }, 'text');
  };

  // O picker fica FORA do `run`: no web o evento de cancelar não volta de forma
  // confiável, e travar o botão em spinner enquanto o diálogo está aberto deixaria
  // a tela presa para sempre se o usuário desistir. Só vira busy depois de escolher.
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
    const n = Number(v.replace(/\./g, '').replace(',', '.'));
    setPreview((p) => p.map((t) => (t.id === id ? { ...t, amount: Number.isFinite(n) ? n : 0 } : t)));
  };

  const save = () => {
    addTx(preview.filter((t) => t.amount > 0));
    setPreview([]);
    setAviso(null);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card>
        <H>Escrever</H>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={'Ex: almoço 32,90 hoje\nEx: recebi 1200 de freela ontem'}
          placeholderTextColor={C.faint}
          multiline
          style={[st.input, { minHeight: 84, textAlignVertical: 'top' }]}
        />
        <Btn
          label="Interpretar"
          onPress={onText}
          busy={busy === 'text'}
          disabled={!text.trim() || busy !== ''}
        />
      </Card>

      <Card>
        <H>Enviar documento</H>
        <Text style={{ color: C.dim, fontSize: 13, lineHeight: 19 }}>
          Fatura de cartão, contracheque ou conta (água, luz, internet), em PDF ou foto.
          Dá para mandar vários de uma vez — prints de páginas do mesmo documento contam
          como um só. A IA lê e devolve os lançamentos para você conferir antes de salvar.
        </Text>
        <Btn label="Escolher arquivos" kind="ghost" onPress={onFile} busy={busy === 'file'} disabled={busy !== ''} />
      </Card>

      {err ? (
        <Card style={{ borderColor: C.bad }}>
          <Text style={{ color: C.bad, fontSize: 14 }}>{err}</Text>
        </Card>
      ) : null}

      {aviso && preview.length > 0 ? (
        <Card style={{ borderColor: C.warn }}>
          <Text style={{ color: C.warn, fontSize: 13, lineHeight: 19 }}>{aviso.text}</Text>
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
          <H right={<Text style={[{ color: total < 0 ? C.bad : C.good, fontWeight: '700' }, mono]}>{brl(total)}</Text>}>
            Conferir {preview.length} {preview.length === 1 ? 'lançamento' : 'lançamentos'}
          </H>
          {preview.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14 }} numberOfLines={1}>
                  {t.description}
                </Text>
                <Text style={[{ color: C.faint, fontSize: 12 }, mono]}>
                  {t.date} · {t.category}
                  {t.installment ? ` · ${t.installment}` : ''}
                  {t.dueDate ? ` · vence ${t.dueDate}` : ''}
                  {t.recurring ? ' · mensal' : ''}
                </Text>
              </View>
              <TextInput
                defaultValue={String(t.amount).replace('.', ',')}
                onChangeText={(v) => setAmount(t.id, v)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={[
                  st.input,
                  mono,
                  { width: 96, paddingVertical: 8, textAlign: 'right', fontSize: 14,
                    color: t.type === 'income' ? C.good : C.text },
                ]}
              />
              <Pressable onPress={() => setPreview((p) => p.filter((x) => x.id !== t.id))} hitSlop={10}>
                <Text style={{ color: C.faint, fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Salvar" onPress={save} style={{ flex: 1 }} />
            <Btn
              label="Descartar"
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
