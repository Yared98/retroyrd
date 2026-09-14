export type BoardPhase =
  | 'SAFETY_CHECK'
  | 'BRAINSTORM'
  | 'GROUPING'
  | 'VOTING'
  | 'ACTION_ITEMS'
  | 'ARCHIVED';

export interface Board {
  id: string;
  title: string;
  phase: BoardPhase;
  facilitator_token?: string;
  created_at: number;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  color: string;
  order_index: number;
}

export interface Card {
  id: string;
  column_id: string;
  board_id: string;
  content: string;
  author_session_hash: string;
  parent_card_id?: string | null;
  is_masked: boolean;
  is_ai_generated: boolean;
  vote_count: number;
  created_at: number;
}

export interface ActionItem {
  id: string;
  board_id: string;
  description: string;
  owner?: string | null;
  is_ai_generated: boolean;
  status: string;
  created_at: number;
}

export interface SafetyCheckSummary {
  count: number;
  average: number;
  distribution: [number, number, number, number, number];
}

export interface BoardStateSnapshot {
  board: Board;
  columns: Column[];
  cards: Card[];
  action_items: ActionItem[];
  safety_summary?: SafetyCheckSummary | null;
  user_voted_card_ids: string[];
  is_facilitator: boolean;
}

export interface WsMessage {
  type: string;
  payload: any;
  timestamp?: number;
}
