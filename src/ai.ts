// Tipos do SDK oficial, runtime via fetch: o SDK importa node:fs e não empacota
// no React Native. `import type` some na compilação, então nada dele vai no bundle.
import type Anthropic from '@anthropic-ai/sdk';
import { Platform } from 'react-native';
import { CATEGORIES, type Tx } from './types';
import { todayISO } from './budget';
import { newId } from './store';

// Modelo mais barato que lê PDF e imagem. Trocar aqui e só aqui.
const MODEL = 'claude-haiku-4-5';

export type Doc = { base64: string; mediaType: string; name: string };
export type ExtractInput = { kind: 'text'; text: string } | { kind: 'files'; files: Doc[] };

const SYSTEM = `Você extrai lançamentos financeiros de documentos e frases em português do Brasil.
Responda SEMPRE chamando a ferramenta salvar. Valores em reais, sempre positivos.

Fatura de cartão de crédito: kind=invoice, um item por compra da fatura,
dueDate = data de vencimento da fatura, date = data da compra.
Pagamento de fatura anterior, estorno e crédito viram type=income.
Parcelas viram installment no formato "3/12".

Conta/boleto (água, luz, gás, internet, telefone, condomínio, mensalidade):
kind=bill, UM único item com o valor total a pagar, date = data de emissão
(ou hoje se não houver), dueDate = data de vencimento, recurring=true.
Ignore histórico de consumo, leitura de medidor, código de barras e multas já
embutidas no total.

Contracheque/holerite: kind=payslip, UM único item, o valor LÍQUIDO a receber,
type=income, category=Salário, recurring=true. Não liste descontos nem o bruto.

Frase do usuário: kind=manual, normalmente um item. Se não houver data, use hoje.

Vários arquivos juntos costumam ser páginas do MESMO documento: trate como um só
e não repita o mesmo lançamento que aparece em duas páginas.

Nunca invente valor, data ou item que não esteja na entrada.`;

const TOOL: Anthropic.Tool = {
  name: 'salvar',
  description: 'Grava os lançamentos extraídos.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['invoice', 'bill', 'payslip', 'manual'] },
      dueDate: { type: 'string', description: 'YYYY-MM-DD, vencimento da fatura/conta ou data do pagamento' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['expense', 'income'] },
            date: { type: 'string', description: 'YYYY-MM-DD' },
            amount: { type: 'number' },
            description: { type: 'string' },
            category: { type: 'string', enum: [...CATEGORIES] },
            installment: { type: 'string', description: 'ex: 3/12' },
            recurring: { type: 'boolean' },
          },
          required: ['type', 'date', 'amount', 'description', 'category'],
        },
      },
    },
    required: ['kind', 'items'],
  },
};

type RawItem = {
  type?: string;
  date?: string;
  amount?: number;
  description?: string;
  category?: string;
  installment?: string;
  recurring?: boolean;
};
type RawOut = { kind?: string; dueDate?: string; items?: RawItem[] };

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Saída de LLM é entrada não confiável: nada entra no banco sem passar por aqui. */
function toTx(out: RawOut, source: Tx['source'], batchId: string): Tx[] {
  const today = todayISO();
  const due = isDate(out.dueDate) ? out.dueDate : undefined;
  return (out.items ?? [])
    .map((it): Tx | null => {
      const amount = Number(it.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const type = it.type === 'income' ? 'income' : 'expense';
      const date = isDate(it.date) ? it.date! : today;
      return {
        id: newId(),
        type,
        amount: Math.round(amount * 100) / 100,
        date,
        dueDate: source === 'invoice' || source === 'bill' ? due : undefined,
        description: (it.description ?? 'Sem descrição').slice(0, 80),
        category: (CATEGORIES as readonly string[]).includes(it.category ?? '')
          ? it.category!
          : 'Outros',
        source,
        recurring: it.recurring || undefined,
        installment: /^\d+\/\d+$/.test(it.installment ?? '') ? it.installment : undefined,
        batchId,
      };
    })
    .filter((t): t is Tx => t !== null);
}

export class MissingKey extends Error {
  constructor() {
    super('Configure sua chave da Anthropic em Ajustes.');
  }
}

export class EncryptedPdf extends Error {
  constructor(name: string) {
    super(
      `"${name}" está protegido por senha e a IA não consegue abrir. ` +
        'Abra o PDF, digite a senha e salve/imprima uma cópia sem senha — ' +
        'ou mande prints das páginas, que dá para enviar vários de uma vez.'
    );
  }
}

/**
 * PDF com senha (fatura de banco) chegaria na API como bytes ilegíveis: erro
 * incompreensível e token gasto à toa. Barrar aqui custa nada.
 * Fail-open de propósito: na dúvida deixa passar, é a API que decide.
 */
const isEncryptedPdf = (base64: string) => {
  try {
    const bin = globalThis.atob(base64);
    return /\/Encrypt\s*(\d+\s+\d+\s+R|<<)/.test(bin);
  } catch {
    return false;
  }
};

const docBlock = (d: Doc): Anthropic.ContentBlockParam =>
  d.mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.base64 } }
    : {
        type: 'image',
        source: {
          type: 'base64',
          media_type: d.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          data: d.base64,
        },
      };

/** Única chamada de API do app. Não grava nada: devolve para a tela confirmar. */
export async function extract(input: ExtractInput, apiKey: string): Promise<Tx[]> {
  if (!apiKey.trim()) throw new MissingKey();

  const hoje = `Hoje é ${todayISO()}.`;

  let content: Anthropic.ContentBlockParam[];
  if (input.kind === 'text') {
    content = [{ type: 'text', text: `${hoje}\n\n${input.text}` }];
  } else {
    for (const d of input.files) {
      if (d.mediaType === 'application/pdf' && isEncryptedPdf(d.base64)) throw new EncryptedPdf(d.name);
    }
    const nomes = input.files.map((d) => d.name).join(', ');
    content = [
      ...input.files.map(docBlock),
      { type: 'text', text: `${hoje}\nArquivo(s): ${nomes}. Extraia os lançamentos.` },
    ];
  }

  const body: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: input.kind === 'text' ? 1024 : 8000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'salvar' },
    messages: [{ role: 'user', content }],
  };

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      // Sem servidor no meio, a chamada sai do próprio navegador na versão web.
      ...(Platform.OS === 'web' ? { 'anthropic-dangerous-direct-browser-access': 'true' } : null),
    },
    body: JSON.stringify(body),
  });

  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message ?? `Erro ${r.status} da API.`);

  const res = json as Anthropic.Message;
  const call = res.content.find((b) => b.type === 'tool_use');
  if (!call) throw new Error('A IA não devolveu lançamentos. Tente de novo.');

  const out = call.input as RawOut;
  const source: Tx['source'] =
    out.kind === 'invoice' || out.kind === 'bill' || out.kind === 'payslip'
      ? out.kind
      : 'manual';
  const txs = toTx(out, source, newId());

  if (!txs.length) throw new Error('Nada reconhecido nesse conteúdo.');
  if (res.stop_reason === 'max_tokens') {
    txs[txs.length - 1].description += ' (leitura truncada — confira o fim da fatura)';
  }
  return txs;
}

/**
 * Rede de segurança para quando não há chave configurada: entende "uber 32,50".
 * ponytail: regex burra de propósito. Quem quiser data, categoria e parcela põe a chave.
 */
export function localParse(text: string): Tx[] {
  const m = text.match(/(-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:\.\d+)?)\s*(?:reais|r\$)?\s*$/i)
    ?? text.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:\.\d+)?)/i);
  if (!m) return [];
  const amount = Number(m[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const description = text.replace(m[0], '').replace(/r\$/i, '').trim() || 'Lançamento';
  return [
    {
      id: newId(),
      type: 'expense',
      amount,
      date: todayISO(),
      description: description.slice(0, 80),
      category: 'Outros',
      source: 'manual',
    },
  ];
}
