// Usa WebSocket global do Node 22

async function testAll() {
  console.log('--- Iniciando Teste E2E das 5 Evoluções ---');

  // 1. Criar Board
  const res = await fetch('http://localhost:8088/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test 5 Evolutions', max_votes_per_user: 5 })
  });
  const boardData = await res.json();
  console.log('✔ Board criado:', boardData.id);

  // 2. Conectar WebSocket como Facilitador
  const ws = new WebSocket(`ws://localhost:8088/ws/board/${boardData.id}?token=${boardData.facilitator_token}&session_id=fac_session`);

  let currentState = null;
  const statePromises = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'SYNC_STATE' || msg.type === 'ROOM_STATE_UPDATED') {
      currentState = msg.payload.board ? msg.payload : { ...currentState, ...msg.payload };
      for (const resolver of statePromises) {
        resolver(currentState);
      }
    }
  };

  const waitForCondition = (predicate, description, timeoutMs = 5000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (currentState && predicate(currentState)) {
          resolve(currentState);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout esperando: ${description}`));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });
  console.log('✔ WebSocket conectado como facilitador');

  // Aguardar primeiro snapshot
  await waitForCondition((s) => s.board && s.columns.length > 0, 'Snapshot inicial');
  const col1 = currentState.columns[0].id;
  const col2 = currentState.columns[1].id;

  // 3. FSM Avançar para BRAINSTORM
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'BRAINSTORM' }
  }));
  await waitForCondition((s) => s.board.phase === 'BRAINSTORM', 'Fase BRAINSTORM');
  console.log('✔ Fase alterada para BRAINSTORM');

  // 4. Criar Cards
  ws.send(JSON.stringify({
    type: 'CARD_CREATE',
    payload: { column_id: col1, content: 'Card 1 Coluna 1' }
  }));
  await waitForCondition((s) => s.cards.some((c) => c.content === 'Card 1 Coluna 1'), 'Card 1 criado');
  const card1 = currentState.cards.find((c) => c.content === 'Card 1 Coluna 1');

  ws.send(JSON.stringify({
    type: 'CARD_CREATE',
    payload: { column_id: col2, content: 'Card 2 Coluna 2' }
  }));
  await waitForCondition((s) => s.cards.some((c) => c.content === 'Card 2 Coluna 2'), 'Card 2 criado');
  const card2 = currentState.cards.find((c) => c.content === 'Card 2 Coluna 2');

  ws.send(JSON.stringify({
    type: 'CARD_CREATE',
    payload: { column_id: col1, content: 'Card 3 Coluna 1' }
  }));
  await waitForCondition((s) => s.cards.some((c) => c.content === 'Card 3 Coluna 1'), 'Card 3 criado');
  const card3 = currentState.cards.find((c) => c.content === 'Card 3 Coluna 1');

  // 5. Evolução 2: Mover Card entre Colunas (CARD_MOVE)
  console.log('--- Testando Evolução 2: Mover Card entre Colunas ---');
  ws.send(JSON.stringify({
    type: 'CARD_MOVE',
    payload: { card_id: card1.id, target_column_id: col2 }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card1.id);
    return c && c.column_id === col2;
  }, 'Card 1 movido para Coluna 2');
  console.log('✔ Card 1 movido com sucesso para Coluna 2 via CARD_MOVE');

  // 6. Evolução 1: Restringir Merge à Mesma Coluna
  console.log('--- Testando Evolução 1: Restringir Merge à Mesma Coluna ---');
  // Avançar para GROUPING
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'GROUPING' }
  }));
  await waitForCondition((s) => s.board.phase === 'GROUPING', 'Fase GROUPING');
  console.log('✔ Fase alterada para GROUPING');

  // Tentar agrupar Card 3 (Coluna 1) sob Card 2 (Coluna 2) -> DEVE SER REJEITADO
  ws.send(JSON.stringify({
    type: 'CARD_GROUP',
    payload: { parent_card_id: card2.id, child_card_ids: [card3.id] }
  }));
  // Esperar um ciclo e verificar que Card 3 continua sem parent
  await new Promise((r) => setTimeout(r, 600));
  const card3Check = currentState.cards.find((c) => c.id === card3.id);
  if (card3Check.parent_card_id) {
    throw new Error('FALHA: Card de coluna diferente foi agrupado!');
  }
  console.log('✔ Tentativa de merge entre colunas diferentes foi corretamente bloqueada!');

  // Agrupar Card 1 (que foi movido para Coluna 2) sob Card 2 (Coluna 2) -> DEVE FUNCIONAR (mesma coluna)
  ws.send(JSON.stringify({
    type: 'CARD_GROUP',
    payload: { parent_card_id: card2.id, child_card_ids: [card1.id] }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card1.id);
    return c && c.parent_card_id === card2.id;
  }, 'Card 1 agrupado em Card 2 na mesma coluna');
  console.log('✔ Merge na mesma coluna funcionou perfeitamente!');

  // Desagrupar Card 1 -> deve continuar na Coluna 2
  ws.send(JSON.stringify({
    type: 'CARD_UNGROUP',
    payload: { card_id: card1.id }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card1.id);
    return c && c.parent_card_id === null && c.column_id === col2;
  }, 'Card 1 desagrupado mantendo a coluna 2');
  console.log('✔ Desagrupamento concluído: Card permaneceu na coluna correta sem pular de coluna!');

  // 7. Evolução 4: Micro-reações de Emojis nos Cards
  console.log('--- Testando Evolução 4: Micro-reações de Emojis ---');
  ws.send(JSON.stringify({
    type: 'CARD_REACT',
    payload: { card_id: card2.id, emoji: '👏' }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card2.id);
    return c && c.reactions && c.reactions.some((r) => r.emoji === '👏' && r.count === 1);
  }, 'Reação 👏 adicionada');
  console.log('✔ Reação 👏 adicionada com sucesso ao card!');

  ws.send(JSON.stringify({
    type: 'CARD_REACT',
    payload: { card_id: card2.id, emoji: '🚀' }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card2.id);
    return c && c.reactions && c.reactions.some((r) => r.emoji === '🚀' && r.count === 1);
  }, 'Reação 🚀 adicionada');
  console.log('✔ Reação 🚀 adicionada com sucesso ao card!');

  // Toggle off na reação 👏
  ws.send(JSON.stringify({
    type: 'CARD_REACT',
    payload: { card_id: card2.id, emoji: '👏' }
  }));
  await waitForCondition((s) => {
    const c = s.cards.find((c) => c.id === card2.id);
    return c && (!c.reactions || !c.reactions.some((r) => r.emoji === '👏'));
  }, 'Reação 👏 removida com toggle');
  console.log('✔ Reação 👏 removida via toggle com sucesso!');

  // 8. Evolução 3: Voltar de Fase no FSM
  console.log('--- Testando Evolução 3: Voltar de Fase no FSM ---');
  // Avançar para VOTING
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'VOTING' }
  }));
  await waitForCondition((s) => s.board.phase === 'VOTING', 'Fase VOTING');
  console.log('✔ Avançado para VOTING');

  // Retroceder de VOTING para GROUPING
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'GROUPING' }
  }));
  await waitForCondition((s) => s.board.phase === 'GROUPING', 'Voltar para GROUPING');
  console.log('✔ FSM permitiu voltar de VOTING para GROUPING!');

  // Retroceder de GROUPING para BRAINSTORM
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'BRAINSTORM' }
  }));
  await waitForCondition((s) => s.board.phase === 'BRAINSTORM', 'Voltar para BRAINSTORM');
  console.log('✔ FSM permitiu voltar de GROUPING para BRAINSTORM!');

  // Tentar pulo ilegal: BRAINSTORM -> VOTING (pular GROUPING) -> DEVE FALHAR
  ws.send(JSON.stringify({
    type: 'PHASE_CHANGE',
    payload: { target_phase: 'VOTING' }
  }));
  await new Promise((r) => setTimeout(r, 600));
  if (currentState.board.phase === 'VOTING') {
    throw new Error('FALHA: FSM permitiu pular fase ilegalmente!');
  }
  console.log('✔ FSM bloqueou pulo ilegal de fase com sucesso!');

  ws.close();
  console.log('=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===');
  process.exit(0);
}

testAll().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
