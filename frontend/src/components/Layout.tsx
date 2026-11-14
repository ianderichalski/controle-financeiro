import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <>
      <header>
        <strong>Controle Financeiro</strong>
        <span> {usuario?.nome} </span>
        <button type="button" onClick={logout}>Sair</button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}