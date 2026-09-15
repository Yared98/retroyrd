import React, { useState } from 'react';
import { Sparkles, Shield, EyeOff, Bot, ArrowRight, Sun, Moon, History, Trash2, ExternalLink, Share2, Check, AlertTriangle } from 'lucide-react';
import { getRecentSessions, removeRecentSession, type RecentSession } from '../utils/recentSessions';
import { Footer } from './Footer';

interface CreateBoardModalProps {
  onCreate: (title: string, maxVotesPerUser: number) => Promise<void>;
  isCreating: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  onCreate,
  isCreating,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [title, setTitle] = useState('');
  const [maxVotes, setMaxVotes] = useState(5);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>(() => getRecentSessions());
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<RecentSession | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim(), maxVotes);
    }
  };

  const handleCopyInvite = (sessionId: string) => {
    const url = `${window.location.origin}/board/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleRemoveSession = (sessionId: string) => {
    const updated = removeRecentSession(sessionId);
    setRecentSessions(updated);
  };

  const voteOptions = [
    { label: '3 votos', value: 3 },
    { label: '5 votos (Padrão)', value: 5 },
    { label: '8 votos', value: 8 },
    { label: 'Ilimitado', value: 0 },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'var(--bg-canvas)',
      position: 'relative',
      transition: 'background var(--transition-smooth)',
    }}>
      {/* Botão de Tema no Topo Direito */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)',
          }}
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="var(--color-primary)" />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
      )}

      <div className="glass-modal" style={{ maxWidth: 540, width: '100%', padding: '2.5rem' }}>
        {/* Logo / Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--border-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
          }}>
            <Sparkles size={24} color="var(--color-primary)" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              RETROYRD
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Criar Nova Retrospectiva
            </h1>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Retrospectivas ágeis corporativas em tempo real. Auto-hospedado (Zero Cost), anonimato criptográfico e integração nativa com IA via MCP.
        </p>

        {/* Features em destaque */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Shield size={16} color="var(--color-went-well)" />
            <span><strong>Segurança Psicológica:</strong> Checagem 1-5 estritamente anônima</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <EyeOff size={16} color="var(--color-to-improve)" />
            <span><strong>Modo Cego:</strong> Brainstorm sem viés de ancoragem (`••••••••`)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Bot size={16} color="var(--color-action)" />
            <span><strong>Servidor MCP Nativo:</strong> IAs leem e criam Action Items em tempo real</span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Nome da Sessão ou Sprint
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sprint 42 Retrospective"
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
            />
          </div>

          {/* Seletor de Votos por Participante */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Limite de Votos por Participante (Dot Voting)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                {maxVotes === 0 ? 'Sem limite' : `${maxVotes} votos por pessoa`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {voteOptions.map((opt) => {
                const isSelected = maxVotes === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxVotes(opt.value)}
                    style={{
                      background: isSelected ? 'var(--color-primary)' : 'var(--bg-subtle)',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating || !title.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'var(--color-primary)',
              border: 'none',
              color: '#ffffff',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isCreating || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: isCreating || !title.trim() ? 0.6 : 1,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)',
              marginTop: '0.5rem',
            }}
          >
            <span>{isCreating ? 'Iniciando Sessão...' : 'Iniciar Retrospectiva'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Histórico de Sessões Recentes (Facilitador) */}
        {recentSessions.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--color-primary)" />
                <span>Sessões Anteriores (Facilitador)</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'var(--bg-subtle)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                {recentSessions.length} {recentSessions.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {new Date(session.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(session.id)}
                      title="Copiar link de convite"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedSessionId === session.id ? <Check size={12} color="var(--color-went-well)" /> : <Share2 size={12} />}
                      <span>{copiedSessionId === session.id ? 'Copiado!' : 'Convidar'}</span>
                    </button>

                    <a
                      href={`/board/${session.id}?token=${session.facilitatorToken}`}
                      style={{
                        background: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all var(--transition-fast)',
                      }}
                      title="Abrir como facilitador com token de acesso"
                    >
                      <span>Acessar</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setSessionToDelete(session)}
                      title="Remover do histórico deste navegador"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-to-improve)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com créditos */}
      <Footer style={{ borderTop: 'none', marginTop: '1.25rem', width: '100%', maxWidth: 540 }} />

      {/* Modal de Confirmação de Exclusão de Sessão */}
      {sessionToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="glass-modal" style={{
            maxWidth: 440,
            width: '100%',
            padding: '1.75rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                background: 'var(--color-to-improve-bg)',
                border: '1px solid var(--color-to-improve-border)',
                color: 'var(--color-to-improve)',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Remover Sessão do Histórico?
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0', lineHeight: 1.45 }}>
                  Tem certeza que deseja remover a retrospectiva <strong style={{ color: 'var(--text-main)' }}>"{sessionToDelete.title}"</strong> deste navegador?
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
            }}>
              ⚠️ O link com token de facilitador salvo localmente será esquecido. Caso você não possua a URL salva externamente, você não conseguirá reaver os privilégios de facilitador nesta sessão.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                style={{
                  background: 'var(--color-to-improve)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Trash2 size={14} />
                <span>Sim, Remover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
