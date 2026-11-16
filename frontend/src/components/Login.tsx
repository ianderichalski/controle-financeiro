import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { extrairErro } from '../services/api';

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroGeral('');

    // validação no cliente
    const novosErros: Record<string, string> = {};
    if (!email.trim()) novosErros.email = 'Informe o e-mail.';
    if (!senha) novosErros.senha = 'Informe a senha.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await login(email, senha);
      navigate('/', { replace: true });
    } catch (erro) {
      const resposta = extrairErro(erro);
      setErros(resposta.campos ?? {});
      setErroGeral(resposta.erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
    <form onSubmit={handleSubmit} noValidate className="card card-body shadow-sm">
      <h1 className="h3 mb-4">Entrar</h1>

      <div className="mb-3">
        <label htmlFor="email" className="form-label">E-mail</label>
        <input id="email" className={`form-control${erros.email ? ' is-invalid' : ''}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {erros.email && <div className="invalid-feedback">{erros.email}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="senha" className="form-label">Senha</label>
        <input id="senha" className={`form-control${erros.senha ? ' is-invalid' : ''}`} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erros.senha && <div className="invalid-feedback">{erros.senha}</div>}
      </div>

      {erroGeral && <div className="alert alert-danger" role="alert">{erroGeral}</div>}

      <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
            <p className="mt-3 mb-0 text-center">
        Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </form>
    </div>
  );
}