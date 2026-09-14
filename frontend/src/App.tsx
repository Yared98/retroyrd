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
  } = useBoardSocket(boardId, facilitatorToken);

  // Salvar token do facilitador se recebido via query param
  useEffect(() => {
    if (boardId && facilitatorToken) {
      sessionStorage.setItem(`facilitator_token_${boardId}`, facilitatorToken);
    }
  }, [boardId, facilitatorToken]);

  // Criação de novo board via HTTP POST /api/boards
  const handleCreateBoard = async (title: string) => {
    setIsCreating(true);
    try {
      const apiHost = window.location.port === '5173' ? 'http://localhost:8080' : '';
      const res = await fetch(`${apiHost}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
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

  // Exportar resumo em Markdown
  const handleExport = () => {
    if (!boardId) return;
    const apiHost = window.location.port === '5173' ? 'http://localhost:8080' : '';
    window.open(`${apiHost}/api/boards/${boardId}/export`, '_blank');
  };

  // Separação de cards por coluna
  const cardsByColumn = useMemo(() => {
    if (!snapshot) return {};
    const map: Record<string, typeof snapshot.cards> = {};
    for (const col of snapshot.columns) {
      map[col.id] = snapshot.cards.filter((c) => c.column_id === col.id);
    }
    return map;
  }, [snapshot]);

  // Se não temos boardId na URL, exibir tela de criação
  if (!boardId) {
    return <CreateBoardModal onCreate={handleCreateBoard} isCreating={isCreating} />;
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

  const { board, columns, action_items, safety_summary, user_voted_card_ids, is_facilitator } = snapshot;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Header com Stepper e Controles */}
      <Header
        title={board.title}
        phase={board.phase}
        isFacilitator={is_facilitator}
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
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
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
                  boxShadow: '0 0 12px var(--color-primary-glow)',
                }}
              >
                Concluir Agrupamento e Ir para Votação →
              </button>
            )}
          </div>
        )}

        {/* Visualização de Action Items destacada quando na fase ACTION_ITEMS ou ARCHIVED */}
        {(board.phase === 'ACTION_ITEMS' || board.phase === 'ARCHIVED') && (
          <ActionItemsView
            items={action_items}
            canManage={board.phase === 'ACTION_ITEMS'}
            onAddAction={createAction}
            onToggleStatus={updateActionStatus}
          />
        )}

        {/* Grade de Colunas de Brainstorming e Votação */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          alignItems: 'flex-start',
        }}>
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] || []}
              phase={board.phase}
              userVotedCardIds={user_voted_card_ids}
              onAddCard={createCard}
              onVoteCard={toggleVote}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              onGroupCards={groupCards}
              onUngroupCard={ungroupCard}
            />
          ))}
        </div>
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
