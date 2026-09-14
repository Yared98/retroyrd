use crate::models::BoardPhase;

pub struct FsmGuard;

impl FsmGuard {
    pub fn can_transition(current: BoardPhase, target: BoardPhase) -> bool {
        match current.next_phase() {
            Some(next) => next == target,
            None => false,
        }
    }

    pub fn can_submit_safety(phase: BoardPhase) -> bool {
        phase == BoardPhase::SafetyCheck
    }

    pub fn can_create_card(phase: BoardPhase) -> bool {
        phase == BoardPhase::Brainstorm
    }

    pub fn can_edit_card(phase: BoardPhase) -> bool {
        phase == BoardPhase::Brainstorm
    }

    pub fn can_delete_card(phase: BoardPhase) -> bool {
        phase == BoardPhase::Brainstorm
    }

    pub fn can_group_cards(phase: BoardPhase) -> bool {
        phase == BoardPhase::Grouping
    }

    pub fn can_vote(phase: BoardPhase) -> bool {
        phase == BoardPhase::Voting
    }

    pub fn can_manage_actions(phase: BoardPhase) -> bool {
        phase == BoardPhase::ActionItems
    }

    pub fn is_read_only(phase: BoardPhase) -> bool {
        phase == BoardPhase::Archived
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_progression() {
        assert!(FsmGuard::can_transition(BoardPhase::SafetyCheck, BoardPhase::Brainstorm));
        assert!(FsmGuard::can_transition(BoardPhase::Brainstorm, BoardPhase::Grouping));
        assert!(FsmGuard::can_transition(BoardPhase::Grouping, BoardPhase::Voting));
        assert!(FsmGuard::can_transition(BoardPhase::Voting, BoardPhase::ActionItems));
        assert!(FsmGuard::can_transition(BoardPhase::ActionItems, BoardPhase::Archived));
        assert!(!FsmGuard::can_transition(BoardPhase::Archived, BoardPhase::Brainstorm));
        assert!(!FsmGuard::can_transition(BoardPhase::SafetyCheck, BoardPhase::Voting));
    }
}
