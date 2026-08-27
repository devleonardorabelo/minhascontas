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
  shortMonthLabel,
  todayISO,
  typicalSpends,
  type Verdict,
} from '../budget';
import { Bar, Band, Card, Cells, Chip, Empty, F, H, Input, Kicker, Meta, PAD, Rule, SP, Seta, mono, useC } from '../ui';

const VERDICT: Record<Verdict, string> = {
  pode: 'Pode.',
  aperta: 'Dá, mas aperta.',
  risco: 'Melhor não.',
  nao: 'Não dá.',
};

/** Sem "R$", com centavos: listas de valores reais. */
const cents = (n: number) =>
  Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Sem centavos: só em "os próximos meses", onde importa a ordem de grandeza. */
const curto = (n: number) =>
  `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('pt-BR')}`;

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
  const payday = useMemo(() => {
    const d = daysToPayday(db.tx, today);
    if (d == null) return null;
    const [y, m, day] = today.split('-').map(Number);
    return new Date(y, m - 1, day + d);
  }, [db.tx, today]);
  const proximos = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) =>
        forecast(db.tx, addMonths(month, i + 1), db.settings.reserva, today)
      ).filter((f) => f.income > 0 || f.committed > 0),
    [db.tx, month, db.settings.reserva, today]
  );

  const sim = valor && valor > 0 ? canAfford(valor, view, rate) : null;
  const positivo = view.free >= 0;
  // Mês sem nada anotado: a reserva sozinha vira "você já passou R$ 300", que é
  // verdade aritmética e mentira na vida dela.
  const vazio = view.items.length === 0;
  const maxCat = view.byCategory[0]?.total ?? 1;

  const kicker =
    !atual || !payday
      ? `Dá para gastar em ${shortMonthLabel(month).toLowerCase()}`
      : `Dá para gastar até dia ${payday.getDate()}`;

  // Sem "R$" repetido três vezes: o rótulo já diz o que é, e o símbolo comia a
  // largura de que o número precisa em tela de 375.
  const celulas = [
    { label: 'por dia', value: cents(Math.max(view.free, 0) / Math.max(dias ?? view.daysLeft, 1)) },
    { label: 'ainda vai cair', value: cents(view.committed) },
    ...(db.settings.reserva > 0 ? [{ label: 'guardado', value: cents(db.settings.reserva) }] : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* cabeçalho fixo */}
      <View style={[st.head, { borderBottomColor: C.rule }]}>
        <Kicker>Minhas contas</Kicker>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
          <Seta dir="prev" onPress={() => setMonth(addMonths(month, -1))} />
          <Text style={[F(800), st.mes, { color: C.text }]}>
            {shortMonthLabel(month).toUpperCase()}
          </Text>
          <Seta dir="next" onPress={() => setMonth(addMonths(month, 1))} />
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {/* 1 — o número */}
        <Card style={{ paddingTop: 24, gap: SP.sm }}>
          {vazio ? (
            <>
              <Kicker>Ainda não sei nada de {shortMonthLabel(month).toLowerCase()}</Kicker>
              <Text style={[F(800), st.heroi, { color: C.dim, fontSize: 34, lineHeight: 40 }]}>
                Sem nada anotado
              </Text>
              <Text style={[F(400), st.corpo, { color: C.text }]}>
                Toque em Anotar e ponha o que entrou e o que saiu. Com dois ou três lançamentos eu
                já consigo dizer quanto dá para gastar.
              </Text>
            </>
          ) : (
            <>
              <Kicker>{positivo ? kicker : 'Você já passou'}</Kicker>
              <Text
                style={[F(800), mono, st.heroi, { color: positivo ? C.text : C.accentInk }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}>
                {brl(Math.abs(view.free))}
              </Text>
              <Cells items={celulas} />
            </>
          )}
        </Card>

        {/* 2 — posso gastar */}
        <Card>
          <Kicker>Posso gastar?</Kicker>
          <View style={{ flexDirection: 'row', gap: SP.sm }}>
            {atalhos.map((a) => (
              <Chip
                key={a.category}
                label={a.category}
                sub={a.amount.toLocaleString('pt-BR')}
                size={56}
                selected={valor === a.amount}
                style={{ flex: 1 }}
                onPress={() => {
                  setValor(a.amount);
                  setDigitando(false);
                }}
              />
            ))}
            <Chip
              label="+"
              size={56}
              center
              selected={digitando}
              style={{ width: 56, flexGrow: 0 }}
              onPress={() => {
                setDigitando(!digitando);
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
              label="QUANTO"
            />
          ) : null}

          {sim ? (
            <View style={{ gap: SP.xs }}>
              <Text
                style={[F(800), st.veredicto, { color: sim.verdict === 'pode' ? C.text : C.accentInk }]}>
                {VERDICT[sim.verdict]}
              </Text>
              <Text style={[F(400), st.corpo, { color: C.text }]}>
                {sim.freeAfter < 0
                  ? `Você fica ${brl(-sim.freeAfter)} no vermelho.`
                  : `Sobram ${brl(sim.freeAfter)}.`}
                {rate > 0 && view.daysLeft > 0
                  ? ` No seu ritmo, ainda faltam ${brl(sim.needed)} até o fim do mês.`
                  : ' Ainda não sei o seu ritmo de gasto para ter certeza.'}
              </Text>
            </View>
          ) : atalhos.length === 0 ? (
            <Empty>Depois de algumas coisas anotadas, eu aprendo seus valores e coloco aqui.</Empty>
          ) : null}
        </Card>

        {/* 3 — a fatura */}
        {fatura ? (
          <Card>
            <H
              right={
                <Text style={[F(800), mono, { fontSize: 20, color: C.text }]}>
                  {brl(fatura.total)}
                </Text>
              }>
              {`A fatura, ${fatura.due <= today ? 'venceu' : 'vence'} ${dayLabel(fatura.due, today)}`}
            </H>
            {fatura.juros > 0 ? (
              <Band>
                <Text style={[F(800), { fontSize: 15, color: C.onAccent }]}>
                  {brl(fatura.juros)} disso foi só juros.
                </Text>
                <Text style={[F(400), { fontSize: 13, color: C.onAccent }]}>
                  Esse dinheiro não virou nada.
                </Text>
              </Band>
            ) : null}
            {fatura.parcelas.slice(0, 3).map((p, i) => (
              <View key={i}>
                {i > 0 ? <Rule /> : null}
                <View style={st.linha}>
                  <Text style={[F(400), { fontSize: 15, color: C.text, flex: 1 }]} numberOfLines={1}>
                    {p.description}
                  </Text>
                  <Meta style={{ fontSize: 14 }}>
                    faltam {p.restantes}x de {cents(p.amount)}
                  </Meta>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* 4 — ainda vai cair */}
        {view.upcoming.length > 0 ? (
          <Card>
            <H
              right={
                <Text style={[F(800), mono, { fontSize: 20, color: C.text }]}>
                  {brl(view.committed)}
                </Text>
              }>
              Ainda vai cair
            </H>
            {view.upcoming.slice(0, 6).map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <Rule /> : null}
                <View style={st.linha}>
                  <Text style={[F(400), { fontSize: 15, color: C.text, flex: 1 }]} numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Meta style={{ width: 76 }}>{dayLabel(eff(t), today)}</Meta>
                  <Text style={[F(600), mono, { fontSize: 15, color: C.text }]}>
                    {cents(t.amount)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* 5 — onde foi */}
        <Card>
          <Kicker>Onde foi o dinheiro</Kicker>
          {view.byCategory.length === 0 ? (
            <Empty>Nada saiu neste mês ainda.</Empty>
          ) : (
            <View style={{ gap: 10 }}>
              {view.byCategory.map((c) => (
                <View key={c.category} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[F(400), { fontSize: 15, color: C.text }]}>{c.category}</Text>
                    <Text style={[F(600), mono, { fontSize: 15, color: C.text }]}>
                      {cents(c.total)}
                    </Text>
                  </View>
                  <Bar value={c.total / maxCat} />
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* 6 — próximos meses */}
        {proximos.length > 0 ? (
          <Card last>
            <Kicker>Os próximos meses</Kicker>
            <View>
              {proximos.map((f, i) => (
                <View key={f.month}>
                  {i > 0 ? <Rule /> : null}
                  <View style={st.linha}>
                    <Text style={[F(800), { fontSize: 15, color: C.text, flex: 1 }]}>
                      {shortMonthLabel(f.month)}
                    </Text>
                    <Text
                      style={[
                        F(800),
                        mono,
                        { fontSize: 16, color: f.pessimista < 0 ? C.accentInk : C.text },
                      ]}>
                      {f.variavel > 0
                        ? `${curto(f.pessimista)} a ${curto(f.otimista)}`
                        : curto(f.otimista)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Meta>
              {proximos.some((f) => f.variavel > 0)
                ? 'O primeiro número já desconta o que você costuma gastar fora das contas fixas. O segundo é se você não gastar mais nada.'
                : 'Só o que já está marcado como todo mês. Conforme você for anotando, eu desconto daqui o gasto do dia a dia.'}
            </Meta>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = {
  head: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: PAD,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  mes: { fontSize: 13, letterSpacing: 0.52 },
  heroi: { fontSize: 58, letterSpacing: -1.5, lineHeight: 66 },
  veredicto: { fontSize: 30, lineHeight: 36 },
  corpo: { fontSize: 15, lineHeight: 23 },
  linha: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SP.md,
    paddingVertical: 11,
  },
};
