import React, { useState } from 'react';
import { Shield, ShieldCheck, EyeOff, Bot, ArrowRight, Sun, Moon, History, Trash2, ExternalLink, Share2, Check, AlertTriangle, Globe } from 'lucide-react';
import { getRecentSessions, removeRecentSession, type RecentSession } from '../utils/recentSessions';
import { Footer, GithubIcon } from './Footer';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpTelemetryDrawer } from './McpTelemetryDrawer';
import { useTranslation } from 'react-i18next';

interface CreateBoardModalProps {
  onCreate: (title: string, maxVotesPerUser: number) => Promise<void>;
  isCreating: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  onCreate,
  isCreating,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [title, setTitle] = useState('');
  const [maxVotes, setMaxVotes] = useState(5);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>(() => getRecentSessions());
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<RecentSession | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim(), maxVotes);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const cleanCode = joinCode.trim();
    const cleanToken = joinToken.trim();
    const targetUrl = cleanToken 
      ? `/board/${cleanCode}?token=${encodeURIComponent(cleanToken)}`
      : `/board/${cleanCode}`;
    window.location.href = targetUrl;
  };

  const handleCopyInvite = (sessionId: string) => {
    const url = `${window.location.origin}/board/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleRemoveSession = (sessionId: string) => {
    const updated = removeRecentSession(sessionId);
    setRecentSessions(updated);
  };

  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('en') ? 'pt' : 'en';
    i18n.changeLanguage(next);
  };

  const facilitatorSessions = recentSessions.filter(s => s.role === 'facilitator' || s.facilitatorToken);
  const participantSessions = recentSessions.filter(s => s.role === 'participant' && !s.facilitatorToken).slice(0, 3);

  const voteOptions = [
    { label: t('create_board.votes_3'), value: 3 },
    { label: t('create_board.votes_5'), value: 5 },
    { label: t('create_board.votes_8'), value: 8 },
    { label: t('create_board.votes_unlimited'), value: 0 },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      position: 'relative',
      transition: 'background var(--transition-smooth)',
    }}>
      {/* Top Menu Bar Padronizado */}
      <header className="app-header">
        <div className="header-left">
          <a href="/" className="brand-logo" title="RetroYrd - Início" aria-label="RetroYrd Home">
            <div className="brand-icon-box">
              <ShieldCheck size={18} />
            </div>
            <span className="brand-title">
              Retro<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
            </span>
          </a>
          <EcosystemSwitcher currentApp="retro" />
        </div>

        <div className="header-right">
          {/* Botão MCP Padronizado */}
          <button
            onClick={() => setShowMcpModal(true)}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
              border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast, 0.15s ease)',
            }}
            title={t('mcp_drawer.connect_ai', 'Configuração do Servidor MCP (AI)')}
          >
            <Bot size={13} />
            <span>MCP</span>
          </button>

          {/* Alternador de Idioma */}
          <button
            onClick={toggleLanguage}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
            title={t('app.languageToggle', 'Alternar idioma')}
          >
            <Globe size={13} />
            <span>{i18n.language.startsWith('en') ? 'EN' : 'PT'}</span>
          </button>

          {/* Alternador de Tema */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
              title={theme === 'dark' ? t('create_board.switch_light') : t('create_board.switch_dark')}
            >
              {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
            </button>
          )}

          {/* Link GitHub */}
          <a
            href="https://github.com/Yared98/retroyrd"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.35rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'var(--text-main)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
            title={t('footer.github_title', 'Ver código-fonte do RetroYrd no GitHub')}
            aria-label="GitHub"
          >
            <GithubIcon size={14} />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        width: '100%',
      }}>
        {/* Hero Header Outside Card */}
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <ShieldCheck size={14} color="var(--color-primary)" />
            <span>RetroYrd</span>
          </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          {t('create_board.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
          {t('create_board.subtitle')}
        </p>
      </div>

      {/* Glass Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Navigation Tabs (Segmented Control) */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'create' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
              color: activeTab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'create' ? '1px solid var(--border-highlight)' : '1px solid transparent',
              boxShadow: activeTab === 'create' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t('create_board.tab_create')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'join' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
              color: activeTab === 'join' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'join' ? '1px solid var(--border-highlight)' : '1px solid transparent',
              boxShadow: activeTab === 'join' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t('create_board.tab_join')}
          </button>
        </div>

        {activeTab === 'create' ? (
          <>
            {/* Features em destaque */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Shield size={16} color="var(--color-went-well)" />
                <span><strong>{t('create_board.feature_safety_title')}</strong> {t('create_board.feature_safety_desc')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <EyeOff size={16} color="var(--color-to-improve)" />
                <span><strong>{t('create_board.feature_blind_title')}</strong> {t('create_board.feature_blind_desc')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Bot size={16} color="var(--color-action)" />
                <span><strong>{t('create_board.feature_mcp_title')}</strong> {t('create_board.feature_mcp_desc')}</span>
              </div>
            </div>

            {/* Formulário de Criação */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('create_board.session_name_label')}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('create_board.session_name_placeholder')}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
              </div>

              {/* Seletor de Votos por Participante */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t('create_board.vote_limit_label')}
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                    {maxVotes === 0 ? t('create_board.no_limit') : `${maxVotes} ${t('create_board.votes_per_person')}`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {voteOptions.map((opt) => {
                    const isSelected = maxVotes === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMaxVotes(opt.value)}
                        style={{
                          background: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                          border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem 0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 10px var(--color-primary-glow)' : 'none',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isCreating || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: isCreating || !title.trim() ? 0.6 : 1,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                  marginTop: '0.5rem',
                }}
              >
                <span>{isCreating ? t('create_board.starting_session') : t('create_board.start_retro')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        ) : (
          /* Formulário de Entrada */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('create_board.join_code_label')}
              </label>
              <input
                type="text"
                autoFocus
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('create_board.join_code_placeholder')}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('create_board.join_token_label')}
              </label>
              <input
                type="text"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                placeholder={t('create_board.join_token_placeholder')}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!joinCode.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'var(--color-primary)',
                border: 'none',
                color: '#ffffff',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: !joinCode.trim() ? 'not-allowed' : 'pointer',
                opacity: !joinCode.trim() ? 0.6 : 1,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
                marginTop: '0.5rem',
              }}
            >
              <span>{t('create_board.join_btn')}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Histórico de Sessões Recentes (Facilitador) */}
        {facilitatorSessions.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--color-primary)" />
                <span>{t('create_board.prev_sessions')}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'var(--bg-subtle)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                {facilitatorSessions.length} {facilitatorSessions.length === 1 ? t('create_board.session_singular') : t('create_board.session_plural')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {facilitatorSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {new Date(session.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(session.id)}
                      title={t('create_board.copy_invite')}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedSessionId === session.id ? <Check size={12} color="var(--color-went-well)" /> : <Share2 size={12} />}
                      <span>{copiedSessionId === session.id ? t('create_board.copied') : t('create_board.invite')}</span>
                    </button>

                    <a
                      href={`/board/${session.id}?token=${session.facilitatorToken}`}
                      style={{
                        background: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all var(--transition-fast)',
                      }}
                      title={t('create_board.open_facilitator')}
                    >
                      <span>{t('create_board.access')}</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setSessionToDelete(session)}
                      title={t('create_board.remove_history_tooltip')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-to-improve)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Sessões Recentes (Participante) */}
        {participantSessions.length > 0 && (
          <div style={{ marginTop: facilitatorSessions.length > 0 ? '1.5rem' : '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--text-dim)" />
                <span>{t('create_board.prev_sessions_participant', 'Sessões que Participei')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {participantSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {new Date(session.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <a
                      href={`/board/${session.id}`}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>{t('create_board.enter')}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com créditos */}
      <Footer style={{ borderTop: 'none', marginTop: '2.5rem', width: '100%', maxWidth: '480px' }} />

      {/* Modal de Confirmação de Exclusão de Sessão */}
      {sessionToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="glass-modal" style={{
            maxWidth: 440,
            width: '100%',
            padding: '1.75rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                background: 'var(--color-to-improve-bg)',
                border: '1px solid var(--color-to-improve-border)',
                color: 'var(--color-to-improve)',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {t('create_board.remove_history_title')}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0', lineHeight: 1.45 }}>
                  {t('create_board.remove_history_confirm1')} <strong style={{ color: 'var(--text-main)' }}>"{sessionToDelete.title}"</strong> {t('create_board.remove_history_confirm2')}
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
            }}>
              {t('create_board.remove_history_warning')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t('create_board.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                style={{
                  background: 'var(--color-to-improve)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Trash2 size={14} />
                <span>{t('create_board.yes_remove')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Gaveta de Telemetria MCP */}
      <McpTelemetryDrawer
        isOpen={showMcpModal}
        onClose={() => setShowMcpModal(false)}
      />
    </div>
  );
};
