import React, { useState } from 'react';
import type { ActionItem } from '../types';
import { Bot, CheckCircle2, Circle, Plus, UserCheck } from 'lucide-react';

interface ActionItemsViewProps {
  items: ActionItem[];
  canManage: boolean;
  onAddAction: (description: string, owner?: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export const ActionItemsView: React.FC<ActionItemsViewProps> = ({
  items,
  canManage,
  onAddAction,
  onToggleStatus,
}) => {
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim()) {
      onAddAction(desc.trim(), owner.trim() || undefined);
      setDesc('');
      setOwner('');
      setShowAdd(false);
    }
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-action)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fase 5: Síntese e Compromissos
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Plano de Ação da Equipe (Action Items)
          </h2>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--color-action)',
              border: 'none',
              color: '#ffffff',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 16px var(--color-action-glow)',
            }}
          >
            <Plus size={16} />
            <span>Adicionar Ação</span>
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text"
            required
            autoFocus
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Qual é a ação clara a ser tomada?"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.8rem',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Responsável / Squad (opcional)"
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.8rem',
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
                padding: '0 1rem',
                cursor: 'pointer',
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
                padding: '0 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(15, 23, 42, 0.3)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-dim)',
          }}>
            Nenhum item de ação criado ainda. Itens podem ser adicionados manualmente ou injetados autonomamente pela IA via MCP!
          </div>
        ) : (
          items.map((item) => {
            const isDone = item.status === 'DONE';
            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderLeft: item.is_ai_generated ? '4px solid var(--color-action)' : '4px solid var(--color-primary)',
                  opacity: isDone ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1 }}>
                  <button
                    onClick={() => onToggleStatus(item.id, isDone ? 'TODO' : 'DONE')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: isDone ? 'var(--color-went-well)' : 'var(--text-dim)',
                      padding: 0,
                      marginTop: 2,
                    }}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: isDone ? 'var(--text-dim)' : 'var(--text-main)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      lineHeight: '1.4',
                    }}>
                      {item.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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
  );
};
