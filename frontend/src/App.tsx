import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Financeiro from './components/Financeiro';
import { useAuth } from './contexts/AuthContext';
import Faturas from './components/Faturas';
import SaudeFinanceira from './components/SaudeFinanceira';
import RelatorioFontesDestinos from './components/RelatorioFontesDestinos';

function PaginaFinanceira() {
  const { token } = useAuth();
  return <Financeiro token={token} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        <Route element={<RotaProtegida />}>
          <Route element={<Layout />}>
            <Route path="/" element={<PaginaFinanceira />} />
            <Route path="/relatorios/fontes-destinos" element={<RelatorioFontesDestinos />} />
            <Route path="/faturas" element={<Faturas />} />
            <Route path="/saude-financeira" element={<SaudeFinanceira />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}