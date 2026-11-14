import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
    <form onSubmit={handleSubmit} noValidate>
      <h1>Entrar</h1>

      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {erros.email && <small>{erros.email}</small>}
      </div>

      <div>
        <label htmlFor="senha">Senha</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erros.senha && <small>{erros.senha}</small>}
      </div>

      {erroGeral && <p role="alert">{erroGeral}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}