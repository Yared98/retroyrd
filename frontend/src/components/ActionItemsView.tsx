import React, { useState, useMemo } from 'react';
import type { ActionItem, Card, Column } from '../types';
import { Bot, CheckCircle2, Circle, Plus, UserCheck, ThumbsUp, ArrowRight, Sparkles, AlertCircle, CornerDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ActionItemsViewProps {
  items: ActionItem[];
  cards?: Card[];
  columns?: Column[];
  canManage: boolean;
  onAddAction: (description: string, owner?: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export const ActionItemsView: React.FC<ActionItemsViewProps> = ({
  items,
  cards = [],
  columns = [],
  canManage,
  onAddAction,
  onToggleStatus,
}) => {
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const { t } = useTranslation();

  // Mapeamento de colunas por id para color e titulo
  const columnMap = useMemo(() => {
    const map = new Map<string, Column>();
    for (const col of columns) {
      map.set(col.id, col);
    }
    return map;
  }, [columns]);

  // Top cards votados ordenados por numero de votos (apenas cards raiz)
  const prioritizedCards = useMemo(() => {
    const rootCards = cards.filter((c) => !c.parent_card_id);
    // Ordenar por votos decrescente
    return [...rootCards].sort((a, b) => b.vote_count - a.vote_count);
  }, [cards]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim()) {
      onAddAction(desc.trim(), owner.trim() || undefined);
      setDesc('');
      setOwner('');
      setShowAdd(false);
    }
  };

  const handleCreateFromCard = (cardContent: string) => {
    setDesc(`Ação: ${cardContent}`);
    setShowAdd(true);
  };

  const completedCount = items.filter((i) => i.status === 'DONE').length;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      {/* Header explicativo da Fase 5 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'var(--color-action)',
            color: '#fff',
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-action)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {canManage ? t('action_items.phase5_title') : t('action_items.phase6_title')}
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              {canManage ? t('action_items.phase5_heading') : t('action_items.phase6_heading')}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {canManage 
                ? t('action_items.phase5_desc')
                : t('action_items.phase6_desc')}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{t('action_items.progress')}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: completedCount === items.length ? 'var(--color-went-well)' : 'var(--text-main)' }}>
              {completedCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}>/ {items.length} {t('action_items.completed')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Layout Dividido: Tópicos Prioritários vs Plano de Ação */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Painel Esquerdo: Tópicos Priorizados (Contexto para criar ações) */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ThumbsUp size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {t('action_items.prioritized_topics')}
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {prioritizedCards.length} {t('action_items.topics')}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {t('action_items.prioritized_desc')}
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            maxHeight: 520,
            overflowY: 'auto',
            paddingRight: '0.25rem',
          }}>
            {prioritizedCards.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}>
                {t('action_items.no_topics')}
              </div>
            ) : (
              prioritizedCards.map((card) => {
                const col = columnMap.get(card.column_id);
                const colColor = col?.color || 'var(--color-primary)';
                const colTitle = col?.title || 'Coluna';
                const childCards = cards.filter((c) => c.parent_card_id === card.id);

                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: colColor,
                        background: `${colColor}18`,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: colColor }} />
                        {colTitle}
                      </span>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: card.vote_count > 0 ? 'var(--color-primary)' : 'var(--text-dim)',
                        background: card.vote_count > 0 ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                        padding: '0.15rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        <ThumbsUp size={11} />
                        {card.vote_count} {card.vote_count === 1 ? t('action_items.vote_singular') : t('action_items.vote_plural')}
                      </span>
                    </div>

                    <div className="card-markdown-content" style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {card.content}
                      </ReactMarkdown>
                    </div>

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
                          </div>
                        ))}
                      </div>
                    )}

                    {canManage && (
                      <button
                        onClick={() => handleCreateFromCard(card.content)}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-action)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0',
                          marginTop: '0.25rem',
                        }}
                      >
                        <ArrowRight size={12} />
                        <span>{t('action_items.create_action')}</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Plano de Ação (Ações da Equipe) */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {t('action_items.action_board')}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                {t('action_items.create_new_commitment')}
              </div>
            </div>

            {canManage && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'var(--color-action)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 14px var(--color-action-glow)',
                }}
              >
                <Plus size={15} />
                <span>{t('action_items.create_new_action')}</span>
              </button>
            )}
          </div>

          {/* Formulário de Adição */}
          {showAdd && (
            <form onSubmit={handleSubmit} style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--color-action)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <input
                type="text"
                required
                autoFocus
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t('action_items.what_to_do')}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem 0.8rem',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder={t('action_items.owner_optional')}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.8rem',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    padding: '0 0.8rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  {t('action_items.cancel')}
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-action)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {t('action_items.add')}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Ações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {items.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-dim)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <AlertCircle size={28} color="var(--text-dim)" />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('action_items.no_actions_yet')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 360 }}>
                  {t('action_items.add_first_action')}
                </div>
              </div>
            ) : (
              items.map((item) => {
                const isDone = item.status === 'DONE';
                return (
                  <div
                    key={item.id}
                    style={{
                      background: isDone ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1.1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      borderLeft: item.is_ai_generated ? '4px solid var(--color-action)' : '4px solid var(--color-primary)',
                      opacity: isDone ? 0.65 : 1,
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', flex: 1 }}>
                      <button
                        disabled={!canManage}
                        onClick={() => canManage && onToggleStatus(item.id, isDone ? 'TODO' : 'DONE')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: canManage ? 'pointer' : 'default',
                          color: isDone ? 'var(--color-went-well)' : 'var(--text-dim)',
                          padding: 0,
                          marginTop: 2,
                          display: 'flex',
                          opacity: canManage ? 1 : 0.6,
                        }}
                        title={
                          !canManage
                            ? t('action_items.archived_readonly')
                            : isDone
                              ? t('action_items.mark_pending')
                              : t('action_items.mark_done')
                        }
                      >
                        {isDone ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div className="card-markdown-content" style={{
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          color: isDone ? 'var(--text-dim)' : 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.description}
                          </ReactMarkdown>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {item.is_ai_generated && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'rgba(139, 92, 246, 0.2)',
                              color: '#c4b5fd',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                            }}>
                              <Bot size={11} />
                              <span>{t('action_items.injected_ai')}</span>
                            </span>
                          )}

                          {item.owner && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                            }}>
                              <UserCheck size={11} />
                              <span>{item.owner}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

