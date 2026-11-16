import { ErroApi } from '../middlewares/erros.ts';

export function inteiroPositivo(valor: unknown, campo = 'id'): number {
  const n = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  if (!Number.isSafeInteger(n as number) || (n as number) < 1) {
    throw new ErroApi(400, 'Dados inválidos.', { [campo]: 'Informe um inteiro positivo.' });
  }
  return n as number;
}

export function texto(valor: unknown, campo: string, max: number): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) {
    throw new ErroApi(400, 'Dados inválidos.', { [campo]: `Informe ${campo} com 1 a ${max} caracteres.` });
  }
  return valor.trim();
}

export function tipoMovimento(valor: unknown): 'entrada' | 'saida' {
  if (valor !== 'entrada' && valor !== 'saida') {
    throw new ErroApi(400, 'Dados inválidos.', { tipo: 'Use entrada ou saida.' });
  }
  return valor;
}

export function dataValida(valor: unknown, campo = 'data'): string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroApi(400, 'Dados inválidos.', { [campo]: 'Use AAAA-MM-DD.' });
  }
  const [a, m, d] = valor.split('-').map(Number);
  if (new Date(Date.UTC(a, m - 1, d)).toISOString().slice(0, 10) !== valor) {
    throw new ErroApi(400, 'Dados inválidos.', { [campo]: 'Data inexistente.' });
  }
  return valor;
}

export function centavosPositivos(valor: unknown): number {
  if ((typeof valor !== 'string' && typeof valor !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(valor))) {
    throw new ErroApi(400, 'Dados inválidos.', { valor: 'Informe valor positivo com até duas casas decimais.' });
  }
  const centavos = Math.round(Number(valor) * 100);
  if (!Number.isSafeInteger(centavos) || centavos < 1 || centavos > 999999999999) {
    throw new ErroApi(400, 'Dados inválidos.', { valor: 'Valor fora do intervalo permitido.' });
  }
  return centavos;
}

export function intervalo(inicio: unknown, fim: unknown): { inicio: string; fim: string } {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ultimo = new Date(ano, hoje.getMonth() + 1, 0).getDate();
  const i = dataValida(inicio ?? `${ano}-${mes}-01`, 'inicio');
  const f = dataValida(fim ?? `${ano}-${mes}-${String(ultimo).padStart(2, '0')}`, 'fim');
  if (i > f) throw new ErroApi(400, 'Dados inválidos.', { fim: 'Fim deve ser igual ou posterior ao início.' });
  return { inicio: i, fim: f };
}

export function mesAnteriorMesmaDuracao(inicio: string, fim: string) {
  const [ai, mi, di] = inicio.split('-').map(Number);
  const [af, mf, df] = fim.split('-').map(Number);
  const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes: 1 a 12
  const doisDigitos = (n: number) => String(n).padStart(2, '0');

  if (di === 1 && ai === af && mi === mf && df === ultimoDia(af, mf)) {
    const ano = mi === 1 ? ai - 1 : ai;
    const mes = mi === 1 ? 12 : mi - 1;
    return {
      inicio: `${ano}-${doisDigitos(mes)}-01`,
      fim: `${ano}-${doisDigitos(mes)}-${doisDigitos(ultimoDia(ano, mes))}`,
    };
  }

  const inicioMs = Date.UTC(ai, mi - 1, di);
  const fimMs = Date.UTC(af, mf - 1, df);
  const dias = Math.round((fimMs - inicioMs) / 86400000) + 1;
  const d = new Date(inicioMs - dias * 86400000);
  const a = new Date(inicioMs - 86400000);
  return { inicio: d.toISOString().slice(0, 10), fim: a.toISOString().slice(0, 10) };
}

export function erroDeBanco(e: unknown): never {
  const codigo = (e as { code?: string }).code;
  if (codigo === '23505') throw new ErroApi(409, 'Já existe um registro com esse nome para o usuário.');
  if (codigo === '23503') throw new ErroApi(409, 'Não é possível excluir: há lançamentos vinculados.');
  if (codigo === '23514') throw new ErroApi(400, 'Dados inválidos para as restrições do banco.');
  throw e;
}