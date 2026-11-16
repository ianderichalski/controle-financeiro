import axios, { AxiosError } from 'axios';

export interface RespostaErro {
  erro: string;
  campos?: Record<string, string>;
}

export type TipoMovimento = 'entrada' | 'saida';

export interface Categoria {
  id: number;
  nome: string;
  tipo: TipoMovimento;
}

export interface FonteDestino {
  id: number;
  nome: string;
  tipo: 'renda' | 'conta' | 'cartao_credito';
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  limite: string | null;
}

export interface Lancamento {
  id: number;
  tipo: TipoMovimento;
  descricao: string;
  valor: string;
  data: string;
  categoria_id: number;
  fonte_destino_id: number;
  categoria_nome: string;
  fonte_destino_nome: string;
  parcela_atual: number;
  total_parcelas: number;
}

export interface Listagem {
  itens: Lancamento[];
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  totais: { entradas: number; saidas: number; saldo: number };
}

export const CHAVE_TOKEN = 'token';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let aoNaoAutorizado: (() => void) | null = null;

export function registrarLogout(fn: () => void) {
  aoNaoAutorizado = fn;
}

api.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError<RespostaErro>) => {
    const ehLogin = erro.config?.url === '/auth/login';
    if (erro.response?.status === 401 && !ehLogin && aoNaoAutorizado) {
      aoNaoAutorizado();
    }
    return Promise.reject(erro);
  },
);

export function extrairErro(erro: unknown): RespostaErro {
  if (axios.isAxiosError<RespostaErro>(erro) && erro.response?.data?.erro) {
    return erro.response.data;
  }
  return { erro: 'Não foi possível conectar ao servidor.' };
}

export default api;