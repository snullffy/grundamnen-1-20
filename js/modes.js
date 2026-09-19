// ==========================================================================
// modes.js: Alla lägen – Learn, Quiz, Blind, FinalTest, Progress, Results.
// "this" i metoderna = App (anropas med .call(App, ...)).
// ==========================================================================

// ---------- Delad frågekort-renderare ----------
function renderQuestionCard(q) {
  return `
    <div class="q-type-tag">${q.tag}</div>
    <div class="question-card">
      <div class="q-prompt">${q.prompt}</div>
      <div class="q-focus">${q.focus}</div>
    </div>`;
}

// Bygg svarsyta. onAnswer(value) anropas när eleven svarar.
// Returnerar { focusInput } för att kunna fokusera.
function renderAnswerArea(q, container, onAnswer) {
  if (q.options) {
    // Flerval
    const letters = ["A", "B", "C", "D"];
    const wrap = document.createElement("div");
    wrap.className = "options";
    q.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "option";
      b.innerHTML = `<span class="letter">${letters[i]}</span><span>${opt.label}</span>`;
      b.addEventListener("click", () => onAnswer(opt.value, b));
      wrap.appendChild(b);
    });
    container.appendChild(wrap);
    return {};
  } else {
    // Skriv-själv
    const wrap = document.createElement("div");
    wrap.className = "type-answer";
    const input = document.createElement("input");
    input.className = "type-input";
    input.type = "text";
    input.inputMode = "text";
    input.placeholder = q.checkKind === "formula" ? "t.ex. SO4 2-" : "Skriv jonens namn";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-block";
    btn.textContent = "Svara";
    const submit = () => { if (input.value.trim() !== "") onAnswer(input.value, input); };
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    wrap.appendChild(input);
    wrap.appendChild(btn);
    container.appendChild(wrap);
    setTimeout(() => input.focus(), 50);
    return { input };
  }
}

// ==========================================================================
// LEARN – flashcards
// ==========================================================================
const Learn = {
  // ----- Startskärm: välj vilken sida som visas först -----
  start() {
    const app = this;
    app.html(`
      <section class="view center-col">
        <header class="hero"><h1>Lär dig – swipa</h1></header>
        <p class="mode-desc">Titta på kortet och försök komma på svaret. <b>Tryck på kortet</b> för att vända och se facit.<br>👉 Swipa <b>höger = Jag kan</b> · 👈 vänster <b>= Kan inte</b>.<br>På slutet testas du på det du inte kunde.</p>

        <div class="section-title" style="text-align:center;margin-bottom:8px;">Vilken sida visas först?</div>
        <div class="pill-row" id="sideSel">
          <button class="pill active" data-side="name">Jon (namn)</button>
          <button class="pill" data-side="symbol">Formel</button>
          <button class="pill" data-side="mix">Blanda</button>
        </div>
        <button class="btn btn-primary btn-block" id="startDeck">Starta ✨</button>
        <div class="spacer"></div>
      </section>`);

    let side = "name";
    app.root.querySelectorAll("#sideSel .pill").forEach((p) =>
      p.addEventListener("click", () => {
        app.root.querySelectorAll("#sideSel .pill").forEach((x) => x.classList.remove("active"));
        p.classList.add("active"); side = p.dataset.side;
      }));
    document.getElementById("startDeck").addEventListener("click", () => {
      app.deck = { cards: Engine.shuffle(ELEMENTS), index: 0, side, known: 0, unknown: [] };
      Learn.renderDeck.call(app);
    });
  },

  // ----- Kortleken (Tinder-stil) -----
  renderDeck() {
    const app = this;
    const dk = app.deck;
    if (dk.index >= dk.cards.length) { Learn.finish.call(app); return; }

    const el = dk.cards[dk.index];
    const total = dk.cards.length;
    const pct = Math.round((dk.index / total) * 100);
    const side = dk.side === "mix" ? (Math.random() < 0.5 ? "name" : "symbol") : dk.side;
    const frontLabel = side === "name" ? "Jon" : "Formel";
    const frontVal = side === "name" ? el.name : el.symbol;
    const backLabel = side === "name" ? "Formel" : "Jon";
    const backVal = side === "name" ? el.symbol : el.name;

    app.html(`
      <section class="view center-col">
        <div class="progress-mini" style="max-width:380px;width:100%;">
          <div class="lbl">Kort ${dk.index + 1}/${total} · 👍 ${dk.known} · 👎 ${dk.unknown.length}</div>
          <div class="progress"><span style="width:${pct}%"></span></div>
        </div>

        <div class="swipe-wrap">
          <div class="deck">
            <div class="swipe-card" id="card">
              <div class="swipe-badge like">KAN 👍</div>
              <div class="swipe-badge nope">KAN INTE 👎</div>
              <div class="flip" id="flip">
                <div class="face front">
                  <span class="c-tag">${frontLabel}</span>
                  <div class="c-val">${frontVal}</div>
                  <span class="c-tap">tryck för att vända</span>
                </div>
                <div class="face back">
                  <span class="c-tag">${backLabel}</span>
                  <div class="c-val">${backVal}</div>
                  <div class="c-pair">${el.name} = ${el.symbol}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="swipe-actions">
          <button class="round-btn nope" id="btnNope" aria-label="Kan inte">👎</button>
          <button class="round-btn flip" id="btnFlip" aria-label="Vänd kortet">↻</button>
          <button class="round-btn like" id="btnLike" aria-label="Kan">👍</button>
        </div>
        <button class="hint-btn" id="deckHome" style="margin-top:10px;">Avsluta</button>
      </section>`);

    Learn.bindCard.call(app, el);
  },

  bindCard(el) {
    const app = this;
    const dk = app.deck;
    const card = document.getElementById("card");
    const flip = document.getElementById("flip");
    let dx = 0, dy = 0, sx = 0, sy = 0, dragging = false, moved = false, flipped = false, done = false;

    const doFlip = () => { flipped = !flipped; flip.classList.toggle("flipped", flipped); };

    const decide = (dir) => {
      if (done) return; done = true;
      card.style.transition = "transform .28s ease, opacity .28s ease";
      card.style.transform = `translate(${dir * 140}%, -30px) rotate(${dir * 20}deg)`;
      card.style.opacity = "0";
      const st = Store.el(el.number);
      if (dir > 0) {                       // swipe höger = jag kan
        st.markedHard = false;
        if (st.level < 3) st.level++;
        st.seen++;
        Store.removeMistake(el.number);
        dk.known++; app.award(2);
      } else {                             // swipe vänster = kan inte
        st.markedHard = true;
        st.level = Math.max(0, st.level - 1);
        st.due = Store.data.answeredCount;
        Store.addMistake(el.number);
        dk.unknown.push(el.number);
      }
      Store.save(); app.updateTopbar();
      setTimeout(() => { dk.index++; Learn.renderDeck.call(app); }, 250);
    };
    app._deckDecide = decide;
    app._deckFlip = doFlip;

    const setBadge = (v) => {
      card.classList.toggle("show-like", v > 40);
      card.classList.toggle("show-nope", v < -40);
    };

    card.addEventListener("pointerdown", (e) => {
      if (done) return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      card.style.transition = "none";
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      card.style.transform = `translate(${dx}px, ${dy * 0.22}px) rotate(${dx / 18}deg)`;
      setBadge(dx);
    });
    const up = () => {
      if (!dragging) return; dragging = false;
      const T = 90;
      if (dx > T) return decide(1);
      if (dx < -T) return decide(-1);
      // liten rörelse = tap = vänd kortet
      card.style.transition = "transform .25s ease";
      card.style.transform = ""; setBadge(0);
      if (!moved) doFlip();
      dx = 0; dy = 0;
    };
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", up);

    document.getElementById("btnLike").addEventListener("click", () => decide(1));
    document.getElementById("btnNope").addEventListener("click", () => decide(-1));
    document.getElementById("btnFlip").addEventListener("click", doFlip);
    document.getElementById("deckHome").addEventListener("click", () => app.go("home"));

    // Tangentbord för dator (bind bara en gång).
    if (!app._deckKeyBound) {
      app._deckKeyBound = true;
      document.addEventListener("keydown", (e) => {
        if (app.currentView !== "learn" || !document.getElementById("card")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); app._deckDecide && app._deckDecide(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); app._deckDecide && app._deckDecide(-1); }
        else if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault(); app._deckFlip && app._deckFlip();
        }
      });
    }
  },

  finish() {
    const app = this;
    const dk = app.deck;
    const unknown = [...new Set(dk.unknown)];
    app.html(`
      <section class="view center-col">
        <header class="hero"><h1>Klart! 🎉</h1></header>
        <p class="mode-desc">Du kunde <b>${dk.known}</b> av <b>${dk.cards.length}</b> direkt.${unknown.length ? ` <b>${unknown.length}</b> behöver mer träning.` : " Snyggt jobbat!"}</p>
        <div style="width:100%;max-width:380px;display:grid;gap:12px;">
          ${unknown.length ? `<button class="btn btn-primary btn-block" id="testUnknown">📝 Testa det du inte kunde (${unknown.length})</button>` : ""}
          <button class="btn btn-block" id="againDeck">↻ Gör om korten</button>
          <button class="btn btn-block" id="toHome">🏠 Till start</button>
        </div>
      </section>`);
    if (!unknown.length) app.burst();
    const t = document.getElementById("testUnknown");
    if (t) t.addEventListener("click", () => Quiz.startAdaptive.call(app, {
      label: "Gör om fel",
      length: Math.max(8, Math.min(16, unknown.length * 2)),
      pool: unknown.map((n) => Engine.byNumber(n)),
      showFeedback: true, forceMix: true
    }));
    document.getElementById("againDeck").addEventListener("click", () => Learn.start.call(app));
    document.getElementById("toHome").addEventListener("click", () => app.go("home"));
  },

  starText(level) {
    return "⭐".repeat(level) + "·".repeat(MAX_LEVEL - level);
  }
};

// ==========================================================================
// QUIZ – adaptivt (med feedback) och test (utan feedback)
// ==========================================================================
const Quiz = {
  // ----- Adaptivt övningsläge med direkt feedback -----
  startAdaptive(config) {
    const app = this;
    app.session = {
      config,
      label: config.label,
      length: config.length,
      pool: config.pool,
      showFeedback: config.showFeedback !== false,
      index: 0,
      score: 0,
      lastNum: null,
      results: [],
      forceMix: !!config.forceMix
    };
    Quiz.nextAdaptive.call(app);
  },

  // ----- Fast lista MED feedback (t.ex. Miniquiz: en fråga per jon) -----
  startFixed(config) {
    const app = this;
    app.session = {
      config,
      label: config.label,
      length: config.questions.length,
      questions: config.questions,
      fixed: true,
      showFeedback: true,
      index: 0,
      score: 0,
      lastNum: null,
      results: [],
      forceMix: false
    };
    Quiz.nextAdaptive.call(app);
  },

  nextAdaptive() {
    const app = this;
    const s = app.session;
    if (s.index >= s.length) {
      const cfg = s.config || {};
      const miniNext = (cfg.miniTour && cfg.miniIndex != null && cfg.miniIndex < MINI_GROUPS.length - 1)
        ? cfg.miniIndex + 1 : null;
      Results.show.call(app, {
        label: s.label, score: s.score, total: s.length,
        results: s.results, grade: false, quizDone: true,
        miniNext, miniTourDone: !!(cfg.miniTour && cfg.miniIndex === MINI_GROUPS.length - 1),
        miniIndex: cfg.miniIndex
      });
      return;
    }
    let q;
    if (s.fixed) {
      q = s.questions[s.index];
    } else {
      const el = Engine.pickWeighted(s.pool, s.lastNum);
      s.lastNum = el.number;
      const type = Engine.pickType(el, { forceMix: s.forceMix, testMode: false });
      q = Engine.buildQuestion(el, type);
    }
    s.current = q;
    Quiz.renderAdaptive.call(app, q);
  },

  renderAdaptive(q) {
    const app = this;
    const s = app.session;
    const pct = Math.round((s.index / s.length) * 100);
    app.html(`
      <section class="view">
        <div class="quiz-head">
          <div class="quiz-progress"><span style="width:${pct}%"></span></div>
          <div class="quiz-meta"><span>${s.label}</span><span>Fråga ${s.index + 1}/${s.length}</span></div>
        </div>
        <div id="qcard">${renderQuestionCard(q)}</div>
        <div id="answerArea"></div>
        <div id="fb"></div>
      </section>
    `);
    const area = document.getElementById("answerArea");
    let answered = false;
    renderAnswerArea(q, area, (value, elm) => {
      if (answered) return;
      answered = true;
      const correct = Engine.checkAnswer(q, value);
      Quiz.showFeedback.call(app, q, value, correct, elm, area, true, () => {
        s.index++;
        Quiz.nextAdaptive.call(app);
      });
    });
  },

  // Visa feedback (för adaptivt läge). onNext körs när eleven går vidare.
  showFeedback(q, given, correct, elm, area, giveXp, onNext) {
    const app = this;
    const s = app.session;
    if (correct) s.score++;
    s.results.push({
      element: q.element, tag: q.tag, prompt: q.prompt, focus: q.focus,
      given, answer: q.answer, correct
    });

    app.applyAnswer(q, correct, giveXp);

    // Markera alternativ / input.
    if (q.options) {
      const btns = area.querySelectorAll(".option");
      btns.forEach((b) => {
        b.disabled = true;
        const label = b.textContent.trim();
        const val = q.options[[...btns].indexOf(b)].value;
        if (Engine.normalize(val) === Engine.normalize(q.answer)) b.classList.add("correct");
        else b.classList.add("dim");
      });
      if (!correct && elm) elm.classList.remove("dim"), elm.classList.add("wrong");
    } else if (elm) {
      elm.disabled = true;
      elm.classList.add(correct ? "correct" : "wrong");
    }

    const el = q.element;
    const fb = document.getElementById("fb");
    fb.innerHTML = correct ? `
      <div class="feedback ok">
        <div class="fb-title">✅ Rätt!</div>
        <div class="fb-body"><b>${el.name} = ${el.symbol}</b></div>
      </div>` : `
      <div class="feedback no">
        <div class="fb-title">❌ Inte riktigt</div>
        <div class="fb-body">Du svarade: <b>${given}</b><br>Rätt svar är: <b>${el.name} = ${el.symbol}</b></div>
        <div class="fb-remember">Kom ihåg: <b>${el.name} → ${el.symbol}</b>.${el.hint ? " " + el.hint : ""}</div>
      </div>`;

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-primary btn-block";
    nextBtn.style.marginTop = "14px";
    nextBtn.textContent = s.index + 1 >= s.length ? "Se resultat →" : "Nästa fråga →";
    nextBtn.addEventListener("click", onNext);
    fb.appendChild(nextBtn);
    nextBtn.focus();
  },

  // ----- Testläge: ingen feedback förrän på slutet -----
  startTest(config) {
    const app = this;
    app.test = {
      label: config.label,
      questions: config.questions,
      grade: !!config.grade,
      isFinal: !!config.isFinal,
      index: 0,
      score: 0,
      results: []
    };
    Quiz.renderTest.call(app);
  },

  renderTest() {
    const app = this;
    const t = app.test;
    if (t.index >= t.questions.length) {
      Results.show.call(app, {
        label: t.label, score: t.score, total: t.questions.length,
        results: t.results, grade: t.grade, quizDone: true, isFinal: t.isFinal
      });
      return;
    }
    const q = t.questions[t.index];
    const pct = Math.round((t.index / t.questions.length) * 100);
    app.html(`
      <section class="view">
        <div class="quiz-head">
          <div class="quiz-progress"><span style="width:${pct}%"></span></div>
          <div class="quiz-meta"><span>${t.label}</span><span>Fråga ${t.index + 1}/${t.questions.length}</span></div>
        </div>
        <div id="qcard">${renderQuestionCard(q)}</div>
        <div id="answerArea"></div>
      </section>
    `);
    const area = document.getElementById("answerArea");
    let answered = false;
    renderAnswerArea(q, area, (value) => {
      if (answered) return;
      answered = true;
      const correct = Engine.checkAnswer(q, value);
      if (correct) t.score++;
      t.results.push({
        element: q.element, tag: q.tag, prompt: q.prompt, focus: q.focus,
        given: value, answer: q.answer, correct
      });
      // Uppdatera kunskap/streak tyst (ingen XP-float under test för lugn känsla, men vi ger XP).
      app.applyAnswer(q, correct, true);
      t.index++;
      // Kort paus så knapptryck känns.
      setTimeout(() => Quiz.renderTest.call(app), 120);
    });
  }
};

// ==========================================================================
// BLIND – "Skriv allt": se ena sidan, skriv de andra två
// ==========================================================================
const Blind = {
  start() {
    const app = this;
    app.html(`
      <section class="view center-col">
        <div class="hero"><h1>✍️ Skriv allt</h1></div>
        <p class="mode-desc">Du ser <b>en</b> sida och skriver den andra själv – helt på blindo.<br>Ser du <b>Sulfatjon</b> skriver du formeln <b>SO4 2-</b>. Ser du <b>SO₄²⁻</b> skriver du <b>Sulfatjon</b>.</p>
        <div class="pill-row" id="blLen">
          <button class="pill active" data-len="10">10 joner</button>
          <button class="pill" data-len="28">Alla 28</button>
        </div>
        <button class="btn btn-green btn-block" id="blStart">✍️ Starta</button>
        <div class="spacer"></div>
      </section>`);
    let len = 10;
    app.root.querySelectorAll("#blLen .pill").forEach((p) =>
      p.addEventListener("click", () => {
        app.root.querySelectorAll("#blLen .pill").forEach((x) => x.classList.remove("active"));
        p.classList.add("active"); len = parseInt(p.dataset.len, 10);
      }));
    document.getElementById("blStart").addEventListener("click", () => {
      // Bygg session av element (adaptivt viktat, inga direktrepetitioner).
      const pool = Engine.allElements();
      const chosen = [];
      let last = null;
      for (let i = 0; i < len; i++) {
        const el = Engine.pickWeighted(pool, last);
        last = el.number; chosen.push(el);
      }
      app.blind = { list: chosen, index: 0, score: 0, results: [] };
      Blind.renderQ.call(app);
    });
  },

  renderQ() {
    const app = this;
    const b = app.blind;
    if (b.index >= b.list.length) {
      Results.show.call(app, {
        label: "Skriv allt", score: b.score, total: b.list.length,
        results: b.results, grade: false, quizDone: true
      });
      return;
    }
    const el = b.list[b.index];
    // Slumpa vilken sida som visas: namn -> skriv formel, eller formel -> skriv namn.
    const showName = Math.random() < 0.5;
    const pct = Math.round((b.index / b.list.length) * 100);

    let shownLabel, shownValue, fields;
    if (showName) {
      shownLabel = "Jon (namn)"; shownValue = el.name;
      fields = [{ key: "symbol", label: "Formel", answer: el.symbol, placeholder: "t.ex. SO4 2-" }];
    } else {
      shownLabel = "Formel"; shownValue = el.symbol;
      fields = [{ key: "name", label: "Jon (namn)", answer: el.name, placeholder: "Skriv jonens namn" }];
    }

    const fieldHtml = fields.map((f, i) => `
      <div class="field-row">
        <label>${f.label}</label>
        <input data-i="${i}" type="text" inputmode="text"
               autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="${f.placeholder}" />
        <div class="sol" data-sol="${i}"></div>
      </div>`).join("");

    app.html(`
      <section class="view">
        <div class="quiz-head">
          <div class="quiz-progress"><span style="width:${pct}%"></span></div>
          <div class="quiz-meta"><span>Skriv allt</span><span>${b.index + 1}/${b.list.length}</span></div>
        </div>
        <div class="q-type-tag">Fyll i på blindo</div>
        <div class="question-card">
          <div class="q-prompt">${shownLabel}</div>
          <div class="q-focus">${shownValue}</div>
        </div>
        <div class="multi-fields" id="mf">${fieldHtml}</div>
        <div id="fb"></div>
      </section>`);

    const inputs = [...app.root.querySelectorAll("#mf input")];
    setTimeout(() => inputs[0] && inputs[0].focus(), 50);
    inputs.forEach((inp, idx) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (idx < inputs.length - 1) inputs[idx + 1].focus();
          else submit();
        }
      });
    });

    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-block";
    btn.style.marginTop = "8px";
    btn.textContent = "Rätta";
    document.getElementById("mf").appendChild(btn);

    let answered = false;
    const submit = () => {
      if (answered) return;
      answered = true;
      let allCorrect = true;
      const givenParts = [];
      fields.forEach((f, i) => {
        const inp = inputs[i];
        let ok;
        if (f.key === "symbol") ok = Engine.checkSymbol(inp.value, f.answer);
        else ok = Engine.checkName(inp.value, f.answer);
        inp.disabled = true;
        inp.classList.add(ok ? "correct" : "wrong");
        const sol = app.root.querySelector(`[data-sol="${i}"]`);
        if (ok) { sol.className = "sol good"; sol.textContent = "✅ Rätt"; }
        else { sol.className = "sol bad"; sol.textContent = `❌ Rätt: ${f.answer}`; }
        if (!ok) allCorrect = false;
        givenParts.push(inp.value || "—");
      });
      btn.remove();

      // Registrera resultat (ett ämne = rätt om alla fält rätt).
      if (allCorrect) b.score++;
      b.results.push({
        element: el, tag: "Skriv allt", prompt: shownLabel, focus: shownValue,
        given: givenParts.join(" / "), answer: `${el.name} = ${el.symbol}`, correct: allCorrect
      });
      app.applyAnswer({ element: el }, allCorrect, true);

      const fb = document.getElementById("fb");
      fb.innerHTML = allCorrect ? `
        <div class="feedback ok"><div class="fb-title">✅ Rätt!</div>
        <div class="fb-body"><b>${el.name} = ${el.symbol}</b></div></div>` : `
        <div class="feedback no"><div class="fb-title">❌ Inte rätt</div>
        <div class="fb-body">Rätt svar: <b>${el.name} = ${el.symbol}</b></div>
        ${el.hint ? `<div class="fb-remember">${el.hint}</div>` : ""}</div>`;
      const next = document.createElement("button");
      next.className = "btn btn-primary btn-block";
      next.style.marginTop = "14px";
      next.textContent = b.index + 1 >= b.list.length ? "Se resultat →" : "Nästa →";
      next.addEventListener("click", () => { b.index++; Blind.renderQ.call(app); });
      fb.appendChild(next);
      next.focus();
    };
    btn.addEventListener("click", submit);
  }
};

// ==========================================================================
// MINIQUIZ – 4 korta omgångar (7 joner var). En fråga per jon. Gå igenom allt.
// ==========================================================================
const MiniQuiz = {
  start(index, tour) {
    const app = this;
    const g = MINI_GROUPS[index];
    const types = ["sym2name", "name2sym", "write"];
    const els = Engine.shuffle(g.nums.map((n) => Engine.byNumber(n)));
    const questions = els.map((el, i) => Engine.buildQuestion(el, types[i % types.length]));
    Quiz.startFixed.call(app, {
      label: tour ? `Miniquiz ${index + 1}/4` : g.label,
      questions,
      miniIndex: index,
      miniTour: !!tour
    });
  }
};

// ==========================================================================
// TABLE – "Fyll i tabellen": alla 20 uppradade, göm kolumner, skriv in, rätta
// ==========================================================================
const Table = {
  start() {
    const app = this;
    // Behåll ev. tidigare inställningar, annars göm formeln som standard.
    app.tableState = app.tableState || {
      hide: { name: false, symbol: true },
      shuffled: false
    };
    Table.build.call(app);
  },

  order() {
    return this.tableState.shuffled ? Engine.shuffle(ELEMENTS) : ELEMENTS.slice();
  },

  build() {
    const app = this;
    const s = app.tableState;
    s.rows = Table.order.call(app);
    s.graded = {}; // number -> 'correct' | 'wrong'

    const pill = (field, label) =>
      `<button class="pill ${s.hide[field] ? "active" : ""}" data-hide="${field}">🙈 ${label}</button>`;

    const anyHidden = s.hide.name || s.hide.symbol;

    app.html(`
      <section class="view">
        <div class="hero" style="padding-bottom:2px;"><h1>📋 Fyll i tabellen</h1></div>
        <p class="hide-hint">Välj vad som ska gömmas – skriv sedan in det som saknas och tryck <b>Rätta</b>. Formler kan skrivas som t.ex. <b>SO4 2-</b> eller <b>H3O+</b>.</p>

        <div class="tbl-toolbar">
          <div class="pill-row">
            ${pill("name", "Göm jon")}
            ${pill("symbol", "Göm formel")}
          </div>
          <div class="pill-row">
            <button class="pill" id="tblShuffle">🔀 Blanda</button>
            <button class="pill" id="tblClear">↺ Rensa</button>
          </div>
          <div class="tbl-score" id="tblScore"></div>
          <button class="btn btn-green btn-block" id="tblCheck" ${anyHidden ? "" : "disabled style=\"opacity:.5\""}>✅ Rätta</button>
        </div>

        <div class="tbl-head"><span></span><span>Jon</span><span>Formel</span></div>
        <div class="tbl" id="tblBody">${Table.rowsHtml.call(app)}</div>
        <div class="spacer"></div>
        <button class="btn btn-dark btn-block" id="tblHome">🏠 Till start</button>
      </section>
    `);

    // Toggla göm-kolumner.
    app.root.querySelectorAll("[data-hide]").forEach((b) =>
      b.addEventListener("click", () => {
        const f = b.dataset.hide;
        s.hide[f] = !s.hide[f];
        Table.build.call(app);
      }));

    document.getElementById("tblShuffle").addEventListener("click", () => {
      s.shuffled = true; Table.build.call(app);
    });
    document.getElementById("tblClear").addEventListener("click", () => {
      Table.build.call(app);
    });
    document.getElementById("tblHome").addEventListener("click", () => app.go("home"));

    const checkBtn = document.getElementById("tblCheck");
    if (!checkBtn.disabled) checkBtn.addEventListener("click", () => Table.check.call(app));

    // Enter i ett fält hoppar till nästa tomma inmatningsfält.
    const inputs = [...app.root.querySelectorAll(".cell-input")];
    inputs.forEach((inp, i) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const next = inputs.slice(i + 1).find((x) => !x.disabled);
          if (next) next.focus(); else Table.check.call(app);
        }
      });
    });
    if (inputs[0]) setTimeout(() => inputs[0].focus(), 60);
  },

  rowsHtml() {
    const app = this;
    const s = app.tableState;
    return s.rows.map((el) => {
      const cell = (field) => {
        if (!s.hide[field]) {
          if (field === "name") return `<div class="cell name-cell">${el.name}</div>`;
          return `<div class="cell">${el.symbol}</div>`;
        }
        const ph = field === "symbol" ? "formel" : "jon";
        return `<input class="cell-input" data-num="${el.number}" data-field="${field}"
                  type="text" inputmode="text" placeholder="${ph}"
                  autocomplete="off" autocapitalize="off" spellcheck="false" />`;
      };
      return `<div class="tbl-row" data-num="${el.number}">
        <div class="rownum">${el.number}</div>
        ${cell("name")}${cell("symbol")}
      </div>`;
    }).join("");
  },

  check() {
    const app = this;
    const s = app.tableState;
    let correctCount = 0, totalElements = s.rows.length, allFilled = true;

    s.rows.forEach((el) => {
      // Redan låst som rätt? Hoppa över.
      if (s.graded[el.number] === "correct") { correctCount++; return; }

      const inputs = [...app.root.querySelectorAll(`.cell-input[data-num="${el.number}"]`)];
      let elOk = true;
      inputs.forEach((inp) => {
        const field = inp.dataset.field;
        let ok;
        if (field === "symbol") ok = Engine.checkSymbol(inp.value, el.symbol);
        else ok = Engine.checkName(inp.value, el.name);

        if (inp.value.trim() === "") allFilled = false;
        inp.classList.remove("correct", "wrong");
        if (ok) {
          inp.classList.add("correct");
        } else {
          inp.classList.add("wrong");
          elOk = false;
        }
      });

      if (inputs.length === 0) { correctCount++; return; } // inget gömt på raden

      if (elOk) {
        // Rätt: lås fälten gröna. Registrera kunskap en gång.
        inputs.forEach((inp) => { inp.disabled = true; });
        correctCount++;
        if (s.graded[el.number] !== "correct") {
          app.applyAnswer({ element: el }, true, true);
        }
        s.graded[el.number] = "correct";
      } else {
        // Fel: lämna kvar för att göra om. Registrera fel en gång per session.
        if (s.graded[el.number] !== "wrong") {
          app.applyAnswer({ element: el }, false, false);
        }
        s.graded[el.number] = "wrong";
      }
    });

    const scoreEl = document.getElementById("tblScore");
    scoreEl.innerHTML = `<span class="ok">${correctCount}</span> / ${totalElements} rätt`;

    if (correctCount === totalElements) {
      scoreEl.innerHTML += " 🎉 Alla rätt!";
      app.burst();
      app.toast("🎉 Alla rätt i tabellen!");
    } else {
      const wrong = totalElements - correctCount;
      app.toast(`${wrong} kvar att fixa – gör om de röda 🔴`);
      // Fokusera första felaktiga fältet.
      const firstWrong = app.root.querySelector(".cell-input.wrong");
      if (firstWrong) setTimeout(() => firstWrong.focus(), 50);
    }
  }
};

// ==========================================================================
// FINAL TEST – "Kan jag alla 20?"
// ==========================================================================
const FinalTest = {
  build() {
    // Täck alla joner åt båda hållen: formel -> jon och jon -> formel.
    const types = ["sym2name", "name2sym"];
    const qs = ELEMENTS.map((el, i) => Engine.buildQuestion(el, types[i % types.length]));
    return Engine.shuffle(qs);
  }
};

// ==========================================================================
// RESULTS – resultat, analys, betyg
// ==========================================================================
const Results = {
  show(cfg) {
    const app = this;
    const { label, score, total, results } = cfg;
    const pct = app.saveResult(label, score, total);

    // Perfekt quiz -> bonus.
    let perfect = score === total && total > 0;
    if (perfect) { app.award(25); }

    // Analys: bäst på / träna extra på (utifrån detta pass).
    const correctEls = [], wrongEls = [];
    const seen = {};
    results.forEach((r) => {
      const n = r.element.number;
      if (!seen[n]) seen[n] = { el: r.element, ok: 0, no: 0 };
      if (r.correct) seen[n].ok++; else seen[n].no++;
    });
    Object.values(seen).forEach((v) => {
      if (v.no > 0) wrongEls.push(v.el); else correctEls.push(v.el);
    });
    // Fyll upp med globala starkaste/svagaste om listorna är korta.
    const bestNames = correctEls.slice(0, 3).map((e) => e.name);
    const trainNames = wrongEls.slice(0, 3).map((e) => e.name);

    // Betyg (skalat till 20).
    let gradeBlock = "";
    if (cfg.grade) {
      const g = Results.grade(score, total);
      gradeBlock = `<div class="grade-emj">${g.emoji}</div>`;
      var gradeLabel = g.label;
    }

    // Sluttest – godkänt?
    let finalBanner = "";
    let knowAll = false;
    if (cfg.isFinal) {
      if (pct >= 90) {
        knowAll = true;
        finalBanner = `
          <div class="feedback ok" style="text-align:center;">
            <div class="fb-title" style="font-size:26px;">🎉 DU KAN ALLA ${TOTAL}!</div>
            <div class="fb-body">Du är redo för läxförhöret. Snyggt jobbat!</div>
          </div>`;
      } else {
        finalBanner = `
          <div class="feedback no" style="text-align:center;">
            <div class="fb-title">Nästan där!</div>
            <div class="fb-body">Du behöver minst 90 %. Träna lite till på dina svaga joner och testa igen. 💪</div>
          </div>`;
      }
    }

    const emoji = perfect ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📚";

    app.html(`
      <section class="view">
        <div class="result-hero">
          ${cfg.grade ? gradeBlock : `<div class="grade-emj">${emoji}</div>`}
          <div class="score">${score} / ${total}</div>
          <div class="pct">${pct}%</div>
          ${cfg.grade ? `<div class="grade-label">${gradeLabel}</div>` : ""}
        </div>

        ${finalBanner}
        ${cfg.miniTourDone ? `
          <div class="feedback ok" style="text-align:center;">
            <div class="fb-title">🎉 Du har gått igenom alla ${TOTAL}!</div>
            <div class="fb-body">Alla fyra miniquiz är klara. Snyggt jobbat.</div>
          </div>` : ""}

        <div class="result-lists">
          <div class="box good"><h4>✅ Du är bäst på</h4><ul>${
            (bestNames.length ? bestNames : ["–"]).map((n) => `<li>${n}</li>`).join("")
          }</ul></div>
          <div class="box bad"><h4>📌 Träna extra på</h4><ul>${
            (trainNames.length ? trainNames : ["Inget! Toppen 🎉"]).map((n) => `<li>${n}</li>`).join("")
          }</ul></div>
        </div>

        <div class="section-title">Dina svar</div>
        <div class="answer-review">${
          results.map((r) => `
            <div class="review-row">
              <span class="rmark">${r.correct ? "✅" : "❌"}</span>
              <span class="rq">${r.tag}: ${r.focus}</span>
              <span class="ra">${r.element.name} = ${r.element.symbol}</span>
            </div>`).join("")
        }</div>

        <div class="spacer"></div>
        <div style="display:grid;gap:12px;">
          ${cfg.miniNext != null ? `<button class="big-final-btn" id="nextMini">Nästa: ${MINI_GROUPS[cfg.miniNext].label} →</button>` : ""}
          ${cfg.miniTourDone ? `<button class="btn btn-solid btn-block" id="restartTour">🧩 Börja om från Mini 1</button>` : ""}
          ${Store.mistakeList().length ? `<button class="btn btn-solid btn-block" id="doMiss">🔁 Gör om felen (${Store.mistakeList().length})</button>` : ""}
          ${trainNames.length ? `<button class="btn btn-block" id="trainWeak">🎯 Träna på mina svaga joner</button>` : ""}
          <button class="btn btn-block" id="again">↻ Kör igen</button>
          <button class="btn btn-block" id="home2">🏠 Till start</button>
        </div>
      </section>
    `);

    // Achievements-koll (inkl. sluttest).
    app.evalAchievements({ quizDone: cfg.quizDone, perfect, knowAll });

    if (perfect || knowAll || pct >= 90) app.burst();

    const nm = document.getElementById("nextMini");
    if (nm) nm.addEventListener("click", () => MiniQuiz.start.call(app, cfg.miniNext, true));
    const rt = document.getElementById("restartTour");
    if (rt) rt.addEventListener("click", () => MiniQuiz.start.call(app, 0, true));
    const dm = document.getElementById("doMiss");
    if (dm) dm.addEventListener("click", () => app.go("mistakes"));
    const tw = document.getElementById("trainWeak");
    if (tw) tw.addEventListener("click", () => app.go("review"));
    document.getElementById("again").addEventListener("click", () => {
      if (label && String(label).indexOf("Miniquiz") === 0) {
        if (cfg.miniIndex != null) MiniQuiz.start.call(app, cfg.miniIndex, false);
        else app.go("miniquiz");
        return;
      }
      const map = { "Snabbquiz": "quiz", "Repetera svåra": "review", "Prov imorgon": "examtomorrow",
                    "Snabbtest": "quicktest", "Prov-simulering": "examsim", "Sluttest": "finaltest",
                    "Skriv allt": "blind", "Gör om fel": "mistakes" };
      app.go(map[label] || "home");
    });
    document.getElementById("home2").addEventListener("click", () => app.go("home"));
  },

  grade(score, total) {
    const s = Math.round((score / total) * 20); // skala till 20
    if (s >= 18) return { emoji: "🏆", label: "Mästarnivå!" };
    if (s >= 15) return { emoji: "🔥", label: "Mycket bra!" };
    if (s >= 12) return { emoji: "👍", label: "Bra!" };
    if (s >= 8)  return { emoji: "📚", label: "Behöver träna mer" };
    return { emoji: "💪", label: "Börja med lärläget" };
  }
};

// ==========================================================================
// PROGRESS – Min utveckling
// ==========================================================================
const Progress = {
  render() {
    const app = this;
    const d = Store.data;
    const mastered = Store.masteredCount();
    const pct = Math.round((mastered / TOTAL) * 100);
    const hardest = Engine.weakestElements(5);

    const achHtml = ACHIEVEMENTS.map((a) => {
      const on = !!d.achievements[a.id];
      return `<div class="ach ${on ? "unlocked" : ""}">
        <div class="a-emj">${a.emoji}</div>
        <div class="a-name">${a.name}</div>
        <div class="a-desc">${a.desc}</div>
      </div>`;
    }).join("");

    const hardHtml = hardest.map((e) => {
      const st = Store.el(e.number);
      return `<div class="hard-row">
        <span class="hs">${e.symbol}</span>
        <span class="hn">${e.name}</span>
        <span class="hstars">${app.stars(st.level)}</span>
      </div>`;
    }).join("");

    const resultsHtml = d.lastResults.length ? d.lastResults.map((r) => `
      <div class="hard-row">
        <span class="hn">${r.label}</span>
        <span class="ra" style="font-weight:700">${r.score}/${r.total} · ${r.pct}%</span>
      </div>`).join("") : `<div class="mode-desc">Inga quiz gjorda än.</div>`;

    app.html(`
      <section class="view">
        <div class="hero"><h1>Min utveckling</h1></div>

        <div class="mastery-card">
          <div class="row"><h3>Behärskade joner</h3><span class="count">${mastered}/${TOTAL}</span></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
        </div>

        <div class="stat-cards">
          <div class="sc"><div class="v">${d.totalCorrect}</div><div class="k">Rätt totalt</div></div>
          <div class="sc"><div class="v">${d.totalWrong}</div><div class="k">Fel totalt</div></div>
          <div class="sc"><div class="v">🔥 ${d.bestStreak}</div><div class="k">Bästa streak</div></div>
          <div class="sc"><div class="v">${d.xp}</div><div class="k">XP</div></div>
          <div class="sc"><div class="v">Nv ${d.level}</div><div class="k">Nivå</div></div>
          <div class="sc"><div class="v">${d.quizzesCompleted}</div><div class="k">Quiz gjorda</div></div>
        </div>

        <div class="section-title">Märken</div>
        <div class="ach-grid">${achHtml}</div>

        <div class="section-title">Svåraste joner</div>
        <div class="hard-list">${hardHtml}</div>

        <div class="section-title">Senaste resultat</div>
        <div class="hard-list">${resultsHtml}</div>

        <div class="spacer"></div>
        <button class="btn btn-amber btn-block" id="pTrain">🎯 Träna på mina svaga joner</button>
      </section>
    `);
    document.getElementById("pTrain").addEventListener("click", () => app.go("review"));
  }
};
