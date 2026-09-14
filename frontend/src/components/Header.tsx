import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Bell
} from 'lucide-react';
import { soundPlayer } from '../utils/sound';

interface HeaderProps {
  title: string;
  phase: BoardPhase;
  isFacilitator: boolean;
  timerSecondsRemaining?: number;
  timerIsRunning?: boolean;
  timerEndsAt?: number | null;
  maxVotesPerUser?: number;
  userVotedCount?: number;
  onControlTimer?: (action: 'START' | 'PAUSE' | 'ADD_SECONDS' | 'RESET', seconds?: number) => void;
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
  timerSecondsRemaining = 300,
  timerIsRunning = false,
  timerEndsAt,
  maxVotesPerUser = 5,
  userVotedCount = 0,
  onControlTimer,
  onNextPhase,
  onExport,
  onToggleTelemetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(timerSecondsRemaining);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [hasAlertedEnd, setHasAlertedEnd] = useState(false);
  const timerMenuRef = useRef<HTMLDivElement>(null);

  // Sincronização do som mudo com o utilitário
  useEffect(() => {
    soundPlayer.isMuted = soundMuted;
  }, [soundMuted]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cálculo preciso em tempo real do timer sincronizado
  useEffect(() => {
    if (!timerIsRunning || !timerEndsAt) {
      setLocalSeconds(timerSecondsRemaining);
      return;
    }

    const calcTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((timerEndsAt - now) / 1000));
      setLocalSeconds(diff);

      if (diff === 0 && !hasAlertedEnd) {
        soundPlayer.playChime();
        setHasAlertedEnd(true);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 250);
    return () => clearInterval(interval);
  }, [timerIsRunning, timerEndsAt, timerSecondsRemaining, hasAlertedEnd]);

  // Se o tempo aumentar novamente (ex: facilitador adicionou tempo), reseta o alarme disparado
  useEffect(() => {
    if (localSeconds > 0) {
      setHasAlertedEnd(false);
    }
  }, [localSeconds]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === phase);
  const nextPhaseObj = PHASES[currentPhaseIndex + 1];

  const handleCopyLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      navigator.clipboard.writeText(url.toString());
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTimerFinished = localSeconds === 0;

  return (
    <header style={{
      background: 'rgba(15, 19, 28, 0.9)',
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
              {isFacilitator && (
                <span style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: 'var(--color-facilitator)',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Facilitador
                </span>
              )}
            </div>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              margin: '0.1rem 0 0 0',
            }}>
              {title}
            </h1>
          </div>
        </div>

        {/* Centro: Stepper das Fases do FSM */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-full)',
          overflowX: 'auto',
          maxWidth: '100%',
        }}>
          {PHASES.map((p, idx) => {
            const isCurrent = p.key === phase;
            const isDone = idx < currentPhaseIndex;
            const Icon = p.icon;

            return (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#ffffff' : isDone ? 'var(--color-went-well)' : 'var(--text-dim)',
                  background: isCurrent ? 'var(--color-primary)' : 'transparent',
                  boxShadow: isCurrent ? '0 0 12px var(--color-primary-glow)' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? <CheckCircle2 size={14} color="var(--color-went-well)" /> : <Icon size={14} />}
                <span>{p.label}</span>
              </div>
            );
          })}
        </div>

        {/* Lado Direito: Votação Pill, Timer Capsule, Compartilhar, Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Cápsula de Cota de Votos (exibida exclusivamente na fase de VOTING) */}
          {phase === 'VOTING' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              color: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? '#fca5a5' : '#c7d2fe',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              <Vote size={14} />
              <span>
                {maxVotesPerUser === 0 
                  ? `${userVotedCount} votos dados (Ilimitado)` 
                  : userVotedCount >= maxVotesPerUser
                    ? `Votos esgotados: ${userVotedCount}/${maxVotesPerUser}`
                    : `Votos: ${userVotedCount}/${maxVotesPerUser}`}
              </span>
            </div>
          )}

          {/* Timer Capsule Sincronizado */}
          <div style={{ position: 'relative' }} ref={timerMenuRef}>
            <div 
              onClick={() => {
                if (isFacilitator) {
                  setShowTimerMenu(!showTimerMenu);
                } else {
                  // Participante simples pode mutar/desmutar som
                  setSoundMuted(!soundMuted);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: isTimerFinished 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : timerIsRunning 
                    ? 'rgba(99, 102, 241, 0.15)' 
                    : 'rgba(255, 255, 255, 0.05)',
                border: isTimerFinished 
                  ? '1px solid var(--color-to-improve)' 
                  : timerIsRunning 
                    ? '1px solid rgba(99, 102, 241, 0.4)' 
                    : '1px solid var(--border-subtle)',
                padding: '0.38rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                color: isTimerFinished ? 'var(--color-to-improve)' : 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isTimerFinished 
                  ? '0 0 14px rgba(244, 63, 94, 0.4)' 
                  : timerIsRunning 
                    ? '0 0 12px var(--color-primary-glow)' 
                    : 'none',
              }}
              title={isFacilitator ? "Controles do Timer (Clique para configurar)" : "Clique para ligar/desligar som do alarme"}
            >
              <Clock size={15} color={isTimerFinished ? 'var(--color-to-improve)' : 'var(--color-primary)'} />
              <span>{formatTimer(localSeconds)}</span>
              {timerIsRunning && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />
              )}
            </div>

            {/* Menu Popover do Timer para o Facilitador */}
            {showTimerMenu && isFacilitator && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#0f172a',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                zIndex: 60,
                width: 260,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Timer da Sala
                  </span>
                  <button
                    onClick={() => setSoundMuted(!soundMuted)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: soundMuted ? 'var(--text-dim)' : 'var(--color-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      padding: 0,
                    }}
                    title={soundMuted ? "Som desativado" : "Som ativo"}
                  >
                    {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>{soundMuted ? 'Mudo' : 'Som on'}</span>
                  </button>
                </div>

                {/* Presets Rápidos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                  {[
                    { label: '1m', secs: 60 },
                    { label: '3m', secs: 180 },
                    { label: '5m', secs: 300 },
                    { label: '10m', secs: 600 },
                  ].map((p) => (
                    <button
                      key={p.secs}
                      onClick={() => {
                        onControlTimer?.('START', p.secs);
                        setShowTimerMenu(false);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0',
                        color: 'var(--text-main)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Controles Principais */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <button
                    onClick={() => {
                      if (timerIsRunning) {
                        onControlTimer?.('PAUSE');
                      } else {
                        onControlTimer?.('START', localSeconds > 0 ? localSeconds : 300);
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      background: timerIsRunning ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-primary)',
                      border: timerIsRunning ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                      color: '#ffffff',
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {timerIsRunning ? <Pause size={14} /> : <Play size={14} />}
                    <span>{timerIsRunning ? 'Pausar' : 'Iniciar'}</span>
                  </button>

                  <button
                    onClick={() => onControlTimer?.('ADD_SECONDS', 60)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Adicionar 1 minuto"
                  >
                    <Plus size={13} />
                    <span>1m</span>
                  </button>

                  <button
                    onClick={() => onControlTimer?.('RESET', 300)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Resetar para 5 minutos"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {/* Teste de Som */}
                <button
                  onClick={() => soundPlayer.playChime()}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem',
                    color: 'var(--text-dim)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Bell size={12} />
                  <span>Testar Alarme Sonoro</span>
                </button>
              </div>
            )}
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
              padding: '0.42rem 0.8rem',
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
              padding: '0.42rem 0.7rem',
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
                padding: '0.42rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Telemetria e Injeção de IA via MCP"
            >
              <span>MCP</span>
            </button>
          )}

          {/* Botão de Avanço de Fase (Apenas Facilitador) */}
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
                padding: '0.42rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 14px var(--color-primary-glow)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Avançar: {nextPhaseObj.label.split('. ')[1]}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
