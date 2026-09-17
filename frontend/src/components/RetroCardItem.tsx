import React, { useState } from 'react';
import type { Card, BoardPhase } from '../types';
import { 
  Trash2, 
  Pencil, 
  Check, 
  Lock, 
  Bot, 
  X, 
  GripVertical, 
  Layers, 
  CornerDownRight,
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RetroCardItemProps {
  card: Card;
  childCards?: Card[];
  phase: BoardPhase;
  hasVoted: boolean;
  canEdit: boolean;
  sessionHash?: string;
  isVoteLimitReached?: boolean;
  onVote: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onGroupCards?: (parentCardId: string, childCardIds: string[]) => void;
  onUngroupCard?: (cardId: string) => void;
  onToggleReaction?: (cardId: string, emoji: string) => void;
}

const AVAILABLE_REACTIONS = ['👏', '❤️', '💡', '🚀'];

export const RetroCardItem: React.FC<RetroCardItemProps> = ({
  card,
  childCards = [],
  phase,
  hasVoted,
  canEdit,
  sessionHash,
  isVoteLimitReached = false,
  onVote,
  onUpdate,
  onDelete,
  onGroupCards,
  onUngroupCard,
  onToggleReaction,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { t } = useTranslation();

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
        background: 'var(--bg-subtle)',
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
          </div>
          <span style={{
            fontSize: '0.7rem',
            background: 'var(--bg-subtle-hover)',
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-dim)',
          }}>
            {t('card.blind_mode')}
          </span>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.1rem',
          letterSpacing: '0.2em',
          color: 'var(--text-dim)',
          padding: '0.5rem 0',
          userSelect: 'none',
        }}>
          ••••••••••••
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          {t('card.revealed_automatically')}
        </div>
      </div>
    );
  }

  // 2. Drag & Drop Handlers (Grouping & Column Move)
  const handleDragStart = (e: React.DragEvent) => {
    if (phase !== 'BRAINSTORM' && phase !== 'GROUPING') return;
    const payload = JSON.stringify({ cardId: card.id, columnId: card.column_id });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isGrouping) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    if (isDragOver) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isGrouping) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    let draggedCardId = e.dataTransfer.getData('text/plain');
    let draggedColId = '';
    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.cardId) draggedCardId = parsed.cardId;
        if (parsed.columnId) draggedColId = parsed.columnId;
      } catch {}
    }

    // Regra 1: Só permite agrupar cards da MESMA coluna!
    if (draggedCardId && draggedCardId !== card.id && onGroupCards) {
      if (draggedColId && draggedColId !== card.column_id) {
        // Drop de outra coluna sobre este card não agrupa
        return;
      }
      onGroupCards(card.id, [draggedCardId]);
    }
  };

  const totalClusterVotes = card.vote_count + childCards.reduce((sum, c) => sum + c.vote_count, 0);

  return (
    <div
      draggable={(isGrouping || phase === 'BRAINSTORM') && !isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: isDragOver ? 'var(--color-primary-subtle)' : 'var(--bg-card)',
        border: isDragOver
          ? '2px dashed var(--color-primary)'
          : childCards.length > 0
          ? '1px solid var(--border-primary)'
          : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        position: 'relative',
        transition: 'all var(--transition-fast)',
        boxShadow: isDragOver ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: isGrouping ? 'grab' : 'default',
      }}
    >
      {/* Indicador de Drop em Hover */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-primary-subtle)',
          backdropFilter: 'blur(4px)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary)',
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
              background: 'var(--cluster-bg)',
              border: '1px solid var(--cluster-border)',
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-primary)',
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
              background: 'var(--color-action-bg)',
              border: '1px solid var(--color-action-border)',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-action)',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              <Bot size={11} />
              <span>{t('card.ai_generated')}</span>
            </div>
          ) : phase === 'BRAINSTORM' && canEdit ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--color-went-well-bg)',
              border: '1px solid var(--color-went-well-border)',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-went-well)',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}>
              <Lock size={11} />
              <span>{t('card.visible_only_you')}</span>
            </div>
          ) : null}
        </div>

        {/* Ações do Card (Apenas Autor em Fases Editáveis) */}
        {canEdit && (phase === 'BRAINSTORM' || phase === 'GROUPING') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => onDelete(card.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: 'var(--radius-sm)',
              }}
              title={t('card.delete')}
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-dim)',
                padding: '0.3rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
              title={t('card.edit')}
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo do Card */}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              padding: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical',
              minHeight: 60,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <button
              onClick={() => {
                setEditContent(card.content);
                setIsEditing(false);
              }}
              style={{
                background: 'var(--bg-subtle-hover)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-dim)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <X size={12} />
              <span>{t('card.cancel')}</span>
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
              <Check size={12} />
              <span>{t('card.save')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card-markdown-content" style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-main)', wordBreak: 'break-word' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {card.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Sub-cards agrupados sob este card (Cluster) */}
      {childCards.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          paddingLeft: '0.5rem',
          borderLeft: '2px solid var(--color-primary)',
          marginTop: '0.25rem',
        }}>
          {childCards.map((child) => (
            <div
              key={child.id}
              style={{
                background: 'var(--cluster-bg)',
                border: '1px solid var(--cluster-border)',
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', flex: 1 }}>
                <CornerDownRight size={13} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <div className="card-markdown-content" style={{ wordBreak: 'break-word', flex: 1 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {child.content}
                  </ReactMarkdown>
                </div>
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
                  title={t('card.ungroup')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer: Reações Rápidas e Votação */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '0.4rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '0.25rem',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {/* Micro-reações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
          {AVAILABLE_REACTIONS.map((emoji) => {
            const entry = card.reactions?.find((r) => r.emoji === emoji);
            const count = entry?.count || 0;
            const hasReacted = Boolean(sessionHash && entry?.users?.includes(sessionHash));

            if (count === 0 && !hasReacted && !showReactionPicker) return null;

            return (
              <button
                key={emoji}
                type="button"
                className={`reaction-pill ${hasReacted ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReaction && onToggleReaction(card.id, emoji);
                  setShowReactionPicker(false);
                }}
                title={hasReacted ? `Você reagiu com ${emoji}. Clique para remover.` : `Reagir com ${emoji}`}
              >
                <span>{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}

          {onToggleReaction && (
            <button
              type="button"
              className="reaction-pill"
              onClick={(e) => {
                e.stopPropagation();
                setShowReactionPicker(!showReactionPicker);
              }}
              title={t('card.add_reaction')}
              style={{ padding: '0.18rem 0.45rem', opacity: showReactionPicker ? 1 : 0.75 }}
            >
              <Plus size={11} />
              <span style={{ fontSize: '0.68rem' }}>{showReactionPicker ? '✕' : t('card.react')}</span>
            </button>
          )}
        </div>

        {/* Votação (VOTING em diante) */}
        {(phase === 'VOTING' || phase === 'ACTION_ITEMS' || phase === 'ARCHIVED') && (
          <button
            disabled={phase !== 'VOTING' || (!hasVoted && isVoteLimitReached)}
            onClick={(e) => {
              e.stopPropagation();
              onVote(card.id);
            }}
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
              background: hasVoted ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
              border: `1px solid ${hasVoted ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              color: hasVoted ? 'var(--color-primary)' : !hasVoted && isVoteLimitReached ? 'var(--text-dim)' : 'var(--text-muted)',
              opacity: !hasVoted && isVoteLimitReached ? 0.45 : 1,
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: phase === 'VOTING' && (hasVoted || !isVoteLimitReached) ? 'pointer' : 'not-allowed',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ThumbsUp size={12} />
            <span>{totalClusterVotes}</span>
          </button>
        )}
      </div>
    </div>
  );
};
