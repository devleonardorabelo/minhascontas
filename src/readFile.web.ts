/**
 * Web: o picker devolve um blob: URL (não base64 — a doc do Expo diz que o
 * default é true, mas o código web usa false). expo-file-system não roda aqui.
 */
export const readBase64 = async (uri: string) => {
  if (uri.startsWith('data:')) return uri.slice(uri.indexOf(',') + 1);
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
    // readAsDataURL devolve "data:<mime>;base64,<payload>" — a API só quer o payload.
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.readAsDataURL(blob);
  });
};
