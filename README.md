# Minhas Contas

Assistente de finanças pessoais. Você manda a fatura do cartão, o contracheque ou
só escreve "almoço 32,90"; o app grava e responde a pergunta que importa:
**posso gastar isso?**

- Sem servidor, sem login, sem assinatura.
- Os dados ficam no aparelho.
- O único custo é o token da IA, e ela só é chamada para ler documento ou frase —
  toda a conta é feita localmente, de graça.

Roda em iOS, Android e navegador (Expo SDK 57).

## Rodar

```bash
npm install
npm run web     # ou: npm run ios / npm run android
```

Abra **Ajustes**, cole uma chave da Anthropic ([console.anthropic.com](https://console.anthropic.com/settings/keys))
e defina sua reserva mensal. Sem chave o app ainda funciona, mas só entende
frases no formato `descrição 32,90`.

```bash
npm test        # motor de orçamento
```

## Instalar no celular

Sem loja, sem conta Apple, sem servidor de desenvolvimento rodando.

**iPhone e Android — o caminho fácil.** Instale o **Expo Go** (App Store ou Play
Store) e abra este link no aparelho:

```
exp://u.expo.dev/f8b7f83e-903f-4dda-a7e4-e0eefbae2dbd/group/e2d87692-155a-476f-9c4f-197be063ca5b
```

O JS vem embutido no update, então funciona sem `npm start`. Publicar uma versão
nova é `npx eas-cli update --branch preview --environment preview -m "o que mudou"`.

**Android — APK próprio.** O build de desenvolvimento sai em
[expo.dev/accounts/leonardorabelo/projects/minhascontas/builds](https://expo.dev/accounts/leonardorabelo/projects/minhascontas/builds);
baixe o `.apk` e instale. Esse precisa do Metro para carregar o JS.

**iPhone com ícone próprio** exige conta Apple Developer (US$ 99/ano) e um login
interativo na Apple. Sem ela, o Expo Go é o caminho.

## Como funciona

| | |
|---|---|
| **Ler** | `claude-haiku-4-5` transforma PDF/foto/frase em lançamentos. Uma chamada, uma tool, nada mais. |
| **Conferir** | Nada é gravado sem você ver a lista e tocar em Salvar. Dá para corrigir valor e remover linha. |
| **Calcular** | Aritmética pura em [`src/budget.ts`](src/budget.ts). Zero token. |

O "livre para gastar" é `entradas − o que já saiu − o que ainda vai sair − reserva`.
Compra no cartão conta no mês em que a fatura vence, não no dia da compra.

Salário, contas fixas e **parcelas** são projetados para os meses seguintes, então
o card "Próximos meses" mostra quanto sobra até o último `12/12` cair. Se a fatura
real daquele mês chegar, a projeção some — não conta duas vezes.

O simulador compara o que sobraria com o seu ritmo real de gastos dos últimos 30
dias e responde **Pode / Dá, mas aperta / Melhor não / Não dá**.

## Specs

Leia antes de mexer no código:

- [00 — Arquitetura](specs/00-arquitetura.md): por que não tem backend, o que cada camada faz.
- [01 — Modelo de dados](specs/01-modelo-dados.md): o formato do lançamento e por que tem duas datas.
- [02 — Camada de IA](specs/02-ia.md): prompt, contrato da tool, custo por operação.
- [03 — Motor de orçamento](specs/03-orcamento.md): projeção de recorrentes e a regra do veredicto.

## Avisos

A chave da Anthropic fica em texto no armazenamento do aparelho. Quem tem o
aparelho tem a chave. Não há backup nem sincronia: desinstalar apaga tudo.
