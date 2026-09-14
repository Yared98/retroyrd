import React, { useState } from 'react';
import type { Column, Card, BoardPhase } from '../types';
import { RetroCardItem } from './RetroCardItem';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  cards: Card[];
  phase: BoardPhase;
  userVotedCardIds: string[];
  sessionHash?: string;
  onAddCard: (columnId: string, content: string) => void;
  onVoteCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, content: string) => void;
  onDeleteCard: (cardId: string) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  cards,
  phase,
  userVotedCardIds,
  sessionHash,
  onAddCard,
  onVoteCard,
  onUpdateCard,
  onDeleteCard,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAddCard(column.id, content.trim());
      setContent('');
      setIsAdding(false);
    }
  };

  const isBrainstorm = phase === 'BRAINSTORM';

  return (
    <div style={{
      flex: '1 1 320px',
      minWidth: 320,
      maxWidth: 480,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      gap: '1rem',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 120px)',
    }}>
      {/* Cabeçalho da Coluna */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: column.color || 'var(--color-primary)',
            boxShadow: `0 0 10px ${column.color || 'var(--color-primary)'}`,
          }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            {column.title}
          </h2>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '0.15rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-dim)',
          }}>
            {cards.length}
          </span>
        </div>

        {/* Botão de adicionar card rápido na fase de Brainstorm */}
        {isBrainstorm && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.3rem',
              cursor: 'pointer',
              display: 'flex',
            }}
            title="Adicionar Card"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Formulário de inserção rápida */}
      {isBrainstorm && isAdding && (
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            autoFocus
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua ideia, bloqueio ou elogio..."
            style={{
              width: '100%',
              background: 'rgba(15, 19, 28, 0.9)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              padding: '0.6rem',
              fontSize: '0.875rem',
              resize: 'none',
              fontFamily: 'inherit',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAdd(e);
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '0.3rem 0.6rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: 'var(--color-primary)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Cards da Coluna com rolagem interna */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflowY: 'auto',
        paddingRight: '0.25rem',
      }}>
        {cards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: 'var(--text-dim)',
            fontSize: '0.8rem',
            border: '1px dashed rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
          }}>
            Nenhum card ainda nesta coluna.
          </div>
        ) : (
          cards.map((card) => {
            const hasVoted = userVotedCardIds.includes(card.id);
            const canEdit = sessionHash ? card.author_session_hash === sessionHash : false;

            return (
              <RetroCardItem
                key={card.id}
                card={card}
                phase={phase}
                hasVoted={hasVoted}
                canEdit={canEdit}
                onVote={onVoteCard}
                onUpdate={onUpdateCard}
                onDelete={onDeleteCard}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
