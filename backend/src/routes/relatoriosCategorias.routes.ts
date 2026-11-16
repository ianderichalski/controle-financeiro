import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { intervalo } from '../config/validacao.ts';
import { relatorioPorCategoria } from '../models/relatoriosCategorias.ts';

const router = Router();
router.use(autenticar);
router.get('/categorias', async (req, res) => {
  const { inicio, fim } = intervalo(req.query.inicio, req.query.fim);
  res.json(await relatorioPorCategoria(req.usuarioId, inicio, fim));
});
export default router;
