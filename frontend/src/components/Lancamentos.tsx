import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api, { extrairErro } from '../services/api';
import type { Categoria, FonteDestino, Lancamento, Listagem, TipoMovimento } from '../services/api';
import { dataBR, mesAtual, moeda } from '../services/formatos';

interface Filtros {
  inicio: string;
  fim: string;
  tipo: string;          
  categoriaId: string;     
  fonteDestinoId: string; 
}

const hoje = () => new Date().toLocaleDateString('en-CA');

export default function Lancamentos() {
  // Listagem
  const [filtros, setFiltros] = useState<Filtros>(() => ({ ...mesAtual(), tipo: '', categoriaId: '', fonteDestinoId: '' }));
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0); // muda para recarregar a lista
  const [dados, setDados] = useState<Listagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Opções dos selects
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fontes, setFontes] = useState<FonteDestino[]>([]);

  // Formulário
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoMovimento>('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState('');
  const [fonteDestinoId, setFonteDestinoId] = useState('');
  const [totalParcelas, setTotalParcelas] = useState('1');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroForm, setErroForm] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.get<Categoria[]>('/categorias'), api.get<FonteDestino[]>('/fontes-destinos')])
      .then(([c, f]) => { if (ativo) { setCategorias(c.data); setFontes(f.data); } })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    let ativo = true;
    const params = Object.fromEntries(Object.entries({ ...filtros, pagina }).filter(([, v]) => v !== ''));
    api
      .get<Listagem>('/lancamentos', { params })
      .then((resposta) => { if (ativo) { setDados(resposta.data); setErro(''); } })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [filtros, pagina, versao]);

  function mudarFiltro(campo: keyof Filtros, valorFiltro: string) {
    setCarregando(true);
    setPagina(1);
    setFiltros((f) => ({ ...f, [campo]: valorFiltro }));
  }

  function mudarPagina(nova: number) {
    setCarregando(true);
    setPagina(nova);
  }

  function recarregar() {
    setCarregando(true);
    setVersao((v) => v + 1);
  }

  function limpar() {
    setIdEditando(null);
    setTipo('saida');
    setDescricao('');
    setValor('');
    setData(hoje());
    setCategoriaId('');
    setFonteDestinoId('');
    setTotalParcelas('1');
    setErros({});
    setErroForm('');
  }

  function editar(l: Lancamento) {
    setIdEditando(l.id);
    setTipo(l.tipo);
    setDescricao(l.descricao);
    setValor(String(Number(l.valor)));
    setData(l.data.slice(0, 10));
    setCategoriaId(String(l.categoria_id));
    setFonteDestinoId(String(l.fonte_destino_id));
    setTotalParcelas('1');
    setErros({});
    setErroForm('');
  }

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const fonteEscolhida = fontes.find((f) => String(f.id) === fonteDestinoId);
  const ehCartao = fonteEscolhida?.tipo === 'cartao_credito';

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErroForm('');

    const novosErros: Record<string, string> = {};
    if (!descricao.trim()) novosErros.descricao = 'Informe a descrição.';
    if (!(Number(valor) > 0)) novosErros.valor = 'O valor deve ser maior que zero.';
    if (!data) novosErros.data = 'Informe a data.';
    if (!categoriaId) novosErros.categoriaId = 'Escolha a categoria.';
    if (!fonteDestinoId) novosErros.fonteDestinoId = 'Escolha a fonte/destino.';
    const parcelas = Number(totalParcelas);
    if (ehCartao && idEditando === null && (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48)) {
      novosErros.totalParcelas = 'Informe de 1 a 48 parcelas.';
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const corpo = {
      tipo,
      descricao,
      valor: Number(valor),
      data,
      categoriaId: Number(categoriaId),
      fonteDestinoId: Number(fonteDestinoId),
      ...(idEditando === null && ehCartao && { totalParcelas: parcelas }),
    };

    setEnviando(true);
    try {
      if (idEditando === null) await api.post('/lancamentos', corpo);
      else await api.put(`/lancamentos/${idEditando}`, corpo);
      limpar();
      recarregar();
    } catch (e) {
      const resposta = extrairErro(e);
      setErros(resposta.campos ?? {});
      setErroForm(resposta.erro);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(l: Lancamento) {
    let todas = false;
    if (l.total_parcelas > 1) {
      todas = window.confirm(
        `"${l.descricao}" é a parcela ${l.parcela_atual}/${l.total_parcelas}.\n\n` +
        'OK = excluir TODAS as parcelas da compra\nCancelar = excluir só esta parcela',
      );
    }
    if (!window.confirm(todas ? 'Confirma excluir todas as parcelas?' : 'Confirma excluir este lançamento?')) return;

    setErro('');
    try {
      await api.delete(`/lancamentos/${l.id}`, { params: todas ? { todasParcelas: true } : {} });
      recarregar();
    } catch (e) {
      setErro(extrairErro(e).erro);
    }
  }

  return (
    <section>
      <h1 className="h3 mb-4">Lançamentos</h1>

      <form onSubmit={salvar} noValidate className="card card-body mb-4">
        <h2 className="h5 mb-3">{idEditando === null ? 'Novo lançamento' : 'Editar lançamento'}</h2>
        <div className="row g-3">
        <div className="col-md-4">
          <label htmlFor="tipo" className="form-label">Tipo</label>
          <select id="tipo" className={`form-select${erros.tipo ? ' is-invalid' : ''}`} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoMovimento); setCategoriaId(''); }}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
          {erros.tipo && <div className="invalid-feedback">{erros.tipo}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="descricao" className="form-label">Descrição</label>
          <input id="descricao" className={`form-control${erros.descricao ? ' is-invalid' : ''}`} maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          {erros.descricao && <div className="invalid-feedback">{erros.descricao}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="valor" className="form-label">Valor (R$)</label>
          <input id="valor" className={`form-control${erros.valor ? ' is-invalid' : ''}`} type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          {erros.valor && <div className="invalid-feedback">{erros.valor}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="data" className="form-label">Data</label>
          <input id="data" className={`form-control${erros.data ? ' is-invalid' : ''}`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          {erros.data && <div className="invalid-feedback">{erros.data}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="categoriaId" className="form-label">Categoria</label>
          <select id="categoriaId" className={`form-select${erros.categoriaId ? ' is-invalid' : ''}`} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Selecione</option>
            {categoriasDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {erros.categoriaId && <div className="invalid-feedback">{erros.categoriaId}</div>}
        </div>
        <div className="col-md-4">
          <label htmlFor="fonteDestinoId" className="form-label">{tipo === 'entrada' ? 'Fonte' : 'Destino'}</label>
          <select id="fonteDestinoId" className={`form-select${erros.fonteDestinoId ? ' is-invalid' : ''}`} value={fonteDestinoId} onChange={(e) => setFonteDestinoId(e.target.value)}>
            <option value="">Selecione</option>
            {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {erros.fonteDestinoId && <div className="invalid-feedback">{erros.fonteDestinoId}</div>}
        </div>
        {ehCartao && idEditando === null && (
          <div className="col-md-4">
            <label htmlFor="totalParcelas" className="form-label">Parcelas</label>
            <input id="totalParcelas" className={`form-control${erros.totalParcelas ? ' is-invalid' : ''}`} type="number" min="1" max="48" value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} />
            {erros.totalParcelas && <div className="invalid-feedback">{erros.totalParcelas}</div>}
          </div>
        )}

        </div>
        <div className="mt-3">
        {erroForm && <div className="alert alert-danger" role="alert">{erroForm}</div>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>{idEditando === null ? 'Adicionar' : 'Salvar'}</button>
        {idEditando !== null && <button type="button" className="btn btn-secondary ms-2" onClick={limpar}>Cancelar</button>}
        </div>
      </form>

      <h2 className="h5 mt-4 mb-3">Filtros</h2>
      <div className="row g-2 mb-3">
        <div className="col-md-2">
          <label htmlFor="filtroInicio" className="form-label">Início</label>
          <input id="filtroInicio" className="form-control" type="date" value={filtros.inicio} onChange={(e) => mudarFiltro('inicio', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label htmlFor="filtroFim" className="form-label">Fim</label>
          <input id="filtroFim" className="form-control" type="date" value={filtros.fim} onChange={(e) => mudarFiltro('fim', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label htmlFor="filtroTipo" className="form-label">Tipo</label>
          <select id="filtroTipo" className="form-select" value={filtros.tipo} onChange={(e) => mudarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>
        <div className="col-md-3">
          <label htmlFor="filtroCategoria" className="form-label">Categoria</label>
          <select id="filtroCategoria" className="form-select" value={filtros.categoriaId} onChange={(e) => mudarFiltro('categoriaId', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'entrada' ? 'entrada' : 'saída'})</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label htmlFor="filtroFonte" className="form-label">Fonte/destino</label>
          <select id="filtroFonte" className="form-select" value={filtros.fonteDestinoId} onChange={(e) => mudarFiltro('fonteDestinoId', e.target.value)}>
            <option value="">Todas</option>
            {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      </div>

      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
      {carregando && <p className="text-muted">Carregando lançamentos...</p>}

      {!carregando && dados && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Entradas</div>
                <div className="fs-4 fw-semibold text-success">{moeda(dados.totais.entradas)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Saídas</div>
                <div className="fs-4 fw-semibold text-danger">{moeda(dados.totais.saidas)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Saldo</div>
                <div className="fs-4 fw-semibold">{moeda(dados.totais.saldo)}</div>
              </div></div>
            </div>
          </div>

          {dados.itens.length === 0 ? (
            <p className="text-muted">Nenhum lançamento no período.</p>
          ) : (
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fonte/destino</th><th>Parcela</th><th>Valor</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {dados.itens.map((l) => (
                  <tr key={l.id}>
                    <td>{dataBR(l.data)}</td>
                    <td>{l.descricao}</td>
                    <td>{l.categoria_nome}</td>
                    <td>{l.fonte_destino_nome}</td>
                    <td>{l.total_parcelas > 1 ? `${l.parcela_atual}/${l.total_parcelas}` : '—'}</td>
                    <td>{l.tipo === 'saida' ? '− ' : '+ '}{moeda(l.valor)}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => editar(l)}>Editar</button>{' '}
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => excluir(l)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" disabled={pagina <= 1} onClick={() => mudarPagina(pagina - 1)}>Anterior</button>
            <span> Página {pagina} de {Math.max(1, dados.totalPaginas)} ({dados.totalRegistros} lançamentos) </span>
            <button type="button" className="btn btn-sm btn-outline-primary" disabled={pagina >= dados.totalPaginas} onClick={() => mudarPagina(pagina + 1)}>Próxima</button>
          </div>
        </>
      )}
    </section>
  );
}