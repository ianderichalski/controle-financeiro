import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './components/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RotaProtegida />}>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Dashboard</p>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}