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
        
        // Invalid transitions (backwards, skipping, archived)
        assert!(!FsmGuard::can_transition(BoardPhase::Archived, BoardPhase::Brainstorm));
        assert!(!FsmGuard::can_transition(BoardPhase::SafetyCheck, BoardPhase::Voting));
        assert!(!FsmGuard::can_transition(BoardPhase::Grouping, BoardPhase::Brainstorm));
        assert!(!FsmGuard::can_transition(BoardPhase::Voting, BoardPhase::Grouping));
        assert!(!FsmGuard::can_transition(BoardPhase::Archived, BoardPhase::Archived));
    }

    #[test]
    fn test_phase_mutation_permissions() {
        // SAFETY_CHECK
        assert!(FsmGuard::can_submit_safety(BoardPhase::SafetyCheck));
        assert!(!FsmGuard::can_create_card(BoardPhase::SafetyCheck));
        assert!(!FsmGuard::can_vote(BoardPhase::SafetyCheck));

        // BRAINSTORM
        assert!(!FsmGuard::can_submit_safety(BoardPhase::Brainstorm));
        assert!(FsmGuard::can_create_card(BoardPhase::Brainstorm));
        assert!(FsmGuard::can_edit_card(BoardPhase::Brainstorm));
        assert!(FsmGuard::can_delete_card(BoardPhase::Brainstorm));
        assert!(!FsmGuard::can_group_cards(BoardPhase::Brainstorm));
        assert!(!FsmGuard::can_vote(BoardPhase::Brainstorm));

        // GROUPING
        assert!(!FsmGuard::can_create_card(BoardPhase::Grouping));
        assert!(FsmGuard::can_group_cards(BoardPhase::Grouping));
        assert!(!FsmGuard::can_vote(BoardPhase::Grouping));

        // VOTING
        assert!(!FsmGuard::can_create_card(BoardPhase::Voting));
        assert!(!FsmGuard::can_group_cards(BoardPhase::Voting));
        assert!(FsmGuard::can_vote(BoardPhase::Voting));
        assert!(!FsmGuard::can_manage_actions(BoardPhase::Voting));

        // ACTION_ITEMS
        assert!(!FsmGuard::can_vote(BoardPhase::ActionItems));
        assert!(FsmGuard::can_manage_actions(BoardPhase::ActionItems));
        assert!(!FsmGuard::is_read_only(BoardPhase::ActionItems));

        // ARCHIVED
        assert!(FsmGuard::is_read_only(BoardPhase::Archived));
        assert!(!FsmGuard::can_create_card(BoardPhase::Archived));
        assert!(!FsmGuard::can_vote(BoardPhase::Archived));
        assert!(!FsmGuard::can_manage_actions(BoardPhase::Archived));
    }
}
