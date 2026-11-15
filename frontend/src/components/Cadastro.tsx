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
    <form onSubmit={handleSubmit} noValidate>
      <h1>Criar conta</h1>

      <div>
        <label htmlFor="nome">Nome</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        {erros.nome && <small>{erros.nome}</small>}
      </div>

      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {erros.email && <small>{erros.email}</small>}
      </div>

      <div>
        <label htmlFor="cpf">CPF</label>
        <input
          id="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(mascararCpf(e.target.value))}
        />
        {erros.cpf && <small>{erros.cpf}</small>}
      </div>

      <div>
        <label htmlFor="senha">Senha</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erros.senha && <small>{erros.senha}</small>}
      </div>

      <div>
        <label htmlFor="confirmacao">Confirmação de senha</label>
        <input id="confirmacao" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        {erros.confirmacao && <small>{erros.confirmacao}</small>}
      </div>

      {erroGeral && <p role="alert">{erroGeral}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? 'Cadastrando...' : 'Cadastrar'}
      </button>

      <p>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}