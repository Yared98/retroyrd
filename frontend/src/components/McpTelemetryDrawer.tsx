import React, { useState } from 'react';
import { X, Bot, Sparkles, Send } from 'lucide-react';
import type { BoardStateSnapshot } from '../types';

interface McpTelemetryDrawerProps {
  isOpen: boolean;
  snapshot: BoardStateSnapshot;
  onClose: () => void;
}

export const McpTelemetryDrawer: React.FC<McpTelemetryDrawerProps> = ({
  isOpen,
  snapshot,
  onClose,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [mcpLogs, setMcpLogs] = useState<string[]>([
    'MCP Server listening on /mcp',
    'Registered Resource: retro://board/{id}/state',
    'Registered Resource: retro://board/{id}/metrics',
    'Registered Tool: create_card (bidirectional write)',
    'Registered Tool: group_cards (semantic merge)',
  ]);

  if (!isOpen) return null;

  const handleInjectAiAction = async () => {
    if (!aiPrompt.trim()) return;
    setIsInjecting(true);

    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_card',
            arguments: {
              board_id: snapshot.board.id,
              content: aiPrompt.trim(),
              is_action_item: true,
            },
          },
        }),
      });

      const data = await res.json();
      if (data.result) {
        setMcpLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Tool 'create_card' executed by AI Agent: "${aiPrompt.trim()}"`,
        ]);
        setAiPrompt('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 460,
      background: 'var(--bg-surface-elevated)',
      backdropFilter: 'blur(24px)',
      borderLeft: '1px solid var(--border-highlight)',
      zIndex: 60,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-elevated)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'var(--color-action-bg)',
            border: '1px solid var(--color-action-border)',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
          }}>
            <Bot size={20} color="var(--color-action)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Model Context Protocol (MCP)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-went-well)' }}>
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              <span>Servidor Ativo em /mcp</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Métricas do Board expostas para o LLM */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Resource: retro://board/{snapshot.board.id.substring(0, 8)}.../metrics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fase Ativa</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {snapshot.board.phase}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de Cards</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {snapshot.cards.length} cards
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety Score</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-went-well)' }}>
                {snapshot.safety_summary ? `${snapshot.safety_summary.average.toFixed(1)} / 5.0` : 'N/A'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Items</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-action)' }}>
                {snapshot.action_items.length} itens
              </div>
            </div>
          </div>
        </div>

        {/* Simulador de Agente de IA Injetando Ação via MCP */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#c4b5fd', fontSize: '0.85rem', fontWeight: 700 }}>
            <Sparkles size={16} />
            <span>Simular Injeção Autônoma de IA via MCP</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            LLMs conectados ao servidor MCP podem executar a tool <code>create_card</code> para sugerir soluções automaticamente a partir dos problemas mais votados.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Adicionar retry exponencial no worker"
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.75rem',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleInjectAiAction()}
            />
            <button
              disabled={isInjecting || !aiPrompt.trim()}
              onClick={handleInjectAiAction}
              style={{
                background: 'var(--color-action)',
                border: 'none',
                color: '#ffffff',
                padding: '0 0.85rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Console / Telemetria em tempo real */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Logs de Telemetria do Servidor MCP
          </div>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            lineHeight: '1.6',
            color: 'var(--color-primary)',
            maxHeight: 220,
            overflowY: 'auto',
          }}>
            {mcpLogs.map((log, idx) => (
              <div key={idx}>&gt; {log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
