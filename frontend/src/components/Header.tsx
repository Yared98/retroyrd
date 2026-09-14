import React, { useState, useEffect } from 'react';
import type { BoardPhase } from '../types';
import { 
  CheckCircle2, 
  Share2, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Lightbulb, 
  Layers, 
  Vote, 
  ListTodo, 
  Archive,
  Download,
  Check
} from 'lucide-react';

interface HeaderProps {
  title: string;
  phase: BoardPhase;
  isFacilitator: boolean;
  onNextPhase: (next: BoardPhase) => void;
  onExport: () => void;
  onToggleTelemetry?: () => void;
}

const PHASES: { key: BoardPhase; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { key: 'SAFETY_CHECK', label: '1. Safety Check', icon: ShieldCheck },
  { key: 'BRAINSTORM', label: '2. Brainstorm (Blind)', icon: Lightbulb },
  { key: 'GROUPING', label: '3. Grouping', icon: Layers },
  { key: 'VOTING', label: '4. Voting', icon: Vote },
  { key: 'ACTION_ITEMS', label: '5. Action Items', icon: ListTodo },
  { key: 'ARCHIVED', label: '6. Archived', icon: Archive },
];

export const Header: React.FC<HeaderProps> = ({
  title,
  phase,
  isFacilitator,
  onNextPhase,
  onExport,
  onToggleTelemetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 min timer padrão
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    if (!timerRunning || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, secondsRemaining]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === phase);
  const nextPhaseObj = PHASES[currentPhaseIndex + 1];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header style={{
      background: 'rgba(15, 19, 28, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.875rem 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        {/* Lado Esquerdo: Título & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="pulse-dot" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-went-well)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LIVE SESSÃO
              </span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
          </div>
        </div>

        {/* Centro: Stepper das Fases FSM */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
        }}>
          {PHASES.map((p, idx) => {
            const isDone = idx < currentPhaseIndex;
            const isCurrent = idx === currentPhaseIndex;
            const Icon = p.icon;

            let badgeBg = 'transparent';
            let badgeColor = 'var(--text-dim)';
            let borderColor = 'transparent';

            if (isCurrent) {
              badgeBg = 'rgba(99, 102, 241, 0.2)';
              badgeColor = 'var(--color-primary)';
              borderColor = 'rgba(99, 102, 241, 0.5)';
            } else if (isDone) {
              badgeColor = 'var(--color-went-well)';
            }

            return (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${borderColor}`,
                  fontSize: '0.8rem',
                  fontWeight: isCurrent ? 700 : 500,
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? <CheckCircle2 size={14} color="var(--color-went-well)" /> : <Icon size={14} />}
                <span>{p.label}</span>
              </div>
            );
          })}
        </div>

        {/* Lado Direito: Timer, Compartilhar, Ações do Facilitador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Timer Capsule */}
          <div 
            onClick={() => setTimerRunning(!timerRunning)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Clique para pausar/retomar"
          >
            <Clock size={15} color="var(--color-primary)" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Botão Compartilhar */}
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {copied ? <Check size={14} color="var(--color-went-well)" /> : <Share2 size={14} />}
            <span>{copied ? 'Copiado!' : 'Convidar'}</span>
          </button>

          {/* Exportar Markdown */}
          <button
            onClick={onExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Exportar Retrospectiva"
          >
            <Download size={14} />
          </button>

          {/* Botão de Telemetria MCP */}
          {onToggleTelemetry && (
            <button
              onClick={onToggleTelemetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#c4b5fd',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>🤖 MCP</span>
            </button>
          )}

          {/* Botão de Avanço de Fase para Facilitador */}
          {isFacilitator && nextPhaseObj && (
            <button
              onClick={() => onNextPhase(nextPhaseObj.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--color-primary)',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px var(--color-primary-glow)',
                transition: 'all 0.15s',
              }}
            >
              <span>Próxima: {nextPhaseObj.label.replace(/^\d+\.\s*/, '')}</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
