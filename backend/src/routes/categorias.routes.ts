import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { ErroApi } from '../middlewares/erros.ts';
import { inteiroPositivo, texto, tipoMovimento, erroDeBanco } from '../config/validacao.ts';
import * as categorias from '../models/categorias.ts';

const router = Router();
router.use(autenticar);
router.get('/', async (req, res) => { res.json(await categorias.listarCategorias(req.usuarioId)); });
router.get('/:id', async (req, res) => {
  const c = await categorias.buscarCategoria(req.usuarioId, inteiroPositivo(req.params.id));
  if (!c) throw new ErroApi(404, 'Categoria não encontrada.');
  res.json(c);
});
router.post('/', async (req, res) => {
  const nome = texto(req.body?.nome, 'nome', 60);
  const tipo = tipoMovimento(req.body?.tipo);
  try { res.status(201).json(await categorias.criarCategoria(req.usuarioId, nome, tipo)); }
  catch (e) { erroDeBanco(e); }
});
router.put('/:id', async (req, res) => {
  const id = inteiroPositivo(req.params.id);
  const nome = texto(req.body?.nome, 'nome', 60);
  const tipo = tipoMovimento(req.body?.tipo);
  try {
    const resultado = await categorias.atualizarCategoria(req.usuarioId, id, nome, tipo);
    if (!resultado) throw new ErroApi(404, 'Categoria não encontrada.');
    if (resultado === 'vinculada') throw new ErroApi(409, 'Não altere o tipo de uma categoria com lançamentos vinculados.');
    res.json(resultado);
  } catch (e) { erroDeBanco(e); }
});
router.delete('/:id', async (req, res) => {
  try {
    if (!(await categorias.excluirCategoria(req.usuarioId, inteiroPositivo(req.params.id)))) throw new ErroApi(404, 'Categoria não encontrada.');
    res.status(204).end();
  } catch (e) { erroDeBanco(e); }
});
export default router;
