import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api, { extrairErro } from '../services/api';
import type { FonteDestino } from '../services/api';
import { moeda } from '../services/formatos';

type TipoFonte = FonteDestino['tipo'];
const nomeTipo = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };

export default function FontesDestinos() {
  const [itens, setItens] = useState<FonteDestino[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0); // muda para recarregar a lista
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoFonte>('conta');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [limite, setLimite] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .get<FonteDestino[]>('/fontes-destinos')
      .then((resposta) => { if (ativo) setItens(resposta.data); })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [versao]);

  function recarregar() {
    setCarregando(true);
    setVersao((v) => v + 1);
  }

  function limpar() {
    setIdEditando(null);
    setNome('');
    setTipo('conta');
    setDiaFechamento('');
    setDiaVencimento('');
    setLimite('');
    setErros({});
  }

  function editar(f: FonteDestino) {
    setIdEditando(f.id);
    setNome(f.nome);
    setTipo(f.tipo);
    setDiaFechamento(f.dia_fechamento === null ? '' : String(f.dia_fechamento));
    setDiaVencimento(f.dia_vencimento === null ? '' : String(f.dia_vencimento));
    setLimite(f.limite ?? '');
    setErros({});
    setErro('');
  }

  const diaValido = (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');

    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = 'Informe o nome.';
    else if (nome.trim().length > 60) novosErros.nome = 'O nome deve ter no máximo 60 caracteres.';
    if (tipo === 'cartao_credito') {
      if (!diaValido(diaFechamento)) novosErros.diaFechamento = 'Informe um dia de 1 a 31.';
      if (!diaValido(diaVencimento)) novosErros.diaVencimento = 'Informe um dia de 1 a 31.';
      if (limite === '' || Number(limite) < 0) novosErros.limite = 'Informe o limite do cartão.';
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const corpo = {
      nome,
      tipo,
      ...(tipo === 'cartao_credito' && {
        diaFechamento: Number(diaFechamento),
        diaVencimento: Number(diaVencimento),
        limite: Number(limite),
      }),
    };

    setEnviando(true);
    try {
      if (idEditando === null) await api.post('/fontes-destinos', corpo);
      else await api.put(`/fontes-destinos/${idEditando}`, corpo);
      limpar();
      recarregar();
    } catch (e) {
      const resposta = extrairErro(e);
      setErros(resposta.campos ?? {});
      setErro(resposta.erro);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(f: FonteDestino) {
    if (!window.confirm(`Excluir "${f.nome}"?`)) return;
    setErro('');
    try {
      await api.delete(`/fontes-destinos/${f.id}`);
      recarregar();
    } catch (e) {
      setErro(extrairErro(e).erro);
    }
  }

  return (
    <section>
      <h1 className="h3 mb-4">Fontes e destinos</h1>

      <form onSubmit={salvar} noValidate className="card card-body mb-4">
        <h2 className="h5 mb-3">{idEditando === null ? 'Nova fonte/destino' : 'Editar fonte/destino'}</h2>
        <div className="row g-3">
        <div className="col-md-4">
          <label htmlFor="nome" className="form-label">Nome</label>
          <input id="nome" className={`form-control${erros.nome ? ' is-invalid' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} />
          {erros.nome && <div className="invalid-feedback">{erros.nome}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="tipo" className="form-label">Tipo</label>
          <select id="tipo" className={`form-select${erros.tipo ? ' is-invalid' : ''}`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoFonte)}>
            <option value="conta">Conta</option>
            <option value="renda">Renda</option>
            <option value="cartao_credito">Cartão de crédito</option>
          </select>
          {erros.tipo && <div className="invalid-feedback">{erros.tipo}</div>}
        </div>

        {tipo === 'cartao_credito' && (
          <>
            <div className="col-md-4">
              <label htmlFor="diaFechamento" className="form-label">Dia de fechamento</label>
              <input id="diaFechamento" className={`form-control${erros.diaFechamento ? ' is-invalid' : ''}`} type="number" min="1" max="31" value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value)} />
              {erros.diaFechamento && <div className="invalid-feedback">{erros.diaFechamento}</div>}
            </div>
            <div className="col-md-4">
              <label htmlFor="diaVencimento" className="form-label">Dia de vencimento</label>
              <input id="diaVencimento" className={`form-control${erros.diaVencimento ? ' is-invalid' : ''}`} type="number" min="1" max="31" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} />
              {erros.diaVencimento && <div className="invalid-feedback">{erros.diaVencimento}</div>}
            </div>
            <div className="col-md-4">
              <label htmlFor="limite" className="form-label">Limite (R$)</label>
              <input id="limite" className={`form-control${erros.limite ? ' is-invalid' : ''}`} type="number" min="0" step="0.01" value={limite} onChange={(e) => setLimite(e.target.value)} />
              {erros.limite && <div className="invalid-feedback">{erros.limite}</div>}
            </div>
          </>
        )}

        </div>
        <div className="mt-3">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{idEditando === null ? 'Criar' : 'Salvar'}</button>
        {idEditando !== null && <button type="button" className="btn btn-secondary ms-2" onClick={limpar}>Cancelar</button>}
        </div>
      </form>

      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}

      {carregando ? (
        <p className="text-muted">Carregando fontes e destinos...</p>
      ) : itens.length === 0 ? (
        <p className="text-muted">Nenhuma fonte/destino cadastrada.</p>
      ) : (
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th>Fechamento</th><th>Vencimento</th><th>Limite</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {itens.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{nomeTipo[f.tipo]}</td>
                <td>{f.dia_fechamento ?? '—'}</td>
                <td>{f.dia_vencimento ?? '—'}</td>
                <td>{f.limite === null ? '—' : moeda(f.limite)}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => editar(f)}>Editar</button>{' '}
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => excluir(f)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}