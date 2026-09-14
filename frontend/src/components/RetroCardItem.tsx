import React, { useState } from 'react';
import type { Card, BoardPhase } from '../types';
import { ThumbsUp, Lock, Trash2, Edit2, Bot, Check, X } from 'lucide-react';

interface RetroCardItemProps {
  card: Card;
  phase: BoardPhase;
  hasVoted: boolean;
  canEdit: boolean;
  onVote: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export const RetroCardItem: React.FC<RetroCardItemProps> = ({
  card,
  phase,
  hasVoted,
  canEdit,
  onVote,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(card.id, editContent.trim());
      setIsEditing(false);
    }
  };

  // 1. Renderização no Modo Cego (Blind Mode) para cards de outros participantes
  if (card.is_masked) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            <Lock size={12} />
            <span>Colega Anônimo</span>
          </div>
          <span style={{
            fontSize: '0.7rem',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-dim)',
          }}>
            Modo Cego
          </span>
        </div>

        {/* Silhueta com placeholder pontilhado */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.1rem',
          letterSpacing: '0.2em',
          color: 'rgba(255, 255, 255, 0.25)',
          padding: '0.5rem 0',
          userSelect: 'none',
        }}>
          ••••••••••••
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Revelado automaticamente na fase de Grouping
        </div>
      </div>
    );
  }

  // 2. Renderização normal / revelada
  return (
    <div style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      position: 'relative',
      transition: 'all 0.15s ease',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    }}>
      {/* Header do Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
        {card.is_ai_generated ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            color: '#c4b5fd',
            fontSize: '0.7rem',
            fontWeight: 700,
          }}>
            <Bot size={12} />
            <span>Injetado por IA (MCP)</span>
          </div>
        ) : phase === 'BRAINSTORM' && canEdit ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            color: '#6ee7b7',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <Lock size={11} />
            <span>Visível só para você</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Card anônimo
          </span>
        )}

        {/* Ações de Edição/Exclusão (Brainstorm & Autor) */}
        {phase === 'BRAINSTORM' && canEdit && !isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(card.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-to-improve)',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo do Card */}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              padding: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical',
              minHeight: 60,
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <X size={12} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              style={{
                background: 'var(--color-primary)',
                border: 'none',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Check size={12} /> Salvar
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-main)', wordBreak: 'break-word' }}>
          {card.content}
        </p>
      )}

      {/* Footer: Votos (fases Voting em diante) */}
      {(phase === 'VOTING' || phase === 'ACTION_ITEMS' || phase === 'ARCHIVED') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.4rem' }}>
          <button
            disabled={phase !== 'VOTING'}
            onClick={() => onVote(card.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: hasVoted ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${hasVoted ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              color: hasVoted ? '#a5b4fc' : 'var(--text-muted)',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: phase === 'VOTING' ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            <ThumbsUp size={12} />
            <span>{card.vote_count}</span>
          </button>
        </div>
      )}
    </div>
  );
};
