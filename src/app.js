// Offline Chess - HTML + JS with a minimal Tailwind-style CSS

(() => {
  let boardEl, statusEl, newGameBtn, undoBtn, promoOverlay;
  let timerWEl, timerBEl, time5mBtn, time10mBtn, time30mBtn;

  const PIECES = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  };

  function startingBoard() {
    return [
      ['bR','bN','bB','bQ','bK','bB','bN','bR'],
      ['bP','bP','bP','bP','bP','bP','bP','bP'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['wP','wP','wP','wP','wP','wP','wP','wP'],
      ['wR','wN','wB','wQ','wK','wB','wN','wR'],
    ];
  }

  const cloneBoard = (b) => b.map(row => row.slice());
  const inBounds = (r,c) => r >= 0 && r < 8 && c >=0 && c < 8;
  const colorOf = (p) => p ? p[0] : null; // 'w' or 'b'
  const typeOf = (p) => p ? p[1] : null; // K,Q,R,B,N,P

  const algebraic = (r,c) => String.fromCharCode(97 + c) + (8 - r);

  let state = {
    board: startingBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null, // {r,c}
    halfmove: 0,
    fullmove: 1,
    history: [],
  };

  let timer = {
    w: 600, // 10 minutes in seconds
    b: 600,
    interval: null,
    running: false,
  };

  let selected = null; // {r,c}
  let legalForSelected = [];
  let pendingPromotion = null; // {move}
  let lastStatus = '';
  const squares = Array.from({ length: 8 }, () => Array(8));

  function setStatus(text) { statusEl.textContent = text; }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateTimers() {
    timerWEl.textContent = `White: ${formatTime(timer.w)}`;
    timerBEl.textContent = `Black: ${formatTime(timer.b)}`;
  }

  function stopTimer() {
    if (timer.interval) {
      clearInterval(timer.interval);
      timer.interval = null;
    }
    timer.running = false;
  }

  function startTimer() {
    if (timer.interval) clearInterval(timer.interval);
    timer.running = true;
    timer.interval = setInterval(() => {
      if (state.turn === 'w') {
        timer.w--;
        if (timer.w <= 0) {
          stopTimer();
          lastStatus = 'Black wins on time.';
          setStatus(lastStatus);
        }
      } else {
        timer.b--;
        if (timer.b <= 0) {
          stopTimer();
          lastStatus = 'White wins on time.';
          setStatus(lastStatus);
        }
      }
      updateTimers();
    }, 1000);
  }

  function setTime(minutes) {
    stopTimer();
    timer.w = minutes * 60;
    timer.b = minutes * 60;
    updateTimers();
    resetGame();
  }

  function findKing(board, color) {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      if (board[r][c] === color + 'K') return {r,c};
    }
    return null;
  }

  function isSquareAttacked(board, r, c, byColor) {
    // Pawn attacks
    const dir = byColor === 'w' ? -1 : 1;
    for (const dc of [-1, 1]) {
      const pr = r + dir, pc = c + dc;
      if (inBounds(pr,pc) && board[pr][pc] === byColor + 'P') return true;
    }
    // Knight attacks
    const KJ = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of KJ) {
      const nr=r+dr, nc=c+dc;
      if (inBounds(nr,nc) && board[nr][nc] === byColor + 'N') return true;
    }
    // Bishop/Queen diagonals
    const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr,dc] of diag) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        const p = board[nr][nc];
        if (p) {
          if (colorOf(p) === byColor && (typeOf(p) === 'B' || typeOf(p) === 'Q')) return true;
          break;
        }
        nr+=dr; nc+=dc;
      }
    }
    // Rook/Queen lines
    const ortho = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr,dc] of ortho) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        const p = board[nr][nc];
        if (p) {
          if (colorOf(p) === byColor && (typeOf(p) === 'R' || typeOf(p) === 'Q')) return true;
          break;
        }
        nr+=dr; nc+=dc;
      }
    }
    // King
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) if (dr || dc) {
      const nr=r+dr, nc=c+dc;
      if (inBounds(nr,nc) && board[nr][nc] === byColor + 'K') return true;
    }
    return false;
  }

  function generatePseudoMoves(board, st, r, c) {
    const p = board[r][c];
    if (!p) return [];
    const color = colorOf(p), type = typeOf(p);
    const them = color === 'w' ? 'b' : 'w';
    const moves = [];

    function addMove(rr,cc, opts={}) {
      moves.push({ from:{r,c}, to:{r:rr,c:cc}, piece:p, capture: board[rr][cc], isEnPassant: !!opts.enPassant, isCastle: opts.castle || null, promotion: null });
    }

    if (type === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const promoteRank = color === 'w' ? 0 : 7;
      // forward
      const fr = r + dir;
      if (inBounds(fr,c) && !board[fr][c]) {
        addMove(fr,c);
        if (r === startRank) {
          const fr2 = r + 2*dir;
          if (!board[fr2][c]) addMove(fr2,c);
        }
      }
      // captures
      for (const dc of [-1,1]) {
        const rr = r + dir, cc = c + dc;
        if (!inBounds(rr,cc)) continue;
        if (board[rr][cc] && colorOf(board[rr][cc]) === them) addMove(rr,cc);
      }
      // en passant
      if (st.enPassant) {
        const {r:er, c:ec} = st.enPassant;
        if (er === r + dir && Math.abs(ec - c) === 1) {
          // target empty by definition; capture pawn behind
          addMove(er, ec, { enPassant: true });
        }
      }
      // promotions marking (set later at application stage)
      for (const m of moves) {
        if (m.to.r === promoteRank) m.promotion = 'Q'; // default, UI will override
      }
      return moves;
    }

    if (type === 'N') {
      const KJ = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr,dc] of KJ) {
        const nr=r+dr, nc=c+dc;
        if (!inBounds(nr,nc)) continue;
        const t = board[nr][nc];
        if (!t || colorOf(t) !== color) addMove(nr,nc);
      }
      return moves;
    }

    if (type === 'B' || type === 'R' || type === 'Q') {
      const dirs = [];
      if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      for (const [dr,dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while (inBounds(nr,nc)) {
          const t = board[nr][nc];
          if (!t) { addMove(nr,nc); }
          else { if (colorOf(t) !== color) addMove(nr,nc); break; }
          nr+=dr; nc+=dc;
        }
      }
      return moves;
    }

    if (type === 'K') {
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) if (dr||dc) {
        const nr=r+dr, nc=c+dc;
        if (!inBounds(nr,nc)) continue;
        const t = board[nr][nc];
        if (!t || colorOf(t) !== color) addMove(nr,nc);
      }
      // Castling
      const inCheck = isSquareAttacked(board, r, c, them);
      if (!inCheck) {
        if (color === 'w') {
          // King side
          if (st.castling.wK && !board[7][5] && !board[7][6] && !isSquareAttacked(board,7,5,'b') && !isSquareAttacked(board,7,6,'b')) {
            addMove(7,6,{castle:'K'});
          }
          // Queen side
          if (st.castling.wQ && !board[7][1] && !board[7][2] && !board[7][3] && !isSquareAttacked(board,7,2,'b') && !isSquareAttacked(board,7,3,'b')) {
            addMove(7,2,{castle:'Q'});
          }
        } else {
          if (st.castling.bK && !board[0][5] && !board[0][6] && !isSquareAttacked(board,0,5,'w') && !isSquareAttacked(board,0,6,'w')) {
            addMove(0,6,{castle:'K'});
          }
          if (st.castling.bQ && !board[0][1] && !board[0][2] && !board[0][3] && !isSquareAttacked(board,0,2,'w') && !isSquareAttacked(board,0,3,'w')) {
            addMove(0,2,{castle:'Q'});
          }
        }
      }
      return moves;
    }

    return moves;
  }

  function applyMove(board, st, move, overridePromotionPiece) {
    const nb = cloneBoard(board);
    // Lightweight state copy (avoid deep clone and history churn)
    const ns = {
      turn: st.turn,
      castling: { ...st.castling },
      enPassant: st.enPassant ? { ...st.enPassant } : null,
      halfmove: st.halfmove,
      fullmove: st.fullmove,
      history: st.history,
    };
    const {from, to, piece} = move;
    const movingColor = colorOf(piece);
    const them = movingColor === 'w' ? 'b' : 'w';

    // Reset fields we'll recompute
    ns.enPassant = null;
    ns.halfmove += 1;

    // Clear from
    nb[from.r][from.c] = null;
    let placedPiece = piece;

    // En passant capture
    if (move.isEnPassant) {
      const dir = movingColor === 'w' ? -1 : 1;
      const capR = to.r - dir;
      nb[capR][to.c] = null;
      ns.halfmove = 0;
    }

    // Handle capture
    if (board[to.r][to.c]) {
      ns.halfmove = 0;
    }

    // Pawn specifics
    if (typeOf(piece) === 'P') {
      ns.halfmove = 0;
      // Double push sets en passant
      if (Math.abs(to.r - from.r) === 2) {
        ns.enPassant = { r: (from.r + to.r) / 2, c: from.c };
      }
      // Promotion
      const promoteRank = movingColor === 'w' ? 0 : 7;
      if (to.r === promoteRank) {
        const p = overridePromotionPiece || move.promotion || 'Q';
        placedPiece = movingColor + p;
      }
    }

    // Place piece at destination
    nb[to.r][to.c] = placedPiece;

    // Castling piece movement and rights
    if (typeOf(piece) === 'K') {
      if (movingColor === 'w') ns.castling.wK = ns.castling.wQ = false;
      else ns.castling.bK = ns.castling.bQ = false;
      if (move.isCastle === 'K') {
        // move rook from h-file to f-file
        if (movingColor === 'w') { nb[7][5] = 'wR'; nb[7][7] = null; }
        else { nb[0][5] = 'bR'; nb[0][7] = null; }
      } else if (move.isCastle === 'Q') {
        // rook from a-file to d-file
        if (movingColor === 'w') { nb[7][3] = 'wR'; nb[7][0] = null; }
        else { nb[0][3] = 'bR'; nb[0][0] = null; }
      }
    }
    // Rook move or capture affecting rights
    if (typeOf(piece) === 'R') {
      if (movingColor === 'w') {
        if (from.r === 7 && from.c === 0) ns.castling.wQ = false;
        if (from.r === 7 && from.c === 7) ns.castling.wK = false;
      } else {
        if (from.r === 0 && from.c === 0) ns.castling.bQ = false;
        if (from.r === 0 && from.c === 7) ns.castling.bK = false;
      }
    }
    // If a rook is captured on its original square, update rights
    if (board[to.r][to.c] === 'wR') {
      if (to.r === 7 && to.c === 0) ns.castling.wQ = false;
      if (to.r === 7 && to.c === 7) ns.castling.wK = false;
    }
    if (board[to.r][to.c] === 'bR') {
      if (to.r === 0 && to.c === 0) ns.castling.bQ = false;
      if (to.r === 0 && to.c === 7) ns.castling.bK = false;
    }

    // Switch side to move
    ns.turn = them;
    if (them === 'w') ns.fullmove += 1;

    return { board: nb, state: ns };
  }

  function isLegalMove(board, st, move) {
    const res = applyMove(board, st, move);
    const myColor = colorOf(move.piece);
    const kingPos = findKing(res.board, myColor);
    if (!kingPos) return false;
    return !isSquareAttacked(res.board, kingPos.r, kingPos.c, myColor === 'w' ? 'b' : 'w');
  }

  const legalMoveCache = new Map();
  function legalMovesFor(board, st, r, c) {
    const cacheKey = `${r},${c},${st.turn},${JSON.stringify(st.castling)},${st.enPassant ? `${st.enPassant.r},${st.enPassant.c}` : 'null'}`;
    if (legalMoveCache.has(cacheKey)) {
      return legalMoveCache.get(cacheKey);
    }
    const moves = generatePseudoMoves(board, st, r, c).filter(m => isLegalMove(board, st, m));
    legalMoveCache.set(cacheKey, moves);
    return moves;
  }

  function allLegalMoves(board, st, color) {
    const ms = [];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p = board[r][c];
      if (p && colorOf(p) === color) ms.push(...legalMovesFor(board, st, r, c));
    }
    return ms;
  }

  function render(light=false) {
    for (let r=0; r<8; r++) {
      for (let c=0; c<8; c++) {
        const cell = squares[r][c];
        const isLight = (r + c) % 2 === 0;
        cell.className = `square ${isLight ? 'light' : 'dark'} select-none cursor-pointer`;
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        
        // Clear existing content
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        
        // Add piece if present
        const piece = state.board[r][c];
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece';
          span.textContent = PIECES[piece];
          // Set piece color based on piece type
          if (piece[0] === 'w') {
            span.style.color = '#ffffff';
            span.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.6)';
          } else {
            span.style.color = '#1f2937';
            span.style.textShadow = '1px 1px 2px rgba(255, 255, 255, 0.3)';
          }
          cell.appendChild(span);
        }
        
        // Highlight selected square
        if (selected && selected.r === r && selected.c === c) {
          cell.classList.add('selected');
        }
        
        // Show legal moves
        const lm = legalForSelected.find(m => m.to.r === r && m.to.c === c);
        if (lm) {
          if (state.board[r][c] || lm.isEnPassant) {
            cell.classList.add('capture');
          } else {
            const dot = document.createElement('div');
            dot.className = 'dot';
            cell.appendChild(dot);
          }
        }
      }
    }
    if (!light) setStatus(lastStatus);
    updateTimers();
  }

  function pushHistory(prevState, move, notation) {
    state.history.push({ 
      prev: {
        board: prevState.board.map(row => [...row]),
        turn: prevState.turn,
        castling: {...prevState.castling},
        enPassant: prevState.enPassant ? {...prevState.enPassant} : null,
        halfmove: prevState.halfmove,
        fullmove: prevState.fullmove
      }, 
      move, 
      notation 
    });
  }

  function makeMove(move, promotionPiece=null) {
    if (!timer.running && state.history.length === 0) {
      startTimer();
    }
    legalMoveCache.clear();
    const prev = state;
    const res = applyMove(state.board, state, move, promotionPiece);
    // Compute next-player status and check marker once
    const them = res.state.turn;
    const theirMoves = allLegalMoves(res.board, res.state, them);
    const theirKing = findKing(res.board, them);
    let marker = '';
    if (theirMoves.length === 0) {
      if (theirKing && isSquareAttacked(res.board, theirKing.r, theirKing.c, prev.turn)) marker = '#';
      else marker = '½';
      stopTimer();
    } else if (theirKing && isSquareAttacked(res.board, theirKing.r, theirKing.c, prev.turn)) {
      marker = '+';
    }
    state = res.state; state.board = res.board;
    pushHistory(prev, move, null);
    selected = null; legalForSelected = [];

    if (theirMoves.length === 0) {
      lastStatus = marker === '#' ? `${them === 'w' ? 'White' : 'Black'} is checkmated.` : 'Stalemate.';
    } else {
      const inCheck = theirKing && isSquareAttacked(res.board, theirKing.r, theirKing.c, prev.turn);
      lastStatus = `${them === 'w' ? 'White' : 'Black'} to move${inCheck ? ' (in check)' : ''}.`;
    }

    render(false);
  }

  // Move history UI removed; notation generation no longer needed

  function onSquareClick(r,c) {
    const piece = state.board[r][c];
    if (selected) {
      // if click on a legal destination, move
      const m = legalForSelected.find(m => m.to.r === r && m.to.c === c);
      if (m) {
        // Handle promotion UI if needed
        if (typeOf(m.piece) === 'P') {
          const promoteRank = colorOf(m.piece) === 'w' ? 0 : 7;
          if (m.to.r === promoteRank) {
            pendingPromotion = m;
            openPromotion(colorOf(m.piece));
            return;
          }
        }
        makeMove(m);
        return;
      }
      // if clicking own piece, reselect
      if (piece && colorOf(piece) === state.turn) {
        selected = {r,c};
        legalForSelected = legalMovesFor(state.board, state, r, c);
        render(true);
        return;
      }
      // otherwise clear selection
      selected = null; legalForSelected = [];
      render(true);
      return;
    }

    // no selection yet; select only if own piece
    if (piece && colorOf(piece) === state.turn) {
      selected = {r,c};
      legalForSelected = legalMovesFor(state.board, state, r, c);
      render(true);
    }
  }

  function openPromotion(color) {
    promoOverlay.classList.remove('hidden');
    promoOverlay.querySelectorAll('button[data-piece]').forEach(btn => {
      btn.onclick = () => {
        const p = btn.getAttribute('data-piece');
        const piece = color + p;
        const m = pendingPromotion;
        pendingPromotion = null;
        promoOverlay.classList.add('hidden');
        makeMove(m, p);
      };
    });
    promoOverlay.addEventListener('click', (e) => {
      if (e.target === promoOverlay) {
        promoOverlay.classList.add('hidden');
        pendingPromotion = null;
      }
    });
  }

  function resetGame() {
    legalMoveCache.clear();
    state = {
      board: startingBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      halfmove: 0,
      fullmove: 1,
      history: [],
    };
    selected = null; legalForSelected = []; pendingPromotion = null;
    // initial status
    lastStatus = 'White to move';
    stopTimer();
    updateTimers();
    render(false);
  }

  function undo() {
    const h = state.history;
    if (!h.length) return;
    legalMoveCache.clear();
    const last = h.pop();
    state = last.prev;
    selected = null; legalForSelected = []; pendingPromotion = null;
    // recompute status for restored state
    const myMoves = allLegalMoves(state.board, state, state.turn);
    const myKing = findKing(state.board, state.turn);
    const inCheck = myKing && isSquareAttacked(state.board, myKing.r, myKing.c, state.turn === 'w' ? 'b' : 'w');
    lastStatus = myMoves.length === 0 ? (inCheck ? `${state.turn === 'w' ? 'White' : 'Black'} is checkmated.` : 'Stalemate.') : `${state.turn === 'w' ? 'White' : 'Black'} to move${inCheck ? ' (in check)' : ''}.`;
    render(false);
  }

  // Build board DOM once and delegate clicks
  function initBoardDom() {
    const frag = document.createDocumentFragment();
    for (let r=0; r<8; r++) {
      for (let c=0; c<8; c++) {
        const div = document.createElement('div');
        div.className = 'square select-none cursor-pointer';
        div.dataset.r = String(r);
        div.dataset.c = String(c);
        squares[r][c] = div;
        frag.appendChild(div);
      }
    }
    boardEl.appendChild(frag);
    
    let clickTimeout;
    boardEl.addEventListener('click', (e) => {
      if (clickTimeout) return;
      clickTimeout = setTimeout(() => clickTimeout = null, 100);
      
      const cell = e.target.closest('.square');
      if (!cell || !boardEl.contains(cell)) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      onSquareClick(r,c);
    });
  }

  // Initial render
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements after DOM is loaded
    boardEl = document.getElementById('board');
    statusEl = document.getElementById('status');
    newGameBtn = document.getElementById('newGameBtn');
    undoBtn = document.getElementById('undoBtn');
    promoOverlay = document.getElementById('promotionOverlay');
    timerWEl = document.getElementById('timer-w');
    timerBEl = document.getElementById('timer-b');
    time5mBtn = document.getElementById('time5m');
    time10mBtn = document.getElementById('time10m');
    time30mBtn = document.getElementById('time30m');

    // Add event listeners
    newGameBtn.addEventListener('click', resetGame);
    undoBtn.addEventListener('click', undo);
    
    time5mBtn.addEventListener('click', () => {
      setTime(5);
      document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
      time5mBtn.classList.add('active');
    });
    time10mBtn.addEventListener('click', () => {
      setTime(10);
      document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
      time10mBtn.classList.add('active');
    });
    time30mBtn.addEventListener('click', () => {
      setTime(30);
      document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
      time30mBtn.classList.add('active');
    });

    // Initialize board DOM
    initBoardDom();

    lastStatus = 'White to move';
    setTime(10);
    render(false);
  });
})();
