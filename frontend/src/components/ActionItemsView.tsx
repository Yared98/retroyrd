import React, { useState, useMemo } from 'react';
import type { ActionItem, Card, Column } from '../types';
import { Bot, CheckCircle2, Circle, Plus, UserCheck, ThumbsUp, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

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
            boxShadow: '0 0 16px var(--color-action-glow)',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-action)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Fase 5: Síntese & Compromissos
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              Plano de Ação da Retrospectiva
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              As ideias foram votadas. Agora a equipe converte os principais pontos de atenção em compromissos executáveis com responsáveis definidos.
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Progresso</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: completedCount === items.length ? 'var(--color-went-well)' : 'var(--text-main)' }}>
              {completedCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}>/ {items.length} concluídos</span>
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
                Tópicos Priorizados (Mais Votados)
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {prioritizedCards.length} tópicos
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Estes são os temas mais votados pela equipe. Use-os como base para formular as ações à direita.
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
                Nenhum tópico registrado na retrospectiva.
              </div>
            ) : (
              prioritizedCards.map((card) => {
                const col = columnMap.get(card.column_id);
                const colColor = col?.color || 'var(--color-primary)';
                const colTitle = col?.title || 'Coluna';

                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
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
                        background: card.vote_count > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        padding: '0.15rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        <ThumbsUp size={11} />
                        {card.vote_count} {card.vote_count === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {card.content}
                    </div>

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
                        <ArrowRight size={13} />
                        <span>Transformar em Ação</span>
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
                Compromissos & Ações
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                Defina o que será feito e quem assume a responsabilidade.
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
                <span>Nova Ação</span>
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
                placeholder="Qual é a ação clara a ser tomada?"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem 0.8rem',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Responsável / Squad (opcional)"
                  style={{
                    flex: 1,
                    minWidth: 160,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.8rem',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none',
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
                  Cancelar
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
                  }}
                >
                  Salvar Ação
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
                background: 'rgba(15, 23, 42, 0.3)',
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
                  Nenhum item de ação criado ainda.
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 360 }}>
                  Clique em "+ Transformar em Ação" em qualquer tópico prioritário ao lado, ou use o botão "+ Nova Ação". A IA também pode injetar ações autonomamente via MCP!
                </div>
              </div>
            ) : (
              items.map((item) => {
                const isDone = item.status === 'DONE';
                return (
                  <div
                    key={item.id}
                    style={{
                      background: isDone ? 'rgba(15, 23, 42, 0.3)' : 'rgba(15, 23, 42, 0.7)',
                      border: isDone ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1.1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      borderLeft: item.is_ai_generated ? '4px solid var(--color-action)' : '4px solid var(--color-primary)',
                      opacity: isDone ? 0.65 : 1,
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
                            ? 'Sessão arquivada (Somente leitura)'
                            : isDone
                              ? 'Marcar como pendente'
                              : 'Marcar como concluído'
                        }
                      >
                        {isDone ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          color: isDone ? 'var(--text-dim)' : 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}>
                          {item.description}
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
                              <span>Injetado por IA via MCP</span>
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

