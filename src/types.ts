export type TxType = 'expense' | 'income';

export type Tx = {
  id: string;
  type: TxType;
  amount: number; // BRL, sempre positivo
  date: string; // YYYY-MM-DD, quando aconteceu
  dueDate?: string; // YYYY-MM-DD, quando o dinheiro sai/entra
  description: string;
  category: string;
  source: 'manual' | 'invoice' | 'payslip' | 'bill';
  recurring?: boolean;
  installment?: string; // '3/12'
  batchId?: string;
};

export type Settings = {
  apiKey: string;
  reserva: number;
  /** Falso até ela responder as três perguntas iniciais. */
  onboarded?: boolean;
};

export type DB = { tx: Tx[]; settings: Settings };

export const CATEGORIES = [
  'Moradia',
  'Mercado',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Assinaturas',
  'Serviços',
  'Impostos',
  'Salário',
  'Renda extra',
  'Outros',
] as const;
