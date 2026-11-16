import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { extrairErro } from '../services/api';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mascararCpf(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function Cadastro() {
  const { usuario, cadastrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  function validar(): Record<string, string> {
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = 'Informe o nome.';
    if (!email.trim()) novosErros.email = 'Informe o e-mail.';
    else if (!FORMATO_EMAIL.test(email.trim())) novosErros.email = 'Informe um e-mail válido.';
    if (cpf.replace(/\D/g, '').length !== 11) novosErros.cpf = 'O CPF deve ter 11 dígitos.';
    if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
      novosErros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
    }
    if (confirmacao !== senha) novosErros.confirmacao = 'As senhas não conferem.';
    return novosErros;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroGeral('');

    const novosErros = validar();
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar({ nome, email, cpf, senha });
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
      <h1 className="h3 mb-4">Criar conta</h1>

      <div className="mb-3">
        <label htmlFor="nome" className="form-label">Nome</label>
        <input id="nome" className={`form-control${erros.nome ? ' is-invalid' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} />
        {erros.nome && <div className="invalid-feedback">{erros.nome}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="email" className="form-label">E-mail</label>
        <input id="email" className={`form-control${erros.email ? ' is-invalid' : ''}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {erros.email && <div className="invalid-feedback">{erros.email}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="cpf" className="form-label">CPF</label>
        <input id="cpf" className={`form-control${erros.cpf ? ' is-invalid' : ''}`}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(mascararCpf(e.target.value))}
        />
        {erros.cpf && <div className="invalid-feedback">{erros.cpf}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="senha" className="form-label">Senha</label>
        <input id="senha" className={`form-control${erros.senha ? ' is-invalid' : ''}`} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erros.senha && <div className="invalid-feedback">{erros.senha}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="confirmacao" className="form-label">Confirmação de senha</label>
        <input id="confirmacao" className={`form-control${erros.confirmacao ? ' is-invalid' : ''}`} type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        {erros.confirmacao && <div className="invalid-feedback">{erros.confirmacao}</div>}
      </div>

      {erroGeral && <div className="alert alert-danger" role="alert">{erroGeral}</div>}

      <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
        {enviando ? 'Cadastrando...' : 'Cadastrar'}
      </button>

      <p className="mt-3 mb-0 text-center">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
    </div>
  );
}