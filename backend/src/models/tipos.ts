export type TipoMovimento = 'entrada' | 'saida';
export type TipoFonteDestino = 'renda' | 'conta' | 'cartao_credito';
export interface DadosFonteDestino {
  nome: string;
  tipo: TipoFonteDestino;
  diaFechamento: number | null;
  diaVencimento: number | null;
  limite: number | null;
}
export interface DadosLancamento {
  tipo: TipoMovimento;
  descricao: string;
  valorCentavos: number;
  data: string;
  categoriaId: number;
  fonteDestinoId: number;
}
