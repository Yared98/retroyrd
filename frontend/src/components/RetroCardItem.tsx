import React, { useState } from 'react';
import type { Card, BoardPhase } from '../types';
import { 
  ThumbsUp, 
  Lock, 
  Trash2, 
  Edit2, 
  Bot, 
  Check, 
  X, 
  GripVertical, 
  Layers, 
  CornerDownRight 
} from 'lucide-react';

interface RetroCardItemProps {
  card: Card;
  childCards?: Card[];
  phase: BoardPhase;
  hasVoted: boolean;
  canEdit: boolean;
  isVoteLimitReached?: boolean;
  onVote: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onGroupCards?: (parentCardId: string, childCardIds: string[]) => void;
  onUngroupCard?: (cardId: string) => void;
}

export const RetroCardItem: React.FC<RetroCardItemProps> = ({
  card,
  childCards = [],
  phase,
  hasVoted,
  canEdit,
  isVoteLimitReached = false,
  onVote,
  onUpdate,
  onDelete,
  onGroupCards,
  onUngroupCard,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [isDragOver, setIsDragOver] = useState(false);

  const isGrouping = phase === 'GROUPING';

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(card.id, editContent.trim());
      setIsEditing(false);
    }
  };

  // 1. Renderização no Modo Cego (Blind Mode na fase de Brainstorm para cards de outros participantes)
  const isBlindMode = (card.is_masked || phase === 'BRAINSTORM') && !canEdit;

  if (isBlindMode) {
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

  // 2. Drag & Drop Handlers (Grouping)
  const handleDragStart = (e: React.DragEvent) => {
    if (!isGrouping) return;
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isGrouping) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    if (isDragOver) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isGrouping) return;
    e.preventDefault();
    setIsDragOver(false);
    const draggedCardId = e.dataTransfer.getData('text/plain');

    if (draggedCardId && draggedCardId !== card.id && onGroupCards) {
      onGroupCards(card.id, [draggedCardId]);
    }
  };

  const totalClusterVotes = card.vote_count + childCards.reduce((sum, c) => sum + c.vote_count, 0);

  return (
    <div
      draggable={isGrouping && !isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: isDragOver ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        border: isDragOver
          ? '2px dashed var(--color-primary)'
          : childCards.length > 0
          ? '1px solid rgba(99, 102, 241, 0.4)'
          : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        position: 'relative',
        transition: 'all 0.15s ease',
        boxShadow: isDragOver
          ? '0 0 20px var(--color-primary-glow)'
          : '0 2px 10px rgba(0, 0, 0, 0.3)',
        cursor: isGrouping ? 'grab' : 'default',
      }}
    >
      {/* Indicador de Drop em Hover */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(99, 102, 241, 0.25)',
          backdropFilter: 'blur(4px)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.85rem',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          ➕ Solte para agrupar neste card
        </div>
      )}

      {/* Header do Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isGrouping && (
            <div style={{ color: 'var(--text-dim)', cursor: 'grab' }} title="Arraste para agrupar">
              <GripVertical size={14} />
            </div>
          )}

          {childCards.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              color: '#c0c1ff',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}>
              <Layers size={12} />
              <span>Cluster ({childCards.length + 1} cards)</span>
            </div>
          )}

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
              <span>Injetado por IA</span>
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
        </div>

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

      {/* Conteúdo Principal do Card */}
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

      {/* Sub-cards agrupados sob este card (Cluster) */}
      {childCards.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          paddingLeft: '0.5rem',
          borderLeft: '2px solid rgba(99, 102, 241, 0.4)',
          marginTop: '0.25rem',
        }}>
          {childCards.map((child) => (
            <div
              key={child.id}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                <CornerDownRight size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word' }}>{child.content}</span>
              </div>

              {isGrouping && onUngroupCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUngroupCard(child.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    flexShrink: 0,
                  }}
                  title="Desagrupar este card"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer: Votação (VOTING em diante) */}
      {(phase === 'VOTING' || phase === 'ACTION_ITEMS' || phase === 'ARCHIVED') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.4rem' }}>
          <button
            disabled={phase !== 'VOTING' || (!hasVoted && isVoteLimitReached)}
            onClick={() => onVote(card.id)}
            title={
              phase !== 'VOTING' 
                ? 'Votação encerrada' 
                : !hasVoted && isVoteLimitReached 
                  ? 'Você atingiu seu limite de votos. Desmarque um voto para escolher outro card.' 
                  : hasVoted 
                    ? 'Clique para remover seu voto' 
                    : 'Clique para votar neste card'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: hasVoted ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${hasVoted ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              color: hasVoted ? '#a5b4fc' : !hasVoted && isVoteLimitReached ? 'var(--text-dim)' : 'var(--text-muted)',
              opacity: !hasVoted && isVoteLimitReached ? 0.45 : 1,
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: phase === 'VOTING' && (hasVoted || !isVoteLimitReached) ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            <ThumbsUp size={12} />
            <span>{totalClusterVotes}</span>
          </button>
        </div>
      )}
    </div>
  );
};
