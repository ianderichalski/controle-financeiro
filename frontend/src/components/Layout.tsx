import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <>
      <header>
        <strong>Controle Financeiro</strong>
        <span> {usuario?.nome} </span>
        <button type="button" onClick={logout}>Sair</button>
        <nav>
          <NavLink to="/" end>Início</NavLink>{' | '}
          <NavLink to="/relatorios/fontes-destinos">Relatório por fonte/destino</NavLink>{' | '}
          <NavLink to="/faturas">Faturas</NavLink>{' | '}
          <NavLink to="/saude-financeira">Saúde financeira</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}