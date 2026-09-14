import React, { useState } from 'react';
import type { Column, Card, BoardPhase } from '../types';
import { RetroCardItem } from './RetroCardItem';
import { Plus, Layers } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  cards: Card[];
  allCards?: Card[];
  phase: BoardPhase;
  userVotedCardIds: string[];
  sessionHash?: string;
  isVoteLimitReached?: boolean;
  onAddCard: (columnId: string, content: string) => void;
  onVoteCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, content: string) => void;
  onDeleteCard: (cardId: string) => void;
  onGroupCards?: (parentCardId: string, childCardIds: string[]) => void;
  onUngroupCard?: (cardId: string) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  cards,
  allCards,
  phase,
  userVotedCardIds,
  sessionHash,
  isVoteLimitReached = false,
  onAddCard,
  onVoteCard,
  onUpdateCard,
  onDeleteCard,
  onGroupCards,
  onUngroupCard,
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
  const isGrouping = phase === 'GROUPING';

  // Separar cards raiz dos cards filhos agrupados
  const topLevelCards = cards.filter((c) => !c.parent_card_id);

  return (
    <div style={{
      flex: '1 1 320px',
      minWidth: 320,
      maxWidth: 480,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.4)',
      border: isGrouping ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      gap: '1rem',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 120px)',
      boxShadow: isGrouping ? '0 0 20px rgba(99, 102, 241, 0.08)' : 'none',
      transition: 'all 0.2s ease',
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
            {topLevelCards.length}
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

        {/* Dica da fase de grouping */}
        {isGrouping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: 'var(--color-primary)',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <Layers size={13} />
            <span>Arraste para mesclar</span>
          </div>
        )}
      </div>

      {/* Formulário de inserção rápida em Brainstorm */}
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

      {/* Lista de Cards com suporte a Clusters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflowY: 'auto',
        paddingRight: '0.25rem',
      }}>
        {topLevelCards.length === 0 ? (
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
          topLevelCards.map((card) => {
            const hasVoted = userVotedCardIds.includes(card.id);
            const canEdit = sessionHash ? card.author_session_hash === sessionHash : false;
            const childCards = (allCards || cards).filter((c) => c.parent_card_id === card.id);

            return (
              <RetroCardItem
                key={card.id}
                card={card}
                childCards={childCards}
                phase={phase}
                hasVoted={hasVoted}
                canEdit={canEdit}
                isVoteLimitReached={isVoteLimitReached}
                onVote={onVoteCard}
                onUpdate={onUpdateCard}
                onDelete={onDeleteCard}
                onGroupCards={onGroupCards}
                onUngroupCard={onUngroupCard}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
