import React, { useState } from 'react';
import { ShieldCheck, Check, Crown, ArrowRight, Eye, BarChart2 } from 'lucide-react';
import type { SafetyCheckSummary, BoardPhase } from '../types';

interface SafetyCheckModalProps {
  hasVoted: boolean;
  isFacilitator: boolean;
  safetySummary?: SafetyCheckSummary | null;
  onSubmit: (score: number) => void;
  onNextPhase?: (nextPhase: BoardPhase) => void;
}

const SCORES = [
  { value: 1, title: 'Nada seguro', desc: 'Relutante em expor problemas ou discordâncias' },
  { value: 2, title: 'Cauteloso', desc: 'Apenas feedbacks superficiais e ponderados' },
  { value: 3, title: 'Neutro', desc: 'Falo se me perguntarem diretamente' },
  { value: 4, title: 'Confortável', desc: 'Seguro para críticas construtivas e melhorias' },
  { value: 5, title: 'Totalmente seguro', desc: 'Zero hesitação, transparência e franqueza radical' },
];

export const SafetyCheckModal: React.FC<SafetyCheckModalProps> = ({
  hasVoted,
  isFacilitator,
  safetySummary,
  onSubmit,
  onNextPhase,
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(hasVoted);
  const [activeTab, setActiveTab] = useState<'VOTE' | 'FACILITATOR_RESULTS'>(
    isFacilitator && (safetySummary?.count ?? 0) > 0 ? 'FACILITATOR_RESULTS' : 'VOTE'
  );
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSubmit = () => {
    if (selectedScore !== null) {
      onSubmit(selectedScore);
      setSubmitted(true);
      if (isFacilitator) {
        setActiveTab('FACILITATOR_RESULTS');
      }
    }
  };

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 50,
      }}>
        <button
          onClick={() => setIsMinimized(false)}
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-main)',
            border: '1px solid var(--color-primary)',
            boxShadow: '0 0 20px var(--color-primary-glow)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          <ShieldCheck size={18} color="var(--color-primary)" />
          <span>Abrir Checagem de Segurança</span>
          {isFacilitator && (
            <span style={{
              background: 'var(--color-facilitator-bg)',
              color: 'var(--color-facilitator)',
              border: '1px solid var(--color-facilitator-border)',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              Facilitador
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1.5rem',
    }}>
      <div className="glass-modal" style={{ maxWidth: 680, width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Badge de Facilitador */}
        {isFacilitator && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--color-facilitator-bg)',
            border: '1px solid var(--color-facilitator-border)',
            color: 'var(--color-facilitator)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 800,
            marginBottom: '1rem',
            letterSpacing: '0.02em',
          }}>
            <Crown size={14} color="var(--color-facilitator)" />
            <span>VOCÊ É O FACILITADOR DESTA SESSÃO</span>
          </div>
        )}

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem',
              display: 'flex',
            }}>
              <ShieldCheck size={24} color="var(--color-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fase 1: Checagem de Segurança Psicológica
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Como você se sente para falar abertamente hoje?
              </h2>
            </div>
          </div>

          {/* Minimizar para espiar board */}
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0,
              transition: 'all var(--transition-fast)',
            }}
            title="Minimizar e espiar o board"
          >
            <Eye size={14} />
            <span>Espiar Board</span>
          </button>
        </div>

        {/* Abas para Facilitador (Votar vs Ver Resultados) */}
        {isFacilitator && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--bg-subtle)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
          }}>
            <button
              onClick={() => setActiveTab('VOTE')}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'VOTE' ? 'var(--color-primary-subtle)' : 'transparent',
                color: activeTab === 'VOTE' ? 'var(--color-primary)' : 'var(--text-dim)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              Meu Voto
            </button>
            <button
              onClick={() => setActiveTab('FACILITATOR_RESULTS')}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'FACILITATOR_RESULTS' ? 'var(--color-primary-subtle)' : 'transparent',
                color: activeTab === 'FACILITATOR_RESULTS' ? 'var(--color-primary)' : 'var(--text-dim)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <BarChart2 size={14} />
              <span>Histograma da Equipe ({safetySummary?.count || 0})</span>
            </button>
          </div>
        )}

        {/* VISÃO 1: FORMULÁRIO DE VOTO */}
        {activeTab === 'VOTE' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Como você se sente para se expressar nesta retrospectiva?
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sua resposta é 100% anônima. Nenhuma identificação de usuário ou sessão é vinculada à sua nota.
              </div>
            </div>

            {!submitted ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {SCORES.map((item) => {
                    const isSelected = selectedScore === item.value;
                    return (
                      <div
                        key={item.value}
                        onClick={() => setSelectedScore(item.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: isSelected ? 'var(--color-primary)' : 'var(--bg-subtle-hover)',
                            color: isSelected ? '#ffffff' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}>
                            {item.value}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={16} color="var(--color-primary)" />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    disabled={selectedScore === null}
                    onClick={handleSubmit}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedScore !== null ? 'var(--color-primary)' : 'var(--bg-subtle)',
                      border: 'none',
                      color: selectedScore !== null ? '#ffffff' : 'var(--text-dim)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: selectedScore !== null ? 'pointer' : 'not-allowed',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    Enviar Minha Avaliação
                  </button>

                  {/* Se for Facilitador, pode pular o voto e avançar direto */}
                  {isFacilitator && onNextPhase && (
                    <button
                      onClick={() => onNextPhase('BRAINSTORM')}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-went-well-bg)',
                        border: '1px solid var(--color-went-well-border)',
                        color: 'var(--color-went-well)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>Avançar Fase →</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '0.65rem',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  marginBottom: '0.75rem',
                }}>
                  <Check size={28} color="var(--color-went-well)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Avaliação Registrada!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  {isFacilitator
                    ? 'Como facilitador, você pode monitorar a distribuição abaixo e avançar para o Brainstorm.'
                    : 'Aguarde o facilitador avançar a sessão para a fase de Brainstorming.'}
                </p>

                {isFacilitator && onNextPhase && (
                  <button
                    onClick={() => onNextPhase('BRAINSTORM')}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-went-well)',
                      border: 'none',
                      color: '#002113',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span>Iniciar Fase 2: Brainstorming (Modo Cego)</span>
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VISÃO 2: RESULTADOS AGREGADOS (PAINEL DO FACILITADOR) */}
        {activeTab === 'FACILITATOR_RESULTS' && isFacilitator && (
          <div>
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Sentimento da Equipe
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-went-well)', marginTop: '0.2rem' }}>
                    {safetySummary && safetySummary.count > 0 ? `${safetySummary.average.toFixed(1)} / 5.0` : 'Sem votos'}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-subtle)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}>
                  {safetySummary?.count || 0} avaliações recebidas
                </div>
              </div>

              {/* Barras de Distribuição */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[5, 4, 3, 2, 1].map((scoreNum) => {
                  const count = safetySummary?.distribution[scoreNum - 1] || 0;
                  const total = safetySummary?.count || 0;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={scoreNum} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <span style={{ width: 50, color: 'var(--text-muted)' }}>Nota {scoreNum}:</span>
                      <div style={{ flex: 1, height: 10, background: 'var(--border-subtle)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: scoreNum >= 4 ? 'var(--color-went-well)' : scoreNum === 3 ? 'var(--color-primary)' : 'var(--color-to-improve)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{ width: 40, textAlign: 'right', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {count} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ação do Facilitador: Avançar Fase */}
            {onNextPhase && (
              <button
                onClick={() => onNextPhase('BRAINSTORM')}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-went-well)',
                  border: 'none',
                  color: '#002113',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Encerrar Checagem e Iniciar Brainstorming (Modo Cego)</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
