import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDB } from '../store';
import {
  addMonths,
  brl,
  canAfford,
  cardInvoice,
  dailyRate,
  daysToPayday,
  dayLabel,
  eff,
  forecast,
  monthLabel,
  monthOf,
  monthView,
  paydayOf,
  todayISO,
  typicalSpends,
  type Verdict,
} from '../budget';
import { Bar, Btn, Card, Chip, Empty, H, Input, Meta, SP, mono, useC } from '../ui';

const VERDICT: Record<Verdict, { title: string; tone: 'good' | 'warn' | 'bad' }> = {
  pode: { title: 'Pode.', tone: 'good' },
  aperta: { title: 'Dá, mas aperta.', tone: 'warn' },
  risco: { title: 'Melhor não.', tone: 'warn' },
  nao: { title: 'Não dá.', tone: 'bad' },
};

export default function Resumo() {
  const C = useC();
  const db = useDB();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [valor, setValor] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [digitando, setDigitando] = useState(false);

  const atual = month === monthOf(today);
  const view = useMemo(
    () => monthView(db.tx, month, db.settings.reserva, today),
    [db.tx, month, db.settings.reserva, today]
  );
  const rate = useMemo(() => dailyRate(db.tx, today), [db.tx, today]);
  const atalhos = useMemo(() => typicalSpends(db.tx, today), [db.tx, today]);
  const fatura = useMemo(() => cardInvoice(db.tx, month), [db.tx, month]);
  const dias = useMemo(() => daysToPayday(db.tx, today), [db.tx, today]);
  const payday = useMemo(() => paydayOf(db.tx), [db.tx]);
  const proximos = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) =>
        forecast(db.tx, addMonths(month, i + 1), db.settings.reserva, today)
      ).filter((f) => f.income > 0 || f.committed > 0),
    [db.tx, month, db.settings.reserva, today]
  );

  const sim = valor && valor > 0 ? canAfford(valor, view, rate) : null;
  const positivo = view.free >= 0;
  const maxCat = view.byCategory[0]?.total ?? 1;

  // Toda notícia ruim vem com a próxima ação. Nunca só o problema. (SPEC 04, E2)
  const janela =
    atual && dias != null
      ? dias === 1
        ? 'Amanhã cai o salário'
        : `Faltam ${dias} dias para o salário`
      : monthLabel(month);
  const conselho = !atual
    ? null
    : positivo
      ? view.committed > 0
        ? `Já contando ${brl(view.committed)} que ainda vai sair.`
        : dias != null
          ? `São ${brl(view.free / Math.max(dias, 1))} por dia até lá.`
          : null
      : payday
        ? `Até o dia ${payday} não entra mais nada. O que der para segurar, segura.`
        : 'Não há entrada prevista. O que der para segurar, segura.';

  return (
    <ScrollView
      contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      {/* navegação de mês */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => setMonth(addMonths(month, -1))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior">
          <Text style={{ color: C.dim, fontSize: 26, paddingHorizontal: SP.sm }}>‹</Text>
        </Pressable>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{monthLabel(month)}</Text>
        <Pressable
          onPress={() => setMonth(addMonths(month, 1))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês">
          <Text style={{ color: C.dim, fontSize: 26, paddingHorizontal: SP.sm }}>›</Text>
        </Pressable>
      </View>

      {/* o número, com a janela dela e a próxima ação */}
      <Card>
        <H>{janela}</H>
        {positivo ? (
          <>
            <Text style={{ color: C.dim, fontSize: 15 }}>Dá para gastar</Text>
            <Text style={[{ color: C.good, fontSize: 38, fontWeight: '800' }, mono]}>
              {brl(view.free)}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: C.dim, fontSize: 15 }}>Você já passou</Text>
            <Text style={[{ color: C.bad, fontSize: 34, fontWeight: '800' }, mono]}>
              {brl(-view.free)}
            </Text>
          </>
        )}
        {conselho ? (
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>{conselho}</Text>
        ) : null}
        {db.settings.reserva > 0 ? (
          <Meta>Já tirei {brl(db.settings.reserva)} que você quer guardar.</Meta>
        ) : null}
      </Card>

      {/* posso gastar — sem exigir que ela saiba o valor (E1) */}
      <Card>
        <H>Posso gastar?</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {atalhos.map((a) => (
            <Chip
              key={a.category}
              label={a.category}
              sub={`~${a.amount.toLocaleString('pt-BR')}`}
              selected={valor === a.amount}
              onPress={() => {
                setValor(a.amount);
                setDigitando(false);
              }}
            />
          ))}
          <Chip
            label="Outro valor"
            selected={digitando}
            onPress={() => {
              setDigitando(true);
              setValor(null);
            }}
          />
        </View>

        {digitando ? (
          <Input
            value={texto}
            onChangeText={(v) => {
              setTexto(v);
              const n = Number(v.replace(/\./g, '').replace(',', '.'));
              setValor(Number.isFinite(n) && n > 0 ? n : null);
            }}
            placeholder="0,00"
            keyboardType="decimal-pad"
            inputMode="decimal"
            autoFocus
            label="Quanto?"
          />
        ) : null}

        {sim ? (
          <View style={{ gap: SP.xs }}>
            <Text
              style={{ color: C[VERDICT[sim.verdict].tone], fontSize: 22, fontWeight: '800' }}>
              {VERDICT[sim.verdict].title}
            </Text>
            <Text style={[{ color: C.text, fontSize: 15, lineHeight: 22 }, mono]}>
              {sim.freeAfter < 0
                ? `Você fica ${brl(-sim.freeAfter)} no vermelho.`
                : `Sobram ${brl(sim.freeAfter)}.`}
              {rate > 0 && view.daysLeft > 0
                ? ` Do jeito que você vem gastando, ainda faltam ${brl(sim.needed)} até o fim do mês.`
                : ' Ainda não sei o seu ritmo de gasto para ter certeza.'}
            </Text>
          </View>
        ) : atalhos.length === 0 ? (
          <Empty>Depois de alguns gastos anotados, eu aprendo seus valores e coloco aqui.</Empty>
        ) : null}
      </Card>

      {/* a fatura é uma coisa só (E5) */}
      {fatura ? (
        <Card tone={fatura.juros > 0 ? 'warn' : undefined}>
          <H right={<Text style={[{ color: C.text, fontWeight: '700', fontSize: 17 }, mono]}>{brl(fatura.total)}</Text>}>
            A fatura do cartão
          </H>
          <Meta>
            {fatura.due <= today ? 'venceu' : 'vence'} {dayLabel(fatura.due, today)} ·{' '}
            {fatura.count} {fatura.count === 1 ? 'compra' : 'compras'}
          </Meta>
          {fatura.juros > 0 ? (
            <Text style={{ color: C.warn, fontSize: 15, fontWeight: '600', lineHeight: 21 }}>
              {brl(fatura.juros)} disso foi só juros. Esse dinheiro não virou nada.
            </Text>
          ) : null}
          {fatura.parcelas.slice(0, 3).map((p, i) => (
            <Text key={i} style={{ color: C.text, fontSize: 15 }} numberOfLines={1}>
              Faltam {p.restantes}x de{' '}
              <Text style={mono}>{brl(p.amount)}</Text> · {p.description}
            </Text>
          ))}
        </Card>
      ) : null}

      {/* o que ainda vai sair — só aparece quando existe (achado C) */}
      {view.upcoming.length > 0 ? (
        <Card>
          <H
            right={
              <Text style={[{ color: C.warn, fontSize: 15, fontWeight: '700' }, mono]}>
                {brl(view.committed)}
              </Text>
            }>
            Ainda vai sair
          </H>
          {view.upcoming.slice(0, 6).map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SP.md }}>
              <Text style={{ color: C.text, fontSize: 15, flex: 1 }} numberOfLines={1}>
                {t.description}
              </Text>
              <Meta>{dayLabel(eff(t), today)}</Meta>
              <Text style={[{ color: C.text, fontSize: 15 }, mono]}>{brl(t.amount)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* onde foi */}
      <Card>
        <H>Onde foi o dinheiro</H>
        {view.byCategory.length === 0 ? (
          <Empty>Nada saiu neste mês ainda.</Empty>
        ) : (
          view.byCategory.map((c) => (
            <View key={c.category} style={{ gap: SP.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.text, fontSize: 15 }}>{c.category}</Text>
                <Text style={[{ color: C.text, fontSize: 15 }, mono]}>{brl(c.total)}</Text>
              </View>
              <Bar value={c.total / maxCat} color={C.accent} />
            </View>
          ))
        )}
      </Card>

      {/* previsão como faixa, nunca como promessa (E4) */}
      {proximos.length > 0 ? (
        <Card>
          <H>Os próximos meses</H>
          {proximos.map((f) => (
            <View key={f.month} style={{ gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                {monthLabel(f.month)}
              </Text>
              <Text
                style={[
                  { color: f.pessimista < 0 ? C.bad : C.text, fontSize: 17, fontWeight: '700' },
                  mono,
                ]}>
                {f.variavel > 0
                  ? `${brl(f.pessimista)} a ${brl(f.otimista)}`
                  : brl(f.otimista)}
              </Text>
              <Meta>{brl(f.committed)} de contas já marcadas</Meta>
            </View>
          ))}
          <Text style={{ color: C.dim, fontSize: 14, lineHeight: 20 }}>
            {proximos.some((f) => f.variavel > 0)
              ? 'O primeiro número já desconta o quanto você costuma gastar fora das contas fixas. O segundo é se você não gastar mais nada.'
              : 'Só o que já está marcado como mensal. Conforme você for anotando, eu vou descontando o gasto do dia a dia daqui.'}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
