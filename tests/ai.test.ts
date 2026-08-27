import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extract, EncryptedPdf, MissingKey } from '../src/ai.ts';

const PDF_OK = Buffer.from('%PDF-1.4\ntrailer\n<< /Size 6 /Root 1 0 R >>\n%%EOF\n').toString('base64');
const PDF_COM_SENHA = Buffer.from(
  '%PDF-1.4\ntrailer\n<< /Size 6 /Root 1 0 R /Encrypt 6 0 R >>\n%%EOF\n'
).toString('base64');

const resposta = (input: unknown) =>
  new Response(
    JSON.stringify({
      content: [{ type: 'tool_use', name: 'salvar', input }],
      stop_reason: 'tool_use',
    }),
    { status: 200 }
  );

/** Troca o fetch global e devolve o que foi enviado. */
function espiao(body: unknown) {
  const calls: RequestInit[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return resposta(body);
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

test('o header que libera o CORS no navegador vai em toda chamada', async () => {
  // Sem ele o navegador barra com "Failed to fetch" e o app fica inútil na web.
  // Já quebrou uma vez porque estava atrás de uma checagem de plataforma.
  const s = espiao({ kind: 'manual', items: [{ type: 'expense', date: '2026-08-27', amount: 10, description: 'x', category: 'Outros' }] });
  try {
    await extract({ kind: 'text', text: 'café 10' }, 'sk-ant-teste');
    const h = s.calls[0].headers as Record<string, string>;
    assert.equal(h['anthropic-dangerous-direct-browser-access'], 'true');
    assert.equal(h['anthropic-version'], '2023-06-01');
    assert.equal(h['x-api-key'], 'sk-ant-teste');
  } finally {
    s.restore();
  }
});

test('a tool é forçada, para a saída vir como JSON validado', async () => {
  const s = espiao({ kind: 'manual', items: [{ type: 'expense', date: '2026-08-27', amount: 10, description: 'x', category: 'Outros' }] });
  try {
    await extract({ kind: 'text', text: 'café 10' }, 'k');
    const body = JSON.parse(String(s.calls[0].body));
    assert.deepEqual(body.tool_choice, { type: 'tool', name: 'salvar' });
    assert.equal(body.model, 'claude-haiku-4-5');
  } finally {
    s.restore();
  }
});

test('PDF com senha é barrado antes de gastar token', async () => {
  const s = espiao({});
  try {
    await assert.rejects(
      () =>
        extract(
          { kind: 'files', files: [{ base64: PDF_COM_SENHA, mediaType: 'application/pdf', name: 'fatura.pdf' }] },
          'k'
        ),
      EncryptedPdf
    );
    assert.equal(s.calls.length, 0, 'nenhuma chamada de API pode ter saído');
  } finally {
    s.restore();
  }
});

test('PDF sem senha passa', async () => {
  const s = espiao({ kind: 'bill', dueDate: '2026-09-10', items: [{ type: 'expense', date: '2026-08-27', amount: 42.1, description: 'Luz', category: 'Moradia' }] });
  try {
    const r = await extract(
      { kind: 'files', files: [{ base64: PDF_OK, mediaType: 'application/pdf', name: 'luz.pdf' }] },
      'k'
    );
    assert.equal(s.calls.length, 1);
    assert.equal(r.items[0].amount, 42.1);
    assert.equal(r.items[0].dueDate, '2026-09-10');
  } finally {
    s.restore();
  }
});

test('sem chave nem tenta a rede', async () => {
  const s = espiao({});
  try {
    await assert.rejects(() => extract({ kind: 'text', text: 'x' }, '  '), MissingKey);
    assert.equal(s.calls.length, 0);
  } finally {
    s.restore();
  }
});

test('saída da IA é filtrada: valor inválido e categoria inventada não entram', async () => {
  const s = espiao({
    kind: 'manual',
    items: [
      { type: 'expense', date: '2026-08-27', amount: 0, description: 'zero', category: 'Outros' },
      { type: 'expense', date: 'ontem', amount: 12.5, description: 'ok', category: 'Criptomoeda' },
    ],
  });
  try {
    const r = await extract({ kind: 'text', text: 'x' }, 'k');
    assert.equal(r.items.length, 1, 'o item de valor zero tem que sumir');
    assert.equal(r.items[0].category, 'Outros', 'categoria fora do enum vira Outros');
    assert.match(r.items[0].date, /^\d{4}-\d{2}-\d{2}$/, 'data inválida vira hoje');
  } finally {
    s.restore();
  }
});

test('a divergência com o total declarado vira aviso com o valor exato', async () => {
  const s = espiao({
    kind: 'invoice',
    dueDate: '2026-08-10',
    declaredTotal: 100,
    items: [{ type: 'expense', date: '2026-08-01', amount: 70, description: 'compra', category: 'Compras' }],
  });
  try {
    const r = await extract(
      { kind: 'files', files: [{ base64: PDF_OK, mediaType: 'application/pdf', name: 'f.pdf' }] },
      'k'
    );
    assert.equal(r.warning?.diff, 30);
    assert.equal(r.warning?.dueDate, '2026-08-10');
  } finally {
    s.restore();
  }
});
