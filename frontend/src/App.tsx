import { useState, useEffect, useMemo } from 'react';
import { useBoardSocket } from './hooks/useBoardSocket';
import { Header } from './components/Header';
import { BoardColumn } from './components/BoardColumn';
import { SafetyCheckModal } from './components/SafetyCheckModal';
import { ActionItemsView } from './components/ActionItemsView';
import { McpTelemetryDrawer } from './components/McpTelemetryDrawer';
import { CreateBoardModal } from './components/CreateBoardModal';
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

  // Separação de cards por coluna
  const cardsByColumn = useMemo(() => {
    if (!snapshot) return {};
    const map: Record<string, typeof snapshot.cards> = {};
    for (const col of sanitizedColumns) {
      map[col.id] = snapshot.cards.filter((c) => c.column_id === col.id);
    }
    return map;
  }, [snapshot, sanitizedColumns]);

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
        onExport={handleExport}
        onToggleTelemetry={() => setShowMcpDrawer(!showMcpDrawer)}
      />

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
        gap: '2rem',
      }}>
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
                  Todos os cards foram revelados! <strong>Arraste um card e solte sobre outro</strong> para agrupá-los em um cluster e evitar votos dispersos.
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
              />
            ))}
          </div>
        )}
      </main>

      {/* Gaveta de Telemetria MCP */}
      <McpTelemetryDrawer
        isOpen={showMcpDrawer}
        snapshot={snapshot}
        onClose={() => setShowMcpDrawer(false)}
      />
    </div>
  );
}

export default App;
