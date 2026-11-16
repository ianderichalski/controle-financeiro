import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Dashboard from './components/Dashboard';
import Lancamentos from './components/Lancamentos';
import Categorias from './components/Categorias';
import FontesDestinos from './components/FontesDestinos';
import RelatorioCategorias from './components/RelatorioCategorias';
import RelatorioFontesDestinos from './components/RelatorioFontesDestinos';
import Faturas from './components/Faturas';
import SaudeFinanceira from './components/SaudeFinanceira';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        <Route element={<RotaProtegida />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/fontes-destinos" element={<FontesDestinos />} />
            <Route path="/relatorios/categorias" element={<RelatorioCategorias />} />
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