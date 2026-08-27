import { File } from 'expo-file-system';

/** Nativo: o picker copia para o cache e lemos o arquivo de lá. */
export const readBase64 = async (uri: string) => new File(uri).base64();
