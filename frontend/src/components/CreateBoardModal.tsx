import React, { useState } from 'react';
import { Sparkles, Shield, EyeOff, Bot, ArrowRight, Sun, Moon } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim(), maxVotes);
    }
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
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
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
              INTERNAL RETRO
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
      </div>
    </div>
  );
};
