import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { criarClienteFinanceiro, moeda, dataBR, mesAtual, parametros } from '../services/financeiro.ts';
import type { Categoria, FonteDestino, Lancamento, Listagem, Relatorio } from '../services/financeiro.ts';
import './financeiro.css';

type Aba='dashboard'|'lancamentos'|'categorias'|'fontes'|'relatorio';
type Cliente=ReturnType<typeof criarClienteFinanceiro>;
const menu:{id:Aba;nome:string}[]=[
  {id:'dashboard',nome:'Dashboard'},{id:'lancamentos',nome:'Lançamentos'},
  {id:'categorias',nome:'Categorias'},{id:'fontes',nome:'Fontes/destinos'},{id:'relatorio',nome:'Relatório por categoria'},
];
const aviso=(erro:unknown)=>erro instanceof Error?erro.message:'Ocorreu um erro inesperado.';

function Categorias({api,atualizar}: {api:Cliente;atualizar:()=>void}) {
  const [itens,setItens]=useState<Categoria[]>([]),[nome,setNome]=useState(''),[tipo,setTipo]=useState<'entrada'|'saida'>('saida');
  const [idEditando,setIdEditando]=useState<number|null>(null),[erro,setErro]=useState('');
  const carregar=useCallback(()=>api<Categoria[]>('/api/categorias').then(setItens).catch(e=>setErro(aviso(e))),[api]);
  useEffect(()=>{void carregar();},[carregar]);
  async function salvar(e:FormEvent){e.preventDefault();setErro('');try{
    await api(`/api/categorias${idEditando===null?'':`/${idEditando}`}`,{method:idEditando===null?'POST':'PUT',body:JSON.stringify({nome,tipo})});
    setNome('');setIdEditando(null);await carregar();atualizar();
  }catch(e){setErro(aviso(e));}}
  async function excluir(id:number){if(!window.confirm('Excluir categoria?'))return;setErro('');try{
    await api(`/api/categorias/${id}`,{method:'DELETE'});await carregar();atualizar();
  }catch(e){setErro(aviso(e));}}
  return <section><h2>Categorias</h2><form onSubmit={salvar} className="cf-form cf-inline">
    <label>Nome<input value={nome} maxLength={60} onChange={e=>setNome(e.target.value)} required/></label>
    <label>Tipo<select value={tipo} onChange={e=>setTipo(e.target.value as 'entrada'|'saida')}><option value="saida">Saída</option><option value="entrada">Entrada</option></select></label>
    <button>{idEditando?'Salvar edição':'Criar categoria'}</button>{idEditando!==null&&<button type="button" onClick={()=>{setIdEditando(null);setNome('');}}>Cancelar</button>}
  </form>{erro&&<p role="alert" className="cf-erro">{erro}</p>}
  <table><thead><tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>{itens.map(x=><tr key={x.id}><td>{x.nome}</td><td>{x.tipo}</td><td><button type="button" onClick={()=>{setIdEditando(x.id);setNome(x.nome);setTipo(x.tipo);}}>Editar</button> <button type="button" onClick={()=>void excluir(x.id)}>Excluir</button></td></tr>)}</tbody></table>
  {!itens.length&&<p>Nenhuma categoria cadastrada.</p>}</section>;
}

function Fontes({api,atualizar}:{api:Cliente;atualizar:()=>void}){
  const [itens,setItens]=useState<FonteDestino[]>([]),[idEditando,setIdEditando]=useState<number|null>(null),[erro,setErro]=useState('');
  const [nome,setNome]=useState(''),[tipo,setTipo]=useState<FonteDestino['tipo']>('conta');
  const [diaFechamento,setDiaFechamento]=useState('3'),[diaVencimento,setDiaVencimento]=useState('10'),[limite,setLimite]=useState('2500');
  const carregar=useCallback(()=>api<FonteDestino[]>('/api/fontes-destinos').then(setItens).catch(e=>setErro(aviso(e))),[api]);
  useEffect(()=>{void carregar();},[carregar]);
  async function salvar(e:FormEvent){e.preventDefault();setErro('');try{
    await api(`/api/fontes-destinos${idEditando===null?'':`/${idEditando}`}`,{method:idEditando===null?'POST':'PUT',body:JSON.stringify({nome,tipo,...(tipo==='cartao_credito'?{diaFechamento:Number(diaFechamento),diaVencimento:Number(diaVencimento),limite:Number(limite)}:{})})});
    setIdEditando(null);setNome('');await carregar();atualizar();
  }catch(e){setErro(aviso(e));}}
  async function excluir(id:number){if(!window.confirm('Excluir fonte/destino?'))return;setErro('');try{await api(`/api/fontes-destinos/${id}`,{method:'DELETE'});await carregar();atualizar();}catch(e){setErro(aviso(e));}}
  return <section><h2>Fontes e destinos</h2><form onSubmit={salvar} className="cf-form cf-inline">
    <label>Nome<input required maxLength={60} value={nome} onChange={e=>setNome(e.target.value)}/></label>
    <label>Tipo<select value={tipo} onChange={e=>setTipo(e.target.value as FonteDestino['tipo'])}><option value="conta">Conta</option><option value="renda">Renda</option><option value="cartao_credito">Cartão de crédito</option></select></label>
    {tipo==='cartao_credito'&&<><label>Fechamento<input required type="number" min="1" max="31" value={diaFechamento} onChange={e=>setDiaFechamento(e.target.value)}/></label><label>Vencimento<input required type="number" min="1" max="31" value={diaVencimento} onChange={e=>setDiaVencimento(e.target.value)}/></label><label>Limite (R$)<input required type="number" min="0" step="0.01" value={limite} onChange={e=>setLimite(e.target.value)}/></label></>}
    <button>{idEditando===null?'Criar':'Salvar edição'}</button>{idEditando!==null&&<button type="button" onClick={()=>{setIdEditando(null);setNome('');}}>Cancelar</button>}
  </form>{erro&&<p className="cf-erro" role="alert">{erro}</p>}
  <table><thead><tr><th>Nome</th><th>Tipo</th><th>Limite</th><th>Ações</th></tr></thead><tbody>{itens.map(x=><tr key={x.id}><td>{x.nome}</td><td>{x.tipo}</td><td>{x.tipo==='cartao_credito'?moeda(x.limite??0):'—'}</td><td><button type="button" onClick={()=>{setIdEditando(x.id);setNome(x.nome);setTipo(x.tipo);setDiaFechamento(String(x.dia_fechamento??3));setDiaVencimento(String(x.dia_vencimento??10));setLimite(String(x.limite??2500));}}>Editar</button> <button type="button" onClick={()=>void excluir(x.id)}>Excluir</button></td></tr>)}</tbody></table>
  {!itens.length&&<p>Nenhuma fonte/destino cadastrada.</p>}</section>;
}

function Lancamentos({api}:{api:Cliente}){
  const [periodo,setPeriodo]=useState(mesAtual),[pagina,setPagina]=useState(1),[tipoFiltro,setTipoFiltro]=useState('');
  const [dados,setDados]=useState<Listagem|null>(null),[categorias,setCategorias]=useState<Categoria[]>([]),[fontes,setFontes]=useState<FonteDestino[]>([]),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(false);
  const [idEditando,setIdEditando]=useState<number|null>(null),[tipo,setTipo]=useState<'entrada'|'saida'>('saida'),[descricao,setDescricao]=useState(''),[valor,setValor]=useState(''),[data,setData]=useState(new Date().toLocaleDateString('en-CA'));
  const [categoriaId,setCategoriaId]=useState(''),[fonteDestinoId,setFonteDestinoId]=useState(''),[totalParcelas,setTotalParcelas]=useState('1'),[versao,setVersao]=useState(0);
  const carregar=useCallback(async()=>{setCarregando(true);setErro('');try{
    const [l,c,f]=await Promise.all([api<Listagem>(`/api/lancamentos?${parametros({...periodo,pagina,tipo:tipoFiltro||undefined})}`),api<Categoria[]>('/api/categorias'),api<FonteDestino[]>('/api/fontes-destinos')]);
    setDados(l);setCategorias(c);setFontes(f);
  }catch(e){setErro(aviso(e));}finally{setCarregando(false);}},[api,periodo,pagina,tipoFiltro,versao]);
  useEffect(()=>{void carregar();},[carregar]);
  const disponiveis=categorias.filter(x=>x.tipo===tipo);
  async function salvar(e:FormEvent){e.preventDefault();setErro('');try{
    if(!categoriaId||!fonteDestinoId){setErro('Selecione categoria e fonte/destino.');return;}
    await api(`/api/lancamentos${idEditando===null?'':`/${idEditando}`}`,{method:idEditando===null?'POST':'PUT',body:JSON.stringify({tipo,descricao,valor:Number(valor),data,categoriaId:Number(categoriaId),fonteDestinoId:Number(fonteDestinoId),...(idEditando===null?{totalParcelas:Number(totalParcelas)}:{})})});
    setIdEditando(null);setDescricao('');setValor('');setCategoriaId('');setFonteDestinoId('');setTotalParcelas('1');setVersao(v=>v+1);
  }catch(e){setErro(aviso(e));}}
  async function excluir(item:Lancamento){const todas=item.total_parcelas>1&&window.confirm('Deseja apagar TODAS as parcelas desta compra?\nCancelar apaga somente a parcela selecionada.');if(!window.confirm(todas?'Confirma excluir todas as parcelas?':'Confirma excluir este lançamento?'))return;setErro('');try{await api(`/api/lancamentos/${item.id}${todas?'?todasParcelas=true':''}`,{method:'DELETE'});setVersao(v=>v+1);}catch(e){setErro(aviso(e));}}
  return <section><h2>Lançamentos</h2><form className="cf-form cf-inline" onSubmit={salvar}>
    <label>Tipo<select value={tipo} onChange={e=>{setTipo(e.target.value as 'entrada'|'saida');setCategoriaId('');}}><option value="saida">Saída</option><option value="entrada">Entrada</option></select></label>
    <label>Descrição<input required maxLength={120} value={descricao} onChange={e=>setDescricao(e.target.value)}/></label>
    <label>Valor (R$)<input type="number" min="0.01" step="0.01" required value={valor} onChange={e=>setValor(e.target.value)}/></label>
    <label>Data<input type="date" required value={data} onChange={e=>setData(e.target.value)}/></label>
    <label>Categoria<select required value={categoriaId} onChange={e=>setCategoriaId(e.target.value)}><option value="">Selecione</option>{disponiveis.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
    <label>Fonte/destino<select required value={fonteDestinoId} onChange={e=>setFonteDestinoId(e.target.value)}><option value="">Selecione</option>{fontes.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
    {idEditando===null&&<label>Parcelas<input type="number" min="1" max="48" value={totalParcelas} onChange={e=>setTotalParcelas(e.target.value)}/></label>}
    <button>{idEditando===null?'Adicionar lançamento':'Salvar edição'}</button>
    {idEditando!==null&&<button type="button" onClick={()=>{setIdEditando(null);setDescricao('');}}>Cancelar</button>}
  </form>
  <div className="cf-inline cf-filtros"><label>Início<input type="date" value={periodo.inicio} onChange={e=>{setPeriodo(p=>({...p,inicio:e.target.value}));setPagina(1);}}/></label><label>Fim<input type="date" value={periodo.fim} onChange={e=>{setPeriodo(p=>({...p,fim:e.target.value}));setPagina(1);}}/></label><label>Tipo<select value={tipoFiltro} onChange={e=>{setTipoFiltro(e.target.value);setPagina(1);}}><option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option></select></label></div>
  {erro&&<p role="alert" className="cf-erro">{erro}</p>}{carregando&&<p>Carregando lançamentos...</p>}
  {dados&&<><div className="cf-cards"><article><small>Entradas</small><strong>{moeda(dados.totais.entradas)}</strong></article><article><small>Saídas</small><strong>{moeda(dados.totais.saidas)}</strong></article><article><small>Saldo</small><strong>{moeda(dados.totais.saldo)}</strong></article></div>
  <div className="cf-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fonte/destino</th><th>Parcela</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{dados.itens.map(x=><tr key={x.id}><td>{dataBR(x.data)}</td><td>{x.descricao}</td><td>{x.categoria_nome}</td><td>{x.fonte_destino_nome}</td><td>{x.total_parcelas>1?`${x.parcela_atual}/${x.total_parcelas}`:'—'}</td><td>{x.tipo==='saida'?'−':'+'} {moeda(x.valor)}</td><td><button type="button" onClick={()=>{setIdEditando(x.id);setTipo(x.tipo);setDescricao(x.descricao);setValor(String(x.valor));setData(x.data.slice(0,10));setCategoriaId(String(x.categoria_id));setFonteDestinoId(String(x.fonte_destino_id));}}>Editar</button> <button type="button" onClick={()=>void excluir(x)}>Excluir</button></td></tr>)}</tbody></table></div>
  {!dados.itens.length&&<p>Não existem lançamentos no período.</p>}
  <div className="cf-inline"><button disabled={pagina<=1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina} de {Math.max(1,dados.totalPaginas)}</span><button disabled={pagina>=dados.totalPaginas} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></>}
  </section>;
}

function RelatorioCategorias({api}:{api:Cliente}){
  const [periodo,setPeriodo]=useState(mesAtual),[relatorio,setRelatorio]=useState<Relatorio|null>(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(false);
  useEffect(()=>{let ativo=true;setCarregando(true);api<Relatorio>(`/api/relatorios/categorias?${parametros(periodo)}`).then(r=>{if(ativo){setRelatorio(r);setErro('');}}).catch(e=>{if(ativo)setErro(aviso(e));}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[api,periodo]);
  return <section><h2>Relatório por categoria</h2><div className="cf-inline cf-filtros"><label>Início<input type="date" value={periodo.inicio} onChange={e=>setPeriodo(p=>({...p,inicio:e.target.value}))}/></label><label>Fim<input type="date" value={periodo.fim} onChange={e=>setPeriodo(p=>({...p,fim:e.target.value}))}/></label></div>
  {erro&&<p role="alert" className="cf-erro">{erro}</p>}{carregando&&<p>Carregando relatório...</p>}{relatorio&&<><div className="cf-cards"><article><small>Saídas totais</small><strong>{moeda(relatorio.totalSaidas)}</strong></article><article><small>Entradas totais</small><strong>{moeda(relatorio.totalEntradas)}</strong></article></div>
  <h3>Saídas por categoria</h3><div className="cf-barras" role="img" aria-label="Gráfico de barras com a participação de cada categoria nas saídas">{relatorio.categorias.filter(x=>x.total>0).map(x=><div className="cf-barra" key={x.id}><div><span>{x.nome}</span><b>{x.percentual}% · {moeda(x.total)}</b></div><div className="cf-trilho"><span style={{width:`${Math.min(100,x.percentual)}%`}}/></div></div>)}</div>
  <div className="cf-table"><table><thead><tr><th>Categoria</th><th>Atual</th><th>Anterior</th><th>Variação</th></tr></thead><tbody>{relatorio.categorias.map(x=><tr key={x.id}><td>{x.nome}</td><td>{moeda(x.total)}</td><td>{moeda(x.periodoAnterior)}</td><td>{x.variacaoPercentual===null?'Sem base anterior':`${x.variacaoPercentual.toFixed(2)}%`}</td></tr>)}</tbody></table></div>
  <h3>Entradas por categoria</h3><div className="cf-table"><table><thead><tr><th>Categoria</th><th>Total</th></tr></thead><tbody>{relatorio.entradas.map(x=><tr key={x.id}><td>{x.nome}</td><td>{moeda(x.total)}</td></tr>)}</tbody></table></div></>}</section>;
}

function Dashboard({api}:{api:Cliente}){
  const [dados,setDados]=useState<Listagem|null>(null),[erro,setErro]=useState('');
  useEffect(()=>{let ativo=true;api<Listagem>(`/api/lancamentos?${parametros({...mesAtual(),porPagina:5})}`).then(r=>{if(ativo)setDados(r);}).catch(e=>{if(ativo)setErro(aviso(e));});return()=>{ativo=false;};},[api]);
  return <section><h2>Resumo do mês</h2>{erro&&<p className="cf-erro" role="alert">{erro}</p>}{!dados&&!erro&&<p>Carregando resumo...</p>}{dados&&<><div className="cf-cards"><article><small>Entradas</small><strong>{moeda(dados.totais.entradas)}</strong></article><article><small>Saídas</small><strong>{moeda(dados.totais.saidas)}</strong></article><article><small>Saldo do mês</small><strong>{moeda(dados.totais.saldo)}</strong></article></div><h3>Últimos lançamentos</h3><ul>{dados.itens.map(x=><li key={x.id}>{dataBR(x.data)} — {x.descricao} — {moeda(x.valor)}</li>)}</ul>{!dados.itens.length&&<p>Nenhum lançamento neste mês.</p>}</>}</section>;
}

/** Receba o token do AuthContext do Iandê. Para teste local, permite informar o token manualmente. */
export default function Financeiro({token}:{token?:string|null}) {
  const [tokenTeste,setTokenTeste]=useState('');
  const [aba,setAba]=useState<Aba>('dashboard'),[versao,setVersao]=useState(0);
  const atual=token ?? tokenTeste;
  const api=useMemo(()=>criarClienteFinanceiro(()=>atual),[atual]);
  return <main className="cf-app"><header><h1>Controle Financeiro</h1><p>Área financeira</p></header>
    {!token&&<div className="cf-token"><label>Token JWT para teste local (remover ao integrar AuthContext)<input type="password" value={tokenTeste} onChange={e=>setTokenTeste(e.target.value)} placeholder="Cole um token de teste"/></label></div>}
    <nav aria-label="Navegação financeira">{menu.map(m=><button key={m.id} className={aba===m.id?'ativo':''} onClick={()=>setAba(m.id)}>{m.nome}</button>)}</nav>
    <div className="cf-conteudo" key={`${aba}-${versao}`}>
    {aba==='dashboard'&&<Dashboard api={api}/>}
    {aba==='categorias'&&<Categorias api={api} atualizar={()=>setVersao(v=>v+1)}/>}
    {aba==='fontes'&&<Fontes api={api} atualizar={()=>setVersao(v=>v+1)}/>}
    {aba==='lancamentos'&&<Lancamentos api={api}/>}
    {aba==='relatorio'&&<RelatorioCategorias api={api}/>}
    </div></main>;
}
