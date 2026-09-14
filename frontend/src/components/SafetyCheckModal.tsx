import React, { useState } from 'react';
import { ShieldCheck, Lock, Check } from 'lucide-react';
import type { SafetyCheckSummary } from '../types';

interface SafetyCheckModalProps {
  hasVoted: boolean;
  isFacilitator: boolean;
  safetySummary?: SafetyCheckSummary | null;
  onSubmit: (score: number) => void;
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
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(hasVoted);

  const handleSubmit = () => {
    if (selectedScore !== null) {
      onSubmit(selectedScore);
      setSubmitted(true);
    }
  };

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
      <div className="glass-modal" style={{ maxWidth: 640, width: '100%', padding: '2rem' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Retrospectivas produtivas dependem de honestidade sem medo de julgamentos ou retaliações. Sua resposta é crucial para calibrar a dinâmica da cerimônia.
        </p>

        {/* Garantia de Anonimato Inviolável */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
        }}>
          <Lock size={18} color="var(--color-went-well)" />
          <span style={{ fontSize: '0.8rem', color: '#a7f3d0', lineHeight: '1.4' }}>
            <strong>100% Confidencial e Anônimo:</strong> Nenhum IP, usuário ou identificador de sessão é armazenado junto com a sua nota. Apenas a distribuição agregada da equipe é exibida.
          </span>
        </div>

        {/* Formulário de Voto */}
        {!submitted ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
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
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                      }}>
                        {item.value}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="var(--color-primary)" />}
                  </div>
                );
              })}
            </div>

            <button
              disabled={selectedScore === null}
              onClick={handleSubmit}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: selectedScore !== null ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: selectedScore !== null ? 'pointer' : 'not-allowed',
                boxShadow: selectedScore !== null ? '0 0 20px var(--color-primary-glow)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Enviar Avaliação Confidencial
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              display: 'inline-flex',
              padding: '0.75rem',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              marginBottom: '1rem',
            }}>
              <Check size={32} color="var(--color-went-well)" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Voto Registrado com Sucesso!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Obrigado pela sinceridade. Aguarde o facilitador avançar a cerimônia para a fase de Brainstorm.
            </p>

            {/* Se for Facilitador, exibe a distribuição acumulada */}
            {isFacilitator && safetySummary && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Resumo Agregado (Facilitador)
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-went-well)' }}>
                    Média: {safetySummary.average.toFixed(1)} / 5.0 ({safetySummary.count} votos)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[5, 4, 3, 2, 1].map((scoreNum) => {
                    const count = safetySummary.distribution[scoreNum - 1] || 0;
                    const percent = safetySummary.count > 0 ? (count / safetySummary.count) * 100 : 0;
                    return (
                      <div key={scoreNum} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                        <span style={{ width: 45, color: 'var(--text-muted)' }}>Nota {scoreNum}:</span>
                        <div style={{ flex: 1, height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: scoreNum >= 4 ? 'var(--color-went-well)' : scoreNum === 3 ? 'var(--color-primary)' : 'var(--color-to-improve)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ width: 30, textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
