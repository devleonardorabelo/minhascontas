import { useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { brl, monthLabel, monthOf, todayISO } from '../budget';
import { Btn, Chip, F, Input, Kicker, Link, Meta, PAD, SP, mono, useC } from '../ui';
import Conferir from './Conferir';
import type { Tx } from '../types';

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const PADRAO = ['Mercado', 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Outros'];
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '←'];

export default function Adicionar() {
  const C = useC();
  const db = useDB();
  const [tipo, setTipo] = useState<'expense' | 'income'>('expense');
  const [valor, setValor] = useState('');
  const [cat, setCat] = useState('');
  const [nota, setNota] = useState('');
  const [folha, setFolha] = useState(false);
  const [texto, setTexto] = useState('');
  const [preview, setPreview] = useState<Tx[]>([]);
  const [busy, setBusy] = useState<'' | 'text' | 'file'>('');
  const [err, setErr] = useState('');
  const [aviso, setAviso] = useState<ExtractWarning | null>(null);

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

  const n = Number(valor.replace(',', '.'));
  const podeAnotar = Number.isFinite(n) && n > 0;

  /** Teclado próprio: o do sistema cobre o botão de confirmar e força a tela a rolar. */
  const tecla = (k: string) => {
    if (k === '←') return setValor((v) => v.slice(0, -1));
    if (k === ',') return setValor((v) => (v.includes(',') ? v : (v || '0') + ','));
    setValor((v) => {
      const [, dec] = v.split(',');
      if (dec !== undefined && dec.length >= 2) return v;
      if (v === '0') return k;
      return (v + k).slice(0, 10);
    });
  };

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
      setFolha(false);
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
          'Sem a chave configurada eu só entendo frases como "mercado 32,90". O teclado da tela funciona sempre.'
        );
      setTexto('');
      return r;
    }, 'text');
  };

  // O seletor fica FORA do `busy`: no web o cancelamento não volta de forma
  // confiável e o botão ficaria girando para sempre.
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

  return (
    <View style={{ flex: 1 }}>
      {/* 1 — saiu / entrou */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: C.rule }}>
        {(['expense', 'income'] as const).map((t) => {
          const ativa = tipo === t;
          return (
            <Pressable
              key={t}
              onPress={() => {
                setTipo(t);
                setCat('');
              }}
              accessibilityRole="tab"
              accessibilityLabel={t === 'expense' ? 'Saiu' : 'Entrou'}
              accessibilityState={{ selected: ativa }}
              style={({ pressed }) => [
                { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
                ativa ? { backgroundColor: C.text } : pressed ? { backgroundColor: 'rgba(32,30,29,0.07)' } : null,
              ]}>
              <Text style={[F(ativa ? 800 : 600), { fontSize: 14, color: ativa ? C.bg : C.dim }]}>
                {t === 'expense' ? 'Saiu' : 'Entrou'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 2 — valor */}
      <View style={{ paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 12, gap: 2 }}>
        <Kicker>Quanto</Kicker>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
          <Text style={[F(800), { fontSize: 26, color: C.dimmer }]}>R$</Text>
          <Text
            style={[F(800), mono, { fontSize: 62, letterSpacing: -1.8, color: C.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={`Valor ${valor || '0'}`}>
            {valor || '0'}
          </Text>
          <View style={{ width: 3, height: 52, backgroundColor: C.accent }} />
        </View>
      </View>

      {/* 3 — em quê */}
      <View style={{ paddingHorizontal: PAD, paddingBottom: 12, gap: SP.sm }}>
        <Kicker>Em quê</Kicker>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {cats.map((c) => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </View>
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Um lembrete, se quiser"
          placeholderTextColor={C.dimmer}
          accessibilityLabel="Um lembrete, se quiser"
          selectionColor={C.accent}
          style={[
            F(400),
            {
              minHeight: 44,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.surface,
              color: C.text,
              fontSize: 15,
              paddingHorizontal: 12,
            },
          ]}
        />
      </View>

      {/* 4 — teclado próprio */}
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
        {[0, 1, 2, 3].map((linha) => (
          <View key={linha} style={{ flex: 1, flexDirection: 'row' }}>
            {TECLAS.slice(linha * 3, linha * 3 + 3).map((k, col) => (
              <Pressable
                key={k}
                onPress={() => tecla(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '←' ? 'Apagar um dígito' : k === ',' ? 'Vírgula' : k}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomWidth: linha === 3 ? 0 : 1,
                    borderBottomColor: C.lineSoft,
                    borderRightWidth: col === 2 ? 0 : 1,
                    borderRightColor: C.lineSoft,
                  },
                  pressed && { backgroundColor: 'rgba(32,30,29,0.07)' },
                ]}>
                <Text
                  style={[F(800), mono, { fontSize: 26, color: k === '←' ? C.accentInk : C.text }]}>
                  {k}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* 5 — confirmar */}
      <View style={{ paddingHorizontal: PAD, paddingVertical: 12, gap: SP.sm }}>
        {err ? <Text style={[F(600), { fontSize: 14, color: C.accentInk, lineHeight: 20 }]}>{err}</Text> : null}
        <Btn
          label={podeAnotar ? `Anotar ${brl(n)}` : tipo === 'income' ? 'Anotar entrada' : 'Anotar gasto'}
          onPress={anotar}
          disabled={!podeAnotar}
          hint="Guarda no aparelho, na hora"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SP.md }}>
          <Meta style={{ flex: 1 }}>Fica só neste aparelho, na hora.</Meta>
          <Link label="Mandar fatura →" onPress={() => setFolha(true)} align="flex-end" />
        </View>
      </View>

      {/* folha de importação — overlay comum, não Modal: dois Modal irmãos se
          atropelam no react-native-web e o segundo monta sem pintar */}
      {folha ? (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(32,30,29,0.5)' }}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={() => setFolha(false)}
          />
          <View style={{ backgroundColor: C.bg, borderTopWidth: 2, borderTopColor: C.rule, padding: PAD, gap: SP.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Kicker>Mandar para eu ler</Kicker>
              <Link label="Fechar" onPress={() => setFolha(false)} align="flex-end" />
            </View>
            <Btn
              label="Escolher arquivo"
              onPress={onFile}
              busy={busy === 'file'}
              disabled={busy !== ''}
              hint="Fatura, conta ou contracheque, em PDF ou foto. Pode mandar vários."
            />
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={'Ou escreva: almoço 32,90 hoje'}
              placeholderTextColor={C.dimmer}
              multiline
              accessibilityLabel="Escreva o que aconteceu"
              selectionColor={C.accent}
              style={[
                F(400),
                {
                  minHeight: 80,
                  borderWidth: 1,
                  borderColor: C.line,
                  backgroundColor: C.surface,
                  color: C.text,
                  fontSize: 15,
                  padding: 12,
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
            {!db.settings.apiKey.trim() ? (
              <Meta>Ler documento precisa da chave em Ajustes. O teclado da tela funciona sem ela.</Meta>
            ) : null}
            {err ? <Text style={[F(600), { fontSize: 14, color: C.accentInk, lineHeight: 20 }]}>{err}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* conferência em tela cheia */}
      <Modal visible={preview.length > 0} animationType="slide" onRequestClose={() => setPreview([])}>
        <Conferir
          items={preview}
          aviso={aviso}
          titulo={`Lido em ${monthLabel(monthOf(preview[0]?.date ?? todayISO())).toLowerCase()}`}
          onValor={(id, v) => {
            const x = Number(v.replace(/\./g, '').replace(',', '.'));
            setPreview((p) => p.map((t) => (t.id === id ? { ...t, amount: Number.isFinite(x) ? x : 0 } : t)));
          }}
          onRemover={(id) => setPreview((p) => p.filter((t) => t.id !== id))}
          onDiferenca={() => {
            if (aviso?.diff) setPreview((p) => [...p, diffTx(aviso.diff!, aviso.dueDate)]);
            setAviso(null);
          }}
          onSalvar={() => {
            addTx(preview.filter((t) => t.amount > 0));
            setPreview([]);
            setAviso(null);
          }}
          onCancelar={() => {
            setPreview([]);
            setAviso(null);
          }}
        />
      </Modal>
    </View>
  );
}
