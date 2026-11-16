export const moeda = (valor: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));

export const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export const mesBR = (referencia: string) => referencia.split('-').reverse().join('/');

export const pct = (valor: number | null) => (valor === null ? '—' : `${valor.toLocaleString('pt-BR')}%`);

export function mesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ultimo = new Date(ano, hoje.getMonth() + 1, 0).getDate();
  return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimo).padStart(2, '0')}` };
}