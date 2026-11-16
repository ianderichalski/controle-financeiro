import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { ErroApi } from '../middlewares/erros.ts';
import { inteiroPositivo, tipoMovimento, texto, dataValida, centavosPositivos, intervalo, erroDeBanco } from '../config/validacao.ts';
import * as lancamentos from '../models/lancamentos.ts';

function validar(d: Record<string, unknown> | undefined) {
  return {
    tipo: tipoMovimento(d?.tipo),
    descricao: texto(d?.descricao, 'descricao', 120),
    valorCentavos: centavosPositivos(d?.valor),
    data: dataValida(d?.data),
    categoriaId: inteiroPositivo(d?.categoriaId ?? d?.categoria_id, 'categoriaId'),
    fonteDestinoId: inteiroPositivo(d?.fonteDestinoId ?? d?.fonte_destino_id, 'fonteDestinoId'),
  };
}
function queryInteiro(valor: unknown, campo: string, padrao?: number) {
  return inteiroPositivo(valor === undefined ? padrao : valor, campo);
}
const router = Router();
router.use(autenticar);
router.get('/', async (req, res) => {
  const { inicio, fim } = intervalo(req.query.inicio, req.query.fim);
  const tipo = req.query.tipo === undefined ? undefined : tipoMovimento(req.query.tipo);
  const categoriaId = req.query.categoriaId === undefined ? undefined : inteiroPositivo(req.query.categoriaId, 'categoriaId');
  const fonteDestinoId = req.query.fonteDestinoId === undefined ? undefined : inteiroPositivo(req.query.fonteDestinoId, 'fonteDestinoId');
  const pagina = queryInteiro(req.query.pagina, 'pagina', 1);
  const porPagina = queryInteiro(req.query.porPagina, 'porPagina', 20);
  if (porPagina > 100) throw new ErroApi(400, 'Dados inválidos.', { porPagina: 'Máximo 100.' });
  res.json(await lancamentos.listarLancamentos(req.usuarioId, { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina, porPagina }));
});
router.get('/:id', async (req, res) => {
  const item = await lancamentos.buscarLancamento(req.usuarioId, inteiroPositivo(req.params.id));
  if (!item) throw new ErroApi(404, 'Lançamento não encontrado.');
  res.json(item);
});
router.post('/', async (req, res) => {
  const dados = validar(req.body);
  const parcelas = queryInteiro(req.body?.totalParcelas ?? req.body?.total_parcelas, 'totalParcelas', 1);
  if (parcelas > 48) throw new ErroApi(400, 'Dados inválidos.', { totalParcelas: 'O máximo é 48 parcelas.' });
  try { res.status(201).json({ lancamentos: await lancamentos.criarLancamento(req.usuarioId, dados, parcelas) }); }
  catch (e) { erroDeBanco(e); }
});
router.put('/:id', async (req, res) => {
  try {
    const item = await lancamentos.atualizarLancamento(req.usuarioId, inteiroPositivo(req.params.id), validar(req.body));
    if (!item) throw new ErroApi(404, 'Lançamento não encontrado.');
    res.json(item);
  } catch (e) { erroDeBanco(e); }
});
router.delete('/:id', async (req, res) => {
  const qtd = await lancamentos.excluirLancamento(req.usuarioId, inteiroPositivo(req.params.id), req.query.todasParcelas === 'true');
  if (!qtd) throw new ErroApi(404, 'Lançamento não encontrado.');
  res.status(204).end();
});
export default router;
