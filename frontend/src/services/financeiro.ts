export interface Categoria { id: number; nome: string; tipo: 'entrada'|'saida' }
export interface FonteDestino { id: number; nome: string; tipo: 'renda'|'conta'|'cartao_credito'; dia_fechamento: number|null; dia_vencimento: number|null; limite: string|null }
export interface Lancamento {
  id: number; descricao: string; tipo: 'entrada'|'saida'; valor: string; data: string;
  categoria_id: number; fonte_destino_id: number; categoria_nome: string;
  fonte_destino_nome: string; parcela_atual: number; total_parcelas: number;
}
export interface Listagem {
  itens: Lancamento[]; pagina: number; totalPaginas: number; totalRegistros: number;
  totais: { entradas: number; saidas: number; saldo: number };
}
export interface Relatorio {
  periodo: {inicio:string;fim:string}; periodoAnterior:{inicio:string;fim:string}; totalSaidas:number; totalEntradas:number;
  categorias: {id:number;nome:string;total:number;percentual:number;periodoAnterior:number;variacaoPercentual:number|null;diferenca:number}[];
  entradas: {id:number;nome:string;total:number;periodoAnterior:number}[];
}
export class ErroRequisicao extends Error {
  status: number;
  constructor(status:number, mensagem:string){super(mensagem);this.status=status;}
}
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export function criarClienteFinanceiro(obterToken:()=>string|null) {
  return async function solicitar<T>(path:string, init:RequestInit={}):Promise<T> {
    const token=obterToken();
    if(!token) throw new ErroRequisicao(401,'Faça login para acessar seus dados.');
    let response: Response;
    try {
      const headers=new Headers(init.headers);
      headers.set('Content-Type','application/json');
      headers.set('Authorization',`Bearer ${token}`);
      response=await fetch(`${BASE}${path}`, { ...init, headers });
    } catch { throw new ErroRequisicao(0, 'Não foi possível conectar ao servidor.'); }
    if(response.status===204) return undefined as T;
    const data:unknown=await response.json().catch(()=>({}));
    if(!response.ok){
      const body=data as {erro?:string; campos?:Record<string,string>};
      const detalhe=body.campos?Object.values(body.campos).join(' '):'';
      throw new ErroRequisicao(response.status,`${body.erro ?? 'Falha na requisição.'} ${detalhe}`.trim());
    }
    return data as T;
  };
}
export function parametros(filtros:Record<string, string|number|undefined>) {
  const query=new URLSearchParams();
  for(const [k,v] of Object.entries(filtros))if(v!==undefined&&v!=='') query.set(k,String(v));
  return query.toString();
}
export const moeda=(v:number|string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
export const dataBR=(iso:string)=>iso?.slice(0,10).split('-').reverse().join('/') || '';
export function mesAtual(){
  const d=new Date(), a=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0');
  return { inicio:`${a}-${m}-01`, fim:`${a}-${m}-${String(new Date(a,d.getMonth()+1,0).getDate()).padStart(2,'0')}` };
}
