import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api, { extrairErro } from '../services/api';
import type { Categoria, TipoMovimento } from '../services/api';

const nomeTipo = { entrada: 'Entrada', saida: 'Saída' };

export default function Categorias() {
  const [itens, setItens] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMovimento>('saida');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .get<Categoria[]>('/categorias')
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
    setTipo('saida');
    setErros({});
  }

  function editar(categoria: Categoria) {
    setIdEditando(categoria.id);
    setNome(categoria.nome);
    setTipo(categoria.tipo);
    setErros({});
    setErro('');
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');

    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = 'Informe o nome.';
    else if (nome.trim().length > 60) novosErros.nome = 'O nome deve ter no máximo 60 caracteres.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      if (idEditando === null) await api.post('/categorias', { nome, tipo });
      else await api.put(`/categorias/${idEditando}`, { nome, tipo });
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

  async function excluir(categoria: Categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    setErro('');
    try {
      await api.delete(`/categorias/${categoria.id}`);
      recarregar();
    } catch (e) {
      setErro(extrairErro(e).erro);
    }
  }

  return (
    <section>
      <h1 className="h3 mb-4">Categorias</h1>

      <form onSubmit={salvar} noValidate className="card card-body mb-4">
        <h2 className="h5 mb-3">{idEditando === null ? 'Nova categoria' : 'Editar categoria'}</h2>
        <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="nome" className="form-label">Nome</label>
          <input id="nome" className={`form-control${erros.nome ? ' is-invalid' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} />
          {erros.nome && <div className="invalid-feedback">{erros.nome}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="tipo" className="form-label">Tipo</label>
          <select id="tipo" className={`form-select${erros.tipo ? ' is-invalid' : ''}`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
          {erros.tipo && <div className="invalid-feedback">{erros.tipo}</div>}
        </div>
        </div>
        <div className="mt-3">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{idEditando === null ? 'Criar' : 'Salvar'}</button>
        {idEditando !== null && <button type="button" className="btn btn-secondary ms-2" onClick={limpar}>Cancelar</button>}
        </div>
      </form>

      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}

      {carregando ? (
        <p className="text-muted">Carregando categorias...</p>
      ) : itens.length === 0 ? (
        <p className="text-muted">Nenhuma categoria cadastrada.</p>
      ) : (
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {itens.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{nomeTipo[c.tipo]}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => editar(c)}>Editar</button>{' '}
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => excluir(c)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}