import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api, { CHAVE_TOKEN, registrarLogout } from '../services/api';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  cpf: string;
  senha: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CHAVE_TOKEN));
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => localStorage.getItem(CHAVE_TOKEN) !== null);

  const logout = useCallback(() => {
    localStorage.removeItem(CHAVE_TOKEN);
    setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    registrarLogout(logout);
  }, [logout]);

  useEffect(() => {
    if (!localStorage.getItem(CHAVE_TOKEN)) return;
    api
      .get<Usuario>('/auth/me')
      .then((resposta) => setUsuario(resposta.data))
      .catch(() => logout())
      .finally(() => setCarregando(false));
  }, [logout]);

  const login = useCallback(async (email: string, senha: string) => {
    const { data } = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha });
    localStorage.setItem(CHAVE_TOKEN, data.token);
    setToken(data.token);
    setUsuario(data.usuario);
  }, []);

  const cadastrar = useCallback(async (dados: DadosCadastro) => {
    await api.post('/auth/cadastro', dados);
    await login(dados.email, dados.senha);
  }, [login]);

  return (
    <AuthContext value={{ usuario, token, carregando, login, logout, cadastrar }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return contexto;
}