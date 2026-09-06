// ==========================================================================
// modes.js: Alla lägen – Learn, Quiz, Blind, FinalTest, Progress, Results.
// "this" i metoderna = App (anropas med .call(App, ...)).
// ==========================================================================

// ---------- Delad frågekort-renderare ----------
function renderQuestionCard(q) {
  let focusHtml = `<div class="q-focus">${q.focus}</div>`;
  let prompt = q.prompt;
  // Snygg formulering
  let sub = "";
  if (q.type === "num2name" || q.type === "num2sym") {
    prompt = q.prompt; // "... atomnummer" / "... nummer"
  }
  return `
    <div class="q-type-tag">${q.tag}</div>
    <div class="question-card">
      <div class="q-prompt">${prompt}</div>
      ${focusHtml}
      <div class="q-sub">${sub}</div>
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
    input.type = q.inputType === "number" ? "number" : "text";
    input.inputMode = q.inputType === "number" ? "numeric" : "text";
    input.placeholder = q.inputType === "number" ? "Skriv ett nummer" : "Skriv ditt svar";
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
  start() {
    const app = this;
    // Ordna: markerade svåra + låg nivå först, annars nummerordning.
    this.learnQueue = ELEMENTS.slice().sort((a, b) => a.number - b.number);
    this.learnIndex = 0;
    Learn.renderCard.call(app);
  },

  renderCard() {
    const app = this;
    const total = app.learnQueue.length;
    if (app.learnIndex >= total) {
      // Klart – erbjud quiz.
      app.html(`
        <section class="view center-col">
          <div class="hero"><h1>Genomgång klar! 🎉</h1></div>
          <p class="mode-desc">Du har gått igenom alla korten.<br>Nu är det dags att testa dig själv.</p>
          <div style="width:100%;max-width:420px;display:grid;gap:12px;">
            <button class="btn btn-accent btn-block" id="toQuiz">⚡ Kör ett quiz</button>
            <button class="btn btn-green btn-block" id="toBlind">✍️ Skriv allt</button>
            <button class="btn btn-dark btn-block" id="toHome">🏠 Till start</button>
          </div>
        </section>`);
      document.getElementById("toQuiz").addEventListener("click", () => app.go("quiz"));
      document.getElementById("toBlind").addEventListener("click", () => app.go("blind"));
      document.getElementById("toHome").addEventListener("click", () => app.go("home"));
      return;
    }
    const el = app.learnQueue[app.learnIndex];
    const st = Store.el(el.number);
    const pct = Math.round((app.learnIndex / total) * 100);

    app.html(`
      <section class="view center-col">
        <div class="progress-mini">
          <div class="lbl">Kort ${app.learnIndex + 1} av ${total}</div>
          <div class="progress"><span style="width:${pct}%"></span></div>
        </div>
        <div class="el-card">
          <div class="num">${el.number}</div>
          <div class="num-r">${Learn.starText(st.level)}</div>
          <div class="sym">${el.symbol}</div>
          <div class="name">${el.name}</div>
        </div>
        <div class="hint-box"><b>${el.symbol} → ${el.name}</b><br>${el.hint}</div>
        <div class="learn-actions">
          <button class="btn btn-amber" id="hard"><span class="emj">📌</span><span>Behöver träna mer</span></button>
          <button class="btn btn-green" id="know"><span class="emj">✅</span><span>Jag kan den</span></button>
        </div>
      </section>
    `);

    document.getElementById("know").addEventListener("click", () => {
      st.markedHard = false;
      // Räknas som ett svagt "rätt" – höj lite men inte till mästrad direkt.
      if (st.level < 3) st.level++;
      st.seen++;
      Store.save();
      app.award(2);
      app.learnIndex++;
      Learn.renderCard.call(app);
    });
    document.getElementById("hard").addEventListener("click", () => {
      st.markedHard = true;
      st.level = Math.max(0, st.level - 1);
      st.due = Store.data.answeredCount; // snart igen
      Store.save();
      app.toast("Sparad som svår – vi tränar den mer 📌");
      app.learnIndex++;
      Learn.renderCard.call(app);
    });
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

  nextAdaptive() {
    const app = this;
    const s = app.session;
    if (s.index >= s.length) {
      Results.show.call(app, {
        label: s.label, score: s.score, total: s.length,
        results: s.results, grade: false, quizDone: true
      });
      return;
    }
    const el = Engine.pickWeighted(s.pool, s.lastNum);
    s.lastNum = el.number;
    const type = Engine.pickType(el, { forceMix: s.forceMix, testMode: false });
    const q = Engine.buildQuestion(el, type);
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
        <div class="fb-body"><b>${el.symbol} = ${el.name}</b> · atomnummer ${el.number}</div>
      </div>` : `
      <div class="feedback no">
        <div class="fb-title">❌ Inte riktigt</div>
        <div class="fb-body">Du svarade: <b>${given}</b><br>Rätt svar är: <b>${el.symbol} = ${el.name}</b> (nr ${el.number})</div>
        <div class="fb-remember">Kom ihåg: <b>${el.symbol} → ${el.name}</b>. ${el.hint}</div>
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
        <p class="mode-desc">Du ser <b>en</b> uppgift (t.ex. namnet) och skriver de andra två själv – helt på blindo.<br>Ser du <b>Väte</b> skriver du symbol <b>H</b> och atomnummer <b>1</b>. Och tvärtom.</p>
        <div class="pill-row" id="blLen">
          <button class="pill active" data-len="10">10 ämnen</button>
          <button class="pill" data-len="20">Alla 20</button>
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
    // Slumpa vilken sida som visas: 0=namn, 1=symbol, 2=nummer.
    const show = Math.floor(Math.random() * 3);
    const pct = Math.round((b.index / b.list.length) * 100);

    let shownLabel, shownValue, fields;
    if (show === 0) {
      shownLabel = "Namn"; shownValue = el.name;
      fields = [{ key: "symbol", label: "Symbol", answer: el.symbol, type: "text" },
                { key: "number", label: "Atomnummer", answer: String(el.number), type: "number" }];
    } else if (show === 1) {
      shownLabel = "Symbol"; shownValue = el.symbol;
      fields = [{ key: "name", label: "Namn", answer: el.name, type: "text" },
                { key: "number", label: "Atomnummer", answer: String(el.number), type: "number" }];
    } else {
      shownLabel = "Atomnummer"; shownValue = String(el.number);
      fields = [{ key: "symbol", label: "Symbol", answer: el.symbol, type: "text" },
                { key: "name", label: "Namn", answer: el.name, type: "text" }];
    }

    const fieldHtml = fields.map((f, i) => `
      <div class="field-row">
        <label>${f.label}</label>
        <input data-i="${i}" type="${f.type === "number" ? "number" : "text"}"
               inputmode="${f.type === "number" ? "numeric" : "text"}"
               autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="Skriv ${f.label.toLowerCase()}" />
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
        if (f.type === "number") ok = Engine.checkNumber(inp.value, el.number);
        else if (f.key === "symbol") ok = Engine.checkSymbol(inp.value, f.answer);
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
        given: givenParts.join(" / "), answer: `${el.symbol} · ${el.name} · ${el.number}`, correct: allCorrect
      });
      app.applyAnswer({ element: el }, allCorrect, true);

      const fb = document.getElementById("fb");
      fb.innerHTML = allCorrect ? `
        <div class="feedback ok"><div class="fb-title">✅ Helt rätt!</div>
        <div class="fb-body"><b>${el.symbol} = ${el.name}</b> · atomnummer ${el.number}</div></div>` : `
        <div class="feedback no"><div class="fb-title">❌ Inte helt rätt</div>
        <div class="fb-body">Rätt svar: <b>${el.symbol} = ${el.name}</b> · atomnummer <b>${el.number}</b></div>
        <div class="fb-remember">${el.hint}</div></div>`;
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
// TABLE – "Fyll i tabellen": alla 20 uppradade, göm kolumner, skriv in, rätta
// ==========================================================================
const Table = {
  start() {
    const app = this;
    // Behåll ev. tidigare inställningar, annars göm symbol som standard.
    app.tableState = app.tableState || {
      hide: { name: false, symbol: true, number: false },
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

    const anyHidden = s.hide.name || s.hide.symbol || s.hide.number;

    app.html(`
      <section class="view">
        <div class="hero" style="padding-bottom:2px;"><h1>📋 Fyll i tabellen</h1></div>
        <p class="hide-hint">Välj vad som ska gömmas – skriv sedan in det som saknas och tryck <b>Rätta</b>.</p>

        <div class="tbl-toolbar">
          <div class="pill-row">
            ${pill("name", "Göm namn")}
            ${pill("symbol", "Göm symbol")}
            ${pill("number", "Göm atomnr")}
          </div>
          <div class="pill-row">
            <button class="pill" id="tblShuffle">🔀 Blanda</button>
            <button class="pill" id="tblClear">↺ Rensa</button>
          </div>
          <div class="tbl-score" id="tblScore"></div>
          <button class="btn btn-green btn-block" id="tblCheck" ${anyHidden ? "" : "disabled style=\"opacity:.5\""}>✅ Rätta</button>
        </div>

        <div class="tbl-head"><span></span><span>Namn</span><span>Symbol</span><span>Atomnr</span></div>
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
          if (field === "symbol") return `<div class="cell">${el.symbol}</div>`;
          return `<div class="cell">${el.number}</div>`;
        }
        const numeric = field === "number";
        return `<input class="cell-input" data-num="${el.number}" data-field="${field}"
                  type="${numeric ? "number" : "text"}" inputmode="${numeric ? "numeric" : "text"}"
                  autocomplete="off" autocapitalize="off" spellcheck="false" />`;
      };
      return `<div class="tbl-row" data-num="${el.number}">
        <div class="rownum">${el.number}</div>
        ${cell("name")}${cell("symbol")}${cell("number")}
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
        if (field === "number") ok = Engine.checkNumber(inp.value, el.number);
        else if (field === "symbol") ok = Engine.checkSymbol(inp.value, el.symbol);
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
    // Täck alla 20 ämnen, och alla fyra krävda frågetyper jämnt fördelat.
    const types = ["sym2name", "name2sym", "num2name", "name2num"];
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
            <div class="fb-title" style="font-size:26px;">🎉 DU KAN ALLA 20!</div>
            <div class="fb-body">Du är redo för läxförhöret. Snyggt jobbat!</div>
          </div>`;
      } else {
        finalBanner = `
          <div class="feedback no" style="text-align:center;">
            <div class="fb-title">Nästan där!</div>
            <div class="fb-body">Du behöver minst 18/20. Träna lite till på dina svaga ämnen och testa igen. 💪</div>
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
              <span class="ra">${r.element.symbol}=${r.element.name} (${r.element.number})</span>
            </div>`).join("")
        }</div>

        <div class="spacer"></div>
        <div style="display:grid;gap:12px;">
          ${trainNames.length ? `<button class="btn btn-amber btn-block" id="trainWeak">🎯 Träna på mina svaga ämnen</button>` : ""}
          <button class="btn btn-accent btn-block" id="again">🔁 Kör igen</button>
          <button class="btn btn-dark btn-block" id="home2">🏠 Till start</button>
        </div>
      </section>
    `);

    // Achievements-koll (inkl. sluttest).
    app.evalAchievements({ quizDone: cfg.quizDone, perfect, knowAll });

    if (perfect || knowAll || pct >= 90) app.burst();

    const tw = document.getElementById("trainWeak");
    if (tw) tw.addEventListener("click", () => app.go("review"));
    document.getElementById("again").addEventListener("click", () => {
      // Kör samma läge igen om möjligt.
      const map = { "Snabbquiz": "quiz", "Repetera svåra": "review", "Prov imorgon": "examtomorrow",
                    "Snabbtest": "quicktest", "Prov-simulering": "examsim", "Kan jag alla 20": "finaltest",
                    "Skriv allt": "blind" };
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
    const pct = Math.round((mastered / 20) * 100);
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
        <span class="hn">${e.name} <span style="color:var(--muted);font-size:12px">#${e.number}</span></span>
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
          <div class="row"><h3>Behärskade grundämnen</h3><span class="count">${mastered}/20</span></div>
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

        <div class="section-title">Svåraste grundämnen</div>
        <div class="hard-list">${hardHtml}</div>

        <div class="section-title">Senaste resultat</div>
        <div class="hard-list">${resultsHtml}</div>

        <div class="spacer"></div>
        <button class="btn btn-amber btn-block" id="pTrain">🎯 Träna på mina svaga ämnen</button>
      </section>
    `);
    document.getElementById("pTrain").addEventListener("click", () => app.go("review"));
  }
};
