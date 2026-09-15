import { useState, useEffect, useMemo } from 'react';
import { useBoardSocket } from './hooks/useBoardSocket';
import { Header } from './components/Header';
import { BoardColumn } from './components/BoardColumn';
import { SafetyCheckModal } from './components/SafetyCheckModal';
import { ActionItemsView } from './components/ActionItemsView';
import { McpTelemetryDrawer } from './components/McpTelemetryDrawer';
import { CreateBoardModal } from './components/CreateBoardModal';
import { Footer } from './components/Footer';
import { saveRecentSession } from './utils/recentSessions';
import { getSafetyAssessment } from './utils/safety';
import { Search, User, Sparkles, Star, X, ShieldCheck } from 'lucide-react';
import type { BoardPhase } from './types';

export function App() {
  // Parsing de URL para identificar boardId e facilitator_token
  const [boardId, setBoardId] = useState<string | null>(() => {
    const pathMatch = window.location.pathname.match(/\/board\/([A-Za-z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('board');
  });

  const [facilitatorToken, setFacilitatorToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) return token;
    return sessionStorage.getItem(`facilitator_token_${boardId}`) || null;
  });

  const [isCreating, setIsCreating] = useState(false);
  const [showMcpDrawer, setShowMcpDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MINE' | 'AI' | 'VOTED'>('ALL');
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [hasVotedSafety, setHasVotedSafety] = useState(() => {
    return boardId ? sessionStorage.getItem(`safety_voted_${boardId}`) === 'true' : false;
  });

  // Tema: Claro vs Escuro (persistido em localStorage com fallback para o sistema)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('retroyrd_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('retroyrd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const {
    snapshot,
    isConnected,
    submitSafety,
    createCard,
    updateCard,
    deleteCard,
    toggleVote,
    groupCards,
    ungroupCard,
    moveCard,
    toggleReaction,
    createAction,
    updateActionStatus,
    changePhase,
    controlTimer,
  } = useBoardSocket(boardId, facilitatorToken);

  // Salvar token do facilitador se recebido via query param
  useEffect(() => {
    if (boardId && facilitatorToken) {
      sessionStorage.setItem(`facilitator_token_${boardId}`, facilitatorToken);
    }
  }, [boardId, facilitatorToken]);

  // Atualizar title da aba do navegador para Retroyrd
  useEffect(() => {
    if (snapshot?.board?.title) {
      document.title = `${snapshot.board.title} — Retroyrd`;
    } else {
      document.title = 'Retroyrd — Retrospectivas Ágeis em Tempo Real';
    }
  }, [snapshot?.board?.title]);

  // Criação de novo board via HTTP POST /api/boards
  const handleCreateBoard = async (title: string, maxVotesPerUser: number = 5) => {
    setIsCreating(true);
    try {
      const apiHost = window.location.port === '5173' ? 'http://localhost:8080' : '';
      const res = await fetch(`${apiHost}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, max_votes_per_user: maxVotesPerUser }),
      });
      const data = await res.json();
      if (data.id) {
        saveRecentSession({
          id: data.id,
          title,
          facilitatorToken: data.facilitator_token,
        });
        setBoardId(data.id);
        setFacilitatorToken(data.facilitator_token);
        sessionStorage.setItem(`facilitator_token_${data.id}`, data.facilitator_token);
        window.history.pushState({}, '', `/board/${data.id}?token=${data.facilitator_token}`);
      }
    } catch (err) {
      console.error('Falha ao criar board:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Salvar automaticamente sessões abertas pelo facilitador no histórico local
  useEffect(() => {
    if (snapshot?.board && snapshot.is_facilitator && facilitatorToken) {
      saveRecentSession({
        id: snapshot.board.id,
        title: snapshot.board.title,
        facilitatorToken,
      });
    }
  }, [snapshot?.board?.id, snapshot?.board?.title, snapshot?.is_facilitator, facilitatorToken]);

  // Exportar resumo em Markdown garantindo download de arquivo com extensão .md
  const handleExport = async () => {
    if (!boardId) return;
    const apiHost = window.location.port === '5173' ? 'http://localhost:8080' : '';
    try {
      const res = await fetch(`${apiHost}/api/boards/${boardId}/export`);
      if (!res.ok) throw new Error('Falha ao baixar exportação');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = (snapshot?.board.title || 'retrospectiva')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '');
      link.download = `${cleanTitle || 'retro'}-${boardId.substring(0, 8)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error('Erro ao exportar markdown:', err);
      // Fallback direto
      window.location.href = `${apiHost}/api/boards/${boardId}/export`;
    }
  };

  // Sanitizar colunas para garantir que nenhuma coluna antiga se chame "Action Items"
  const sanitizedColumns = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.columns.map((col) => {
      if (col.title.trim().toLowerCase() === 'action items') {
        return { ...col, title: 'Ideas & Kudos', color: '#06B6D4' };
      }
      return col;
    });
  }, [snapshot]);

  // Controle de exibição do board completo durante a fase de Action Items
  const [showBoardReview, setShowBoardReview] = useState(false);

  // Filtragem de cards por busca e chips de filtro
  const filteredCards = useMemo(() => {
    if (!snapshot) return [];
    let list = snapshot.cards;

    if (filterType === 'MINE') {
      const myCardIds = new Set(
        list.filter((c) => c.author_session_hash === snapshot.session_hash).map((c) => c.id)
      );
      list = list.filter((c) => myCardIds.has(c.id) || (c.parent_card_id && myCardIds.has(c.parent_card_id)));
    } else if (filterType === 'AI') {
      const aiCardIds = new Set(list.filter((c) => c.is_ai_generated).map((c) => c.id));
      list = list.filter((c) => aiCardIds.has(c.id) || (c.parent_card_id && aiCardIds.has(c.parent_card_id)));
    } else if (filterType === 'VOTED') {
      list = list.filter(
        (c) =>
          c.vote_count > 0 ||
          (c.parent_card_id &&
            (snapshot.cards.find((p) => p.id === c.parent_card_id)?.vote_count || 0) > 0)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchedIds = new Set(
        list.filter((c) => !c.is_masked && c.content.toLowerCase().includes(q)).map((c) => c.id)
      );
      list = list.filter((c) => {
        if (matchedIds.has(c.id)) return true;
        if (c.parent_card_id && matchedIds.has(c.parent_card_id)) return true;
        return snapshot.cards.some((ch) => ch.parent_card_id === c.id && matchedIds.has(ch.id));
      });
    }

    return list;
  }, [snapshot, filterType, searchQuery]);

  // Separação de cards por coluna usando os cards filtrados
  const cardsByColumn = useMemo(() => {
    if (!snapshot) return {};
    const map: Record<string, typeof snapshot.cards> = {};
    for (const col of sanitizedColumns) {
      map[col.id] = filteredCards.filter((c) => c.column_id === col.id);
    }
    return map;
  }, [sanitizedColumns, filteredCards]);

  // Se não temos boardId na URL, exibir tela de criação
  if (!boardId) {
    return (
      <CreateBoardModal
        onCreate={handleCreateBoard}
        isCreating={isCreating}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Carregamento inicial do WebSocket
  if (!snapshot) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: 'var(--bg-canvas)',
      }}>
        <div className="pulse-dot" style={{ width: 14, height: 14 }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          {isConnected ? 'Sincronizando estado do board...' : 'Conectando ao servidor...'}
        </div>
      </div>
    );
  }

  const { board, action_items, safety_summary, user_voted_card_ids, is_facilitator } = snapshot;
  const isActionItemsPhase = board.phase === 'ACTION_ITEMS' || board.phase === 'ARCHIVED';
  const isVoteLimitReached = board.max_votes_per_user > 0 && user_voted_card_ids.length >= board.max_votes_per_user;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Header com Stepper e Controles */}
      <Header
        title={board.title}
        phase={board.phase}
        isFacilitator={is_facilitator}
        timerSecondsRemaining={board.timer_seconds_remaining}
        timerIsRunning={board.timer_is_running}
        timerEndsAt={board.timer_ends_at}
        maxVotesPerUser={board.max_votes_per_user}
        userVotedCount={user_voted_card_ids.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onControlTimer={controlTimer}
        onNextPhase={(nextPhase: BoardPhase) => changePhase(nextPhase)}
        onPrevPhase={(prevPhase: BoardPhase) => changePhase(prevPhase)}
        onExport={handleExport}
        onToggleTelemetry={() => setShowMcpDrawer(!showMcpDrawer)}
        onHome={() => {
          window.location.href = '/';
        }}
      />

      {/* Banner de Visão Geral do Clima da Equipe (Safety Check) */}
      {board.phase !== 'SAFETY_CHECK' && safety_summary && safety_summary.count > 0 && showSafetyBanner && (() => {
        const assessment = getSafetyAssessment(safety_summary.average);
        return (
          <div style={{
            background: assessment.bg,
            borderBottom: `1px solid ${assessment.border}`,
            padding: '0.45rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-main)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: assessment.color,
                fontWeight: 800,
                fontSize: '0.82rem',
              }}>
                <ShieldCheck size={15} />
                <span>Clima da Equipe (Safety Check): {safety_summary.average.toFixed(1)} / 5.0</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>•</span>
              <span style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}>
                {safety_summary.count} {safety_summary.count === 1 ? 'membro avaliou' : 'membros avaliaram'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>•</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {assessment.desc}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Mini-pills de distribuição rápida */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((score) => {
                  const votes = safety_summary.distribution[score - 1] || 0;
                  return (
                    <span
                      key={score}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: 'var(--radius-xs)',
                        background: votes > 0 ? 'var(--bg-surface)' : 'transparent',
                        border: votes > 0 ? '1px solid var(--border-subtle)' : 'none',
                        color: votes > 0 ? 'var(--text-main)' : 'var(--text-dim)',
                        fontWeight: votes > 0 ? 700 : 400,
                      }}
                      title={`${votes} voto(s) com nota ${score}`}
                    >
                      {score}★: {votes}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowSafetyBanner(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.15rem',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Ocultar barra de segurança (o indicador continuará na barra superior)"
                aria-label="Ocultar resumo"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Fase 1: Modal de Safety Check (se a fase atual for SAFETY_CHECK) */}
      {board.phase === 'SAFETY_CHECK' && (
        <SafetyCheckModal
          hasVoted={hasVotedSafety}
          isFacilitator={is_facilitator}
          safetySummary={safety_summary}
          onSubmit={(score) => {
            submitSafety(score);
            setHasVotedSafety(true);
            if (boardId) sessionStorage.setItem(`safety_voted_${boardId}`, 'true');
          }}
          onNextPhase={(nextPhase: BoardPhase) => changePhase(nextPhase)}
        />
      )}

      {/* Workspace Principal */}
      <main style={{
        flex: 1,
        padding: '1.5rem',
        maxWidth: 1600,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Barra de Busca e Filtros Rápidos (exibida em todas as fases pós-Safety Check) */}
        {board.phase !== 'SAFETY_CHECK' && (
          <div className="board-toolbar">
            <div className="board-search-input-wrapper">
              <Search size={15} color="var(--text-dim)" />
              <input
                type="text"
                className="board-search-input"
                placeholder="Buscar cards por conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 0,
                  }}
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`board-filter-chip ${filterType === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                <span>Todos</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({snapshot.cards.length})</span>
              </button>

              <button
                type="button"
                className={`board-filter-chip ${filterType === 'MINE' ? 'is-active' : ''}`}
                onClick={() => setFilterType(filterType === 'MINE' ? 'ALL' : 'MINE')}
                title="Mostrar apenas cards criados por você"
              >
                <User size={13} />
                <span>Meus Cards</span>
              </button>

              <button
                type="button"
                className={`board-filter-chip ${filterType === 'AI' ? 'is-active' : ''}`}
                onClick={() => setFilterType(filterType === 'AI' ? 'ALL' : 'AI')}
                title="Mostrar apenas cards sugeridos via MCP / IA"
              >
                <Sparkles size={13} />
                <span>Gerados por IA</span>
              </button>

              <button
                type="button"
                className={`board-filter-chip ${filterType === 'VOTED' ? 'is-active' : ''}`}
                onClick={() => setFilterType(filterType === 'VOTED' ? 'ALL' : 'VOTED')}
                title="Mostrar apenas cards que receberam votos"
              >
                <Star size={13} />
                <span>Com Votos</span>
              </button>

              {!showSafetyBanner && safety_summary && safety_summary.count > 0 && (
                <button
                  type="button"
                  className="board-filter-chip"
                  onClick={() => setShowSafetyBanner(true)}
                  title="Reexibir barra de clima da equipe (Safety Check)"
                >
                  <ShieldCheck size={13} color="var(--color-went-well)" />
                  <span>Ver Clima ({safety_summary.average.toFixed(1)}★)</span>
                </button>
              )}

              {(searchQuery !== '' || filterType !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('ALL');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0.2rem 0.4rem',
                    textDecoration: 'underline',
                  }}
                >
                  Limpar ({filteredCards.length}/{snapshot.cards.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner Explicativo da Fase de Grouping */}
        {board.phase === 'GROUPING' && (
          <div style={{
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🗂️</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Fase 3: Agrupamento de Ideias Similares (Grouping)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Todos os cards foram revelados! <strong>Arraste um card e solte sobre outro da mesma coluna</strong> para agrupá-los em um cluster e evitar votos dispersos. Você também pode arrastar um card para outra coluna para movê-lo.
                </div>
              </div>
            </div>

            {is_facilitator && (
              <button
                onClick={() => changePhase('VOTING')}
                style={{
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Concluir Agrupamento e Ir para Votação →
              </button>
            )}
          </div>
        )}

        {/* Fase 5: Visualização Integrada de Tópicos Priorizados e Action Items */}
        {isActionItemsPhase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <ActionItemsView
              items={action_items}
              cards={snapshot.cards}
              columns={sanitizedColumns}
              canManage={board.phase === 'ACTION_ITEMS'}
              onAddAction={createAction}
              onToggleStatus={updateActionStatus}
            />

            {/* Alternador para revisar colunas em modo somente leitura */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
              <button
                onClick={() => setShowBoardReview(!showBoardReview)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.45rem 1.1rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{showBoardReview ? '▲ Ocultar Colunas da Retrospectiva' : '▼ Visualizar Todas as Colunas (Somente Leitura)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Grade de Colunas de Brainstorming e Votação (exibida sempre nas Fases 2, 3, 4 ou sob demanda na Fase 5) */}
        {(!isActionItemsPhase || showBoardReview) && (
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            alignItems: 'flex-start',
          }}>
            {sanitizedColumns.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                cards={cardsByColumn[col.id] || []}
                allCards={snapshot.cards}
                phase={board.phase}
                userVotedCardIds={user_voted_card_ids}
                sessionHash={snapshot.session_hash}
                isVoteLimitReached={isVoteLimitReached}
                onAddCard={createCard}
                onVoteCard={toggleVote}
                onUpdateCard={updateCard}
                onDeleteCard={deleteCard}
                onGroupCards={groupCards}
                onUngroupCard={ungroupCard}
                onMoveCard={moveCard}
                onToggleReaction={toggleReaction}
              />
            ))}
          </div>
        )}
      </main>

      {/* Rodapé com créditos e links */}
      <Footer />

      {/* Gaveta de Telemetria MCP */}
      <McpTelemetryDrawer
        isOpen={showMcpDrawer}
        snapshot={snapshot}
        facilitatorToken={facilitatorToken}
        onClose={() => setShowMcpDrawer(false)}
      />
    </div>
  );
}

export default App;
