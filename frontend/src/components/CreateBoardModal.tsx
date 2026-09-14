import React, { useState } from 'react';
import { Sparkles, Shield, EyeOff, Bot, ArrowRight } from 'lucide-react';

interface CreateBoardModalProps {
  onCreate: (title: string) => Promise<void>;
  isCreating: boolean;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onCreate, isCreating }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim());
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 60%)',
    }}>
      <div className="glass-modal" style={{ maxWidth: 540, width: '100%', padding: '2.5rem' }}>
        {/* Logo / Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
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

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          Retrospectivas ágeis corporativas em tempo real. Auto-hospedado (Zero Cost), anonimato criptográfico e integração bidirecional com IA via MCP.
        </p>

        {/* Features em destaque */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
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
              boxShadow: '0 0 20px var(--color-primary-glow)',
              transition: 'all 0.15s ease',
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
