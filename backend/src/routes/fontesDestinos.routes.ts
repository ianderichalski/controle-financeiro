import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { ErroApi } from '../middlewares/erros.ts';
import { inteiroPositivo, texto, erroDeBanco } from '../config/validacao.ts';
import * as fontes from '../models/fontesDestinos.ts';
import type { DadosFonteDestino, TipoFonteDestino } from '../models/tipos.ts';

function validar(d: Record<string, unknown> | undefined): DadosFonteDestino {
  const nome = texto(d?.nome, 'nome', 60);
  const tipo = d?.tipo;
  if (tipo !== 'renda' && tipo !== 'conta' && tipo !== 'cartao_credito') {
    throw new ErroApi(400, 'Dados inválidos.', { tipo: 'Use renda, conta ou cartao_credito.' });
  }
  if (tipo !== 'cartao_credito') return { nome, tipo, diaFechamento: null, diaVencimento: null, limite: null };
  const diaFechamento = d?.diaFechamento ?? d?.dia_fechamento;
  const diaVencimento = d?.diaVencimento ?? d?.dia_vencimento;
  const limite = d?.limite;
  if (![diaFechamento, diaVencimento].every(n => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 31)) {
    throw new ErroApi(400, 'Dados inválidos.', { diaFechamento: 'Fechamento e vencimento obrigatórios entre 1 e 31.' });
  }
  if ((typeof limite !== 'string' && typeof limite !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(limite)) || !Number.isFinite(Number(limite)) || Number(limite) > 9999999999.99) {
    throw new ErroApi(400, 'Dados inválidos.', { limite: 'Informe limite válido e não negativo.' });
  }
  return { nome, tipo: tipo as TipoFonteDestino, diaFechamento: diaFechamento as number, diaVencimento: diaVencimento as number, limite: Number(limite) };
}

const router = Router();
router.use(autenticar);
router.get('/', async (req, res) => { res.json(await fontes.listarFontes(req.usuarioId)); });
router.get('/:id', async (req, res) => {
  const f = await fontes.buscarFonte(req.usuarioId, inteiroPositivo(req.params.id));
  if (!f) throw new ErroApi(404, 'Fonte/destino não encontrada.');
  res.json(f);
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await fontes.criarFonte(req.usuarioId, validar(req.body))); }
  catch (e) { erroDeBanco(e); }
});
router.put('/:id', async (req, res) => {
  try {
    const resultado = await fontes.atualizarFonte(req.usuarioId, inteiroPositivo(req.params.id), validar(req.body));
    if (!resultado) throw new ErroApi(404, 'Fonte/destino não encontrada.');
    if (resultado === 'vinculada') throw new ErroApi(409, 'Não altere o tipo de fonte/destino com lançamentos vinculados.');
    res.json(resultado);
  } catch (e) { erroDeBanco(e); }
});
router.delete('/:id', async (req, res) => {
  try {
    if (!(await fontes.excluirFonte(req.usuarioId, inteiroPositivo(req.params.id)))) throw new ErroApi(404, 'Fonte/destino não encontrada.');
    res.status(204).end();
  } catch (e) { erroDeBanco(e); }
});
export default router;
