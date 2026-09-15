export interface SafetyAssessment {
  status: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  emoji: string;
}

export function getSafetyAssessment(avg: number): SafetyAssessment {
  if (avg >= 4.2) {
    return {
      status: 'Excelente',
      color: 'var(--color-went-well)',
      bg: 'var(--color-went-well-bg)',
      border: 'var(--color-went-well-border)',
      desc: 'Clima ideal: transparência, segurança psicológica e franqueza radical.',
      emoji: '🚀',
    };
  }
  if (avg >= 3.5) {
    return {
      status: 'Bom / Confortável',
      color: 'var(--color-went-well)',
      bg: 'var(--color-went-well-bg)',
      border: 'var(--color-went-well-border)',
      desc: 'Equipe confortável para críticas construtivas e sugestões de melhoria.',
      emoji: '✨',
    };
  }
  if (avg >= 2.8) {
    return {
      status: 'Neutro / Moderado',
      color: 'var(--color-facilitator)',
      bg: 'var(--color-facilitator-bg)',
      border: 'var(--color-facilitator-border)',
      desc: 'Atenção: feedbacks ponderados. Facilitador deve acolher sem julgamentos.',
      emoji: '⚠️',
    };
  }
  return {
    status: 'Reticente / Alerta',
    color: 'var(--color-to-improve)',
    bg: 'var(--color-to-improve-bg)',
    border: 'var(--color-to-improve-border)',
    desc: 'Hesitação detectada. Reforce o anonimato e a segurança do ambiente.',
    emoji: '🚨',
  };
}
