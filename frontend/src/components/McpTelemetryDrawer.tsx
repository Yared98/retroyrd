import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bot, Sparkles, Send, Copy, Check, Terminal, Shield, Key } from 'lucide-react';
import type { BoardStateSnapshot } from '../types';
import { useTranslation, Trans } from 'react-i18next';

interface McpTelemetryDrawerProps {
  isOpen: boolean;
  snapshot?: BoardStateSnapshot | null;
  facilitatorToken?: string | null;
  onClose: () => void;
}

export const McpTelemetryDrawer: React.FC<McpTelemetryDrawerProps> = ({
  isOpen,
  snapshot,
  facilitatorToken,
  onClose,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [mcpLogs, setMcpLogs] = useState<string[]>([
    'MCP Server listening on /mcp',
    'Registered Resource: retro://board/{id}/state',
    'Registered Resource: retro://board/{id}/metrics',
    'Registered Tool: create_card (bidirectional write)',
    'Registered Tool: group_cards (requires facilitator_token)',
    'Registered Tool: change_phase (requires facilitator_token)',
  ]);

  const { t } = useTranslation();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const mcpServerUrl = `${window.location.origin}/mcp`;
  const resourceUri = snapshot?.board?.id
    ? `retro://board/${snapshot.board.id}/state${snapshot.is_facilitator && facilitatorToken ? `?token=${facilitatorToken}` : ''}`
    : `retro://board/{board_id}/state`;

  const jsonConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        retroyrd: {
          url: mcpServerUrl,
        },
      },
    },
    null,
    2
  );

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleInjectAiAction = async () => {
    if (!aiPrompt.trim() || !snapshot?.board?.id) return;
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
              ...(snapshot.is_facilitator && facilitatorToken ? { facilitator_token: facilitatorToken } : {}),
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
      } else if (data.error) {
        setMcpLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Error: ${data.error.message}`,
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInjecting(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 480,
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
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Model Context Protocol (MCP)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-went-well)', marginTop: '0.15rem' }}>
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              <span>{t('mcp_drawer.server_active')}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          title={t('mcp_drawer.close')}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Card de Conexão com IAs (Claude Desktop, Cursor, Antigravity) */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
              <Terminal size={15} color="var(--color-primary)" />
              <span>{t('mcp_drawer.connect_ai')}</span>
            </div>
            {snapshot?.is_facilitator ? (
              <span style={{
                background: 'var(--color-facilitator-bg)',
                color: 'var(--color-facilitator)',
                border: '1px solid var(--color-facilitator-border)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <Key size={10} />
                <span>{t('mcp_drawer.facilitator')}</span>
              </span>
            ) : snapshot ? (
              <span style={{
                background: 'var(--bg-subtle-hover)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <Shield size={10} />
                <span>{t('mcp_drawer.participant')}</span>
              </span>
            ) : (
              <span style={{
                background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
                color: 'var(--color-primary)',
                border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <Bot size={10} />
                <span>MCP Server</span>
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            {t('mcp_drawer.embed_desc')}
          </p>

          {/* 1. URL do Servidor MCP */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              {t('mcp_drawer.server_url')}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                readOnly
                value={mcpServerUrl}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                }}
              />
              <button
                onClick={() => copyToClipboard(mcpServerUrl, setCopiedUrl)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: copiedUrl ? 'var(--color-went-well-bg)' : 'var(--bg-subtle-hover)',
                  border: `1px solid ${copiedUrl ? 'var(--color-went-well-border)' : 'var(--border-subtle)'}`,
                  color: copiedUrl ? 'var(--color-went-well)' : 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
                title={t('mcp_drawer.copy_url')}
              >
                {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedUrl ? t('mcp_drawer.copied') : t('mcp_drawer.copy_url')}</span>
              </button>
            </div>
          </div>

          {/* 2. Resource URI Deste Board */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              {t('mcp_drawer.board_uri')}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                readOnly
                value={resourceUri}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.6rem',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                }}
              />
              <button
                onClick={() => copyToClipboard(resourceUri, setCopiedUri)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: copiedUri ? 'var(--color-went-well-bg)' : 'var(--bg-subtle-hover)',
                  border: `1px solid ${copiedUri ? 'var(--color-went-well-border)' : 'var(--border-subtle)'}`,
                  color: copiedUri ? 'var(--color-went-well)' : 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
                title={t('mcp_drawer.copy_uri')}
              >
                {copiedUri ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedUri ? t('mcp_drawer.copied') : t('mcp_drawer.copy_uri')}</span>
              </button>
            </div>
            <span style={{ fontSize: '0.67rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
              {snapshot?.is_facilitator
                ? t('mcp_drawer.facil_token_desc')
                : t('mcp_drawer.part_token_desc')}
            </span>
          </div>

          {/* 3. JSON de Configuração para claude_desktop_config.json */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {t('mcp_drawer.json_config')}
              </span>
              <button
                onClick={() => copyToClipboard(jsonConfigSnippet, setCopiedConfig)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  color: copiedConfig ? 'var(--color-went-well)' : 'var(--color-primary)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {copiedConfig ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedConfig ? t('mcp_drawer.copied') : t('mcp_drawer.copy_json')}</span>
              </button>
            </div>
            <pre style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 0.65rem',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              overflowX: 'auto',
            }}>
              {jsonConfigSnippet}
            </pre>
          </div>
        </div>

        {/* Métricas do Board expostas para o LLM */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Resource: retro://board/{snapshot?.board?.id ? `${snapshot.board.id.substring(0, 8)}...` : '{board_id}'}/metrics
          </div>
          {snapshot ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('mcp_drawer.active_phase')}</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {snapshot.board.phase}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('mcp_drawer.total_cards')}</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {snapshot.cards.length} {t('mcp_drawer.cards_count')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('mcp_drawer.safety_score')}</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-went-well)' }}>
                  {snapshot.safety_summary ? `${snapshot.safety_summary.average.toFixed(1)} / 5.0` : 'N/A'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('mcp_drawer.action_items')}</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-action)' }}>
                  {snapshot.action_items.length} {t('mcp_drawer.items_count')}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              As métricas de clima da equipe (Safety Check), contagem de cards e action items são transmitidas via MCP em tempo real quando uma retrospectiva estiver aberta.
            </p>
          )}
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
            <span>{t('mcp_drawer.simulate_injection')}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            <Trans i18nKey="mcp_drawer.simulate_desc">
              LLMs conectados ao servidor MCP podem executar a tool <code>create_card</code> para sugerir soluções automaticamente a partir dos problemas mais votados.
            </Trans>
          </p>

          {snapshot?.board?.id ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t('mcp_drawer.simulate_placeholder')}
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
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Abra ou crie uma sessão de retrospectiva para enviar ações ao vivo pelo simulador.
            </div>
          )}
        </div>

        {/* Console / Telemetria em tempo real */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {t('mcp_drawer.telemetry_logs')}
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
    </div>,
    document.body
  );
};
