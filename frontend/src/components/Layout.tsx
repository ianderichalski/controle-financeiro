import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { para: '/', nome: 'Dashboard' },
  { para: '/lancamentos', nome: 'Lançamentos' },
  { para: '/categorias', nome: 'Categorias' },
  { para: '/fontes-destinos', nome: 'Fontes/destinos' },
  { para: '/relatorios/categorias', nome: 'Relatório por categoria' },
  { para: '/relatorios/fontes-destinos', nome: 'Relatório por fonte/destino' },
  { para: '/faturas', nome: 'Faturas' },
  { para: '/saude-financeira', nome: 'Saúde financeira' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <>
      <header className="navbar bg-dark navbar-dark mb-3">
        <div className="container">
          <span className="navbar-brand">Controle Financeiro</span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-light">{usuario?.nome}</span>
            <button type="button" className="btn btn-sm btn-outline-light" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <div className="container">
        <nav className="nav nav-pills flex-wrap gap-1 mb-4">
          {links.map((l) => (
            <NavLink key={l.para} to={l.para} end={l.para === '/'} className="nav-link">
              {l.nome}
            </NavLink>
          ))}
        </nav>

        <main className="pb-5">
          <Outlet />
        </main>
      </div>
    </>
  );
}