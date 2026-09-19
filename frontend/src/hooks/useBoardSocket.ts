import { useEffect, useRef, useState, useCallback } from 'react';
import type { BoardPhase, BoardStateSnapshot, WsMessage } from '../types';

export function useBoardSocket(boardId: string | null, facilitatorToken: string | null) {
  const [snapshot, setSnapshot] = useState<BoardStateSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Armazena session_id efêmero único por navegador
  const getSessionId = () => {
    let sid = sessionStorage.getItem(`retro_session_${boardId}`);
    if (!sid) {
      // crypto.randomUUID() para entropia criptográfica adequada
      sid = crypto.randomUUID().replace(/-/g, '');
      sessionStorage.setItem(`retro_session_${boardId}`, sid);
    }
    return sid;
  };

  useEffect(() => {
    if (!boardId) return;

    let isMounted = true;
    let reconnectTimeout: number;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? `${window.location.hostname}:8080` : window.location.host;
      const sid = getSessionId();

      let url = `${protocol}//${host}/ws/board/${boardId}?session_id=${sid}`;
      if (facilitatorToken) {
        url += `&token=${encodeURIComponent(facilitatorToken)}`;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          if (msg.type === 'SYNC_STATE') {
            setSnapshot(msg.payload);
          } else if (msg.type === 'ROOM_STATE_UPDATED') {
            setSnapshot((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                board: msg.payload.board || prev.board,
                columns: msg.payload.columns || prev.columns,
                cards: msg.payload.cards || prev.cards,
                action_items: msg.payload.action_items || prev.action_items,
                safety_summary: msg.payload.safety_summary !== undefined ? msg.payload.safety_summary : prev.safety_summary,
                session_hash: msg.payload.session_hash || prev.session_hash,
              };
            });
          } else if (msg.type === 'VOTES_CLEARED') {
            setSnapshot((prev) => {
              if (!prev) return null;
              return { ...prev, user_voted_card_ids: [] };
            });
          }
        } catch (err) {
          console.error('Erro ao processar mensagem do WebSocket:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Reconexão automática em 2s
        reconnectTimeout = window.setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('Erro no WebSocket:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [boardId, facilitatorToken]);

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  const submitSafety = useCallback((score: number) => {
    send('SAFETY_SUBMIT', { score });
  }, [send]);

  const createCard = useCallback((columnId: string, content: string) => {
    send('CARD_CREATE', { column_id: columnId, content });
  }, [send]);

  const updateCard = useCallback((cardId: string, content: string) => {
    send('CARD_UPDATE', { card_id: cardId, content });
  }, [send]);

  const deleteCard = useCallback((cardId: string) => {
    send('CARD_DELETE', { card_id: cardId });
  }, [send]);

  const toggleVote = useCallback((cardId: string) => {
    send('VOTE_TOGGLE', { card_id: cardId });
    setSnapshot((prev) => {
      if (!prev) return prev;
      const alreadyVoted = prev.user_voted_card_ids.includes(cardId);
      const user_voted_card_ids = alreadyVoted
        ? prev.user_voted_card_ids.filter((id) => id !== cardId)
        : [...prev.user_voted_card_ids, cardId];
      return { ...prev, user_voted_card_ids };
    });
  }, [send]);

  const groupCards = useCallback((parentCardId: string, childCardIds: string[]) => {
    send('CARD_GROUP', { parent_card_id: parentCardId, child_card_ids: childCardIds });
  }, [send]);

  const ungroupCard = useCallback((cardId: string) => {
    send('CARD_UNGROUP', { card_id: cardId });
  }, [send]);

  const moveCard = useCallback((cardId: string, targetColumnId: string) => {
    send('CARD_MOVE', { card_id: cardId, target_column_id: targetColumnId });
  }, [send]);

  const toggleReaction = useCallback((cardId: string, emoji: string) => {
    send('CARD_REACT', { card_id: cardId, emoji });
  }, [send]);

  const createAction = useCallback((description: string, owner?: string) => {
    send('ACTION_CREATE', { description, owner });
  }, [send]);

  const updateActionStatus = useCallback((id: string, status: string) => {
    send('ACTION_UPDATE', { id, status });
  }, [send]);

  const changePhase = useCallback((targetPhase: BoardPhase) => {
    send('PHASE_CHANGE', { target_phase: targetPhase });
  }, [send]);

  const controlTimer = useCallback((action: 'START' | 'PAUSE' | 'ADD_SECONDS' | 'RESET', seconds?: number) => {
    send('TIMER_CONTROL', { action, seconds });
  }, [send]);

  const updateVoteLimit = useCallback((limit: number) => {
    send('UPDATE_VOTE_LIMIT', { limit });
  }, [send]);

  return {
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
    updateVoteLimit,
  };
}
