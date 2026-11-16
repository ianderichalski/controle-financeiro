import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
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
            <Route path="/" element={<p>Dashboard</p>} />
            <Route path="/faturas" element={<Faturas />} />
            <Route path="/saude-financeira" element={<SaudeFinanceira />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}