import React, { useState, useEffect, useRef } from 'react';
import type { BoardPhase } from '../types';
import { 
  CheckCircle2, 
  Share2, 
  ArrowRight, 
  ArrowLeft,
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
  Minus,
  Bell,
  Sun,
  Moon,
  Home
} from 'lucide-react';
import { soundPlayer } from '../utils/sound';
import { GithubIcon } from './Footer';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  title: string;
  phase: BoardPhase;
  isFacilitator: boolean;
  timerSecondsRemaining?: number;
  timerIsRunning?: boolean;
  timerEndsAt?: number | null;
  maxVotesPerUser?: number;
  userVotedCount?: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onControlTimer?: (action: 'START' | 'PAUSE' | 'ADD_SECONDS' | 'RESET', seconds?: number) => void;
  onNextPhase: (next: BoardPhase) => void;
  onPrevPhase?: (prev: BoardPhase) => void;
  onExport: () => void;
  onUpdateVoteLimit?: (limit: number) => void;
  onToggleTelemetry?: () => void;
  onHome?: () => void;
}

const getPhases = (t: any): { key: BoardPhase; label: string; icon: React.ComponentType<{ size: number }> }[] => [
  { key: 'SAFETY_CHECK', label: t('header.phase_safety'), icon: ShieldCheck },
  { key: 'BRAINSTORM', label: t('header.phase_brainstorm'), icon: Lightbulb },
  { key: 'GROUPING', label: t('header.phase_grouping'), icon: Layers },
  { key: 'VOTING', label: t('header.phase_voting'), icon: Vote },
  { key: 'ACTION_ITEMS', label: t('header.phase_action'), icon: ListTodo },
  { key: 'ARCHIVED', label: t('header.phase_archived'), icon: Archive },
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
  theme = 'dark',
  onToggleTheme,
  onControlTimer,
  onNextPhase,
  onPrevPhase,
  onExport,
  onUpdateVoteLimit,
  onToggleTelemetry,
  onHome,
}) => {
  const [copied, setCopied] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(timerSecondsRemaining);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [hasAlertedEnd, setHasAlertedEnd] = useState(false);
  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>('right');
  const timerMenuRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  // Sincronização do som mudo com o utilitário
  useEffect(() => {
    soundPlayer.isMuted = soundMuted;
    if (soundMuted) {
      soundPlayer.stop();
    }
  }, [soundMuted]);

  // Interrompe qualquer áudio pendente ao desmontar
  useEffect(() => {
    return () => {
      soundPlayer.stop();
    };
  }, []);

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

  // Ajusta dinamicamente a ancoragem do menu para nunca transbordar os limites da tela
  useEffect(() => {
    if (showTimerMenu && timerMenuRef.current) {
      const rect = timerMenuRef.current.getBoundingClientRect();
      if (window.innerWidth - rect.left < 280) {
        setPopoverAlign('right');
      } else {
        setPopoverAlign('left');
      }
    }
  }, [showTimerMenu]);

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
        soundPlayer.playAlarm(5);
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
      soundPlayer.stop();
    }
  }, [localSeconds]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const phasesList = getPhases(t);
  const currentPhaseIndex = phasesList.findIndex((p) => p.key === phase);
  const prevPhaseObj = currentPhaseIndex > 0 ? phasesList[currentPhaseIndex - 1] : undefined;
  const nextPhaseObj = phasesList[currentPhaseIndex + 1];

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
    <header className="retro-header">
      <div className="retro-header-grid">
        {/* Lado Esquerdo: Marca, Título & Status */}
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="pulse-dot" title="Sessão em tempo real" />
              {isFacilitator && (
                <span style={{
                  background: 'var(--color-facilitator-bg)',
                  color: 'var(--color-facilitator)',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-facilitator-border)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {t('header.facilitator')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', minWidth: 0 }}>
              <a
                href="/"
                onClick={(e) => {
                  if (onHome) {
                    e.preventDefault();
                    onHome();
                  }
                }}
                className="header-home-btn"
                title={t('header.home_title')}
                aria-label="Home"
              >
                <Home size={14} />
              </a>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {title}
              </h1>
            </div>
          </div>
        </div>

        {/* Centro: Stepper das Fases do FSM */}
        <div className="header-stepper">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            padding: '0.25rem 0.35rem',
            borderRadius: 'var(--radius-full)',
          }}>
            {phasesList.map((p, idx) => {
              const isCurrent = p.key === phase;
              const isDone = idx < currentPhaseIndex;
              const Icon = p.icon;

              return (
                <div
                  key={p.key}
                  title={p.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: isCurrent ? '0.35rem 0.75rem' : '0.35rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#ffffff' : isDone ? 'var(--color-went-well)' : 'var(--text-dim)',
                    background: isCurrent ? 'var(--color-primary)' : 'transparent',
                    boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                >
                  {isDone ? <CheckCircle2 size={14} color="var(--color-went-well)" /> : <Icon size={14} />}
                  {isCurrent ? (
                    <span>{p.label}</span>
                  ) : (
                    <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>{idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Wrapper de Ações e Controles */}
        <div className="header-actions">
          {/* Controles Primários: Votação, Timer, Avançar Fase */}
          <div className="header-primary-controls">
            {/* Cápsula de Cota de Votos (exibida exclusivamente na fase de VOTING) */}
            {phase === 'VOTING' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? 'var(--color-to-improve-bg)' : 'var(--color-primary-subtle)',
                border: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? '1px solid var(--color-to-improve-border)' : '1px solid var(--border-primary)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                color: maxVotesPerUser > 0 && userVotedCount >= maxVotesPerUser ? 'var(--color-to-improve)' : 'var(--color-primary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                <Vote size={14} />
                <span>
                  {maxVotesPerUser === 0 
                    ? t('header.votes_unlimited', { count: userVotedCount }) 
                    : t('header.votes_count', { voted: userVotedCount, max: maxVotesPerUser })}
                </span>

                {isFacilitator && onUpdateVoteLimit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.2rem', borderLeft: '1px solid var(--border-primary)', paddingLeft: '0.4rem' }}>
                    <button 
                      onClick={() => onUpdateVoteLimit(Math.max(0, maxVotesPerUser - 1))}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center' }}
                      title={t('header.decrease_votes', 'Diminuir limite de votos')}
                    >
                      <Minus size={12} />
                    </button>
                    <button 
                      onClick={() => onUpdateVoteLimit(maxVotesPerUser + 1)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center' }}
                      title={t('header.increase_votes', 'Aumentar limite de votos')}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
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
                    ? 'var(--color-to-improve-bg)' 
                    : timerIsRunning 
                      ? 'var(--color-primary-subtle)' 
                      : 'var(--bg-subtle)',
                  border: isTimerFinished 
                    ? '1px solid var(--color-to-improve)' 
                    : timerIsRunning 
                      ? '1px solid var(--border-primary)' 
                      : '1px solid var(--border-subtle)',
                  padding: '0.38rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  color: isTimerFinished ? 'var(--color-to-improve)' : 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'nowrap',
                  animation: isTimerFinished ? 'timer-alarm-blink 1s infinite ease-in-out' : 'none',
                }}
                title={isFacilitator ? t('header.timer_title') : t('header.timer_mute_toggle')}
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
                  ...(popoverAlign === 'right' ? { right: 0 } : { left: 0 }),
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  width: 260,
                  maxWidth: 'min(280px, calc(100vw - 2rem))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('header.timer_menu_title')}
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
                      title={soundMuted ? t('header.timer_mute_toggle') : t('header.timer_mute_toggle')}
                    >
                      {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      <span>{soundMuted ? t('header.timer_mute_on') : t('header.timer_mute_off')}</span>
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
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0',
                          color: 'var(--text-main)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
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
                        background: timerIsRunning ? 'var(--color-to-improve-bg)' : 'var(--color-primary)',
                        border: timerIsRunning ? '1px solid var(--color-to-improve)' : 'none',
                        color: timerIsRunning ? 'var(--color-to-improve)' : '#ffffff',
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {timerIsRunning ? <Pause size={14} /> : <Play size={14} />}
                      <span>{timerIsRunning ? t('header.timer_pause') : t('header.timer_start')}</span>
                    </button>

                    <button
                      onClick={() => onControlTimer?.('ADD_SECONDS', 60)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        padding: '0.45rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                      title="Adicionar 1 minuto"
                    >
                      <Plus size={13} />
                      <span>1m</span>
                    </button>

                    <button
                      onClick={() => onControlTimer?.('RESET', 300)}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        padding: '0.45rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all var(--transition-fast)',
                      }}
                      title="Resetar para 5 minutos"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>

                  {/* Teste de Som */}
                  <button
                    onClick={() => soundPlayer.playAlarm(5)}
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
                      transition: 'all var(--transition-fast)',
                    }}
                    title={t('header.timer_test')}
                  >
                    <Bell size={12} />
                    <span>{t('header.timer_test')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botão de Voltar Fase (Apenas Facilitador) */}
            {isFacilitator && prevPhaseObj && onPrevPhase && (
              <button
                onClick={() => onPrevPhase(prevPhaseObj.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.42rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
                title={t('header.btn_prev', { phase: prevPhaseObj.label.split('. ')[1] })}
              >
                <ArrowLeft size={14} />
                <span className="header-btn-text">{t('header.btn_prev', { phase: prevPhaseObj.label.split('. ')[1] })}</span>
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
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span className="header-btn-text">{t('header.btn_next', { phase: nextPhaseObj.label.split('. ')[1] })}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Ferramentas Auxiliares: Convidar, Exportar, Alternar Tema, MCP */}
          <div className="header-tools">
            {/* Botão Compartilhar */}
            <button
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.42rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title={t('header.tooltip_invite')}
            >
              {copied ? <Check size={14} color="var(--color-went-well)" /> : <Share2 size={14} />}
              <span className="header-btn-text">{copied ? t('header.btn_copied') : t('header.btn_invite')}</span>
            </button>

            {/* Exportar Markdown */}
            <button
              onClick={onExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.42rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title={t('header.tooltip_export')}
            >
              <Download size={14} />
              <span className="header-btn-text">{t('header.btn_export')}</span>
            </button>

            {/* Alternador de Modo Claro / Escuro */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.42rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                title={theme === 'dark' ? t('header.tooltip_light') : t('header.tooltip_dark')}
              >
                {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
                <span className="header-btn-text">{theme === 'dark' ? t('header.btn_light') : t('header.btn_dark')}</span>
              </button>
            )}

            {/* Alternador de Idioma */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.42rem 0.55rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                minWidth: '36px'
              }}
              title={t('header.tooltip_lang')}
            >
              {i18n.language.startsWith('pt') ? t('header.lang_en') : t('header.lang_pt')}
            </button>

            {/* Botão de Telemetria MCP */}
            {onToggleTelemetry && (
              <button
                onClick={onToggleTelemetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--color-action-bg)',
                  border: '1px solid var(--color-action-border)',
                  color: 'var(--color-action)',
                  padding: '0.42rem 0.7rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                title="Telemetria e Injeção de IA via MCP"
              >
                <span>MCP</span>
              </button>
            )}

            {/* Divisor vertical */}
            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 0.15rem' }} />


            {/* Link para GitHub do Projeto */}
            <a
              href="https://github.com/Yared98/retroyrd"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '0.42rem 0.55rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
              }}
              className="footer-badge-link"
              title={t('header.tooltip_github')}
              aria-label="GitHub"
            >
              <GithubIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
