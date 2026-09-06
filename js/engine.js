// ==========================================================================
// Engine: quizmotor, slumpning, spaced repetition, adaptiv svårighet, XP.
// ==========================================================================

const Engine = {
  // ---- Hjälpfunktioner ----
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  byNumber(n) { return ELEMENTS.find((e) => e.number === n); },

  // Normalisera svar: trimma, ta bort extra mellanslag, gemener.
  normalize(str) {
    return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  },

  // Kontrollera symbol (rätt case ignoreras – "na", "NA", "Na" godkänns).
  checkSymbol(input, correct) {
    return this.normalize(input) === this.normalize(correct);
  },
  checkName(input, correct) {
    return this.normalize(input) === this.normalize(correct);
  },
  checkNumber(input, correct) {
    const n = parseInt((input || "").toString().trim(), 10);
    return n === correct;
  },

  // ---- Adaptivt urval av grundämne ----
  // Svåra ämnen (låg nivå / mycket fel) får högre vikt = visas oftare.
  weightFor(el) {
    const st = Store.el(el.number);
    // Basvikt: lägre nivå -> högre vikt.
    let w = (MAX_LEVEL - st.level) + 1;      // 1..6
    // Extra vikt för ämnen med dålig träffsäkerhet.
    const total = st.correct + st.wrong;
    if (total > 0) {
      const errRate = st.wrong / total;
      w += errRate * 4;
    }
    // Ämnen som ännu inte setts får lite extra så de kommer in.
    if (st.seen === 0) w += 1.5;
    // "Due"-bonus: ämnen som är förfallna i SRS-kön prioriteras.
    if (st.due <= Store.data.answeredCount) w += 1.5;
    return Math.max(0.2, w);
  },

  // Vikta slumpval bland en pool av element (utan direkt upprepning om möjligt).
  pickWeighted(pool, avoidNumber) {
    let candidates = pool;
    if (avoidNumber != null && pool.length > 1) {
      candidates = pool.filter((e) => e.number !== avoidNumber);
    }
    const weights = candidates.map((e) => this.weightFor(e));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  },

  // ---- Frågetyper ----
  // 1 symbol->namn (mc), 2 namn->symbol (mc), 3 atomnr->namn (mc),
  // 4 namn->atomnr (typ), 5 symbol->atomnr (typ), 6 atomnr->symbol (mc/typ),
  // 7 skriv själv (typ, symbol/namn)
  ALL_TYPES: ["sym2name", "name2sym", "num2name", "name2num", "sym2num", "num2sym", "write"],

  // Välj frågetyp adaptivt beroende på ämnets nivå.
  pickType(el, opts) {
    opts = opts || {};
    if (opts.forceMix) return this.rand(this.ALL_TYPES);

    const st = Store.el(el.number);
    const lvl = st.level;

    // Låg nivå -> mest flerval. Hög nivå -> mer skriv-själv / atomnummer.
    let mcTypes = ["sym2name", "name2sym", "num2name", "num2sym"];
    let typeTypes = ["name2num", "sym2num", "write"];

    let pMc; // sannolikhet för flervalsfråga
    if (lvl <= 1) pMc = 0.85;
    else if (lvl === 2) pMc = 0.65;
    else if (lvl === 3) pMc = 0.45;
    else pMc = 0.2;

    if (opts.testMode) pMc = 0.5; // snabbtest: blandat

    return Math.random() < pMc ? this.rand(mcTypes) : this.rand(typeTypes);
  },

  // Bygg en fråga för ett givet element och typ.
  buildQuestion(el, type) {
    const q = { element: el, type, isMulti: false };
    const distractors = (getVal) => {
      const others = this.shuffle(ELEMENTS.filter((e) => e.number !== el.number)).slice(0, 3);
      const opts = this.shuffle([el].concat(others));
      return opts.map(getVal);
    };

    switch (type) {
      case "sym2name":
        q.prompt = "Vad heter grundämnet med symbolen";
        q.focus = el.symbol;
        q.answer = el.name;
        q.options = distractors((e) => ({ label: e.name, value: e.name, correct: e.number === el.number }));
        q.tag = "Symbol → namn";
        break;
      case "name2sym":
        q.prompt = "Vilken symbol har";
        q.focus = el.name;
        q.answer = el.symbol;
        q.options = distractors((e) => ({ label: e.symbol, value: e.symbol, correct: e.number === el.number }));
        q.tag = "Namn → symbol";
        break;
      case "num2name":
        q.prompt = "Vilket grundämne har atomnummer";
        q.focus = String(el.number);
        q.answer = el.name;
        q.options = distractors((e) => ({ label: e.name, value: e.name, correct: e.number === el.number }));
        q.tag = "Atomnummer → namn";
        break;
      case "num2sym":
        q.prompt = "Vilken symbol har grundämne nummer";
        q.focus = String(el.number);
        q.answer = el.symbol;
        q.options = distractors((e) => ({ label: e.symbol, value: e.symbol, correct: e.number === el.number }));
        q.tag = "Atomnummer → symbol";
        break;
      case "name2num":
        q.prompt = "Vilket atomnummer har";
        q.focus = el.name;
        q.answer = String(el.number);
        q.inputType = "number";
        q.tag = "Namn → atomnummer";
        break;
      case "sym2num":
        q.prompt = "Vilket atomnummer har";
        q.focus = el.symbol;
        q.answer = String(el.number);
        q.inputType = "number";
        q.tag = "Symbol → atomnummer";
        break;
      case "write":
        // Skriv själv – slumpa mellan symbol och namn.
        if (Math.random() < 0.5) {
          q.prompt = "Vilken symbol har";
          q.focus = el.name;
          q.answer = el.symbol;
          q.inputType = "text";
          q.checkKind = "symbol";
        } else {
          q.prompt = "Vad heter grundämnet";
          q.focus = el.symbol;
          q.answer = el.name;
          q.inputType = "text";
          q.checkKind = "name";
        }
        q.tag = "Skriv själv";
        break;
    }
    return q;
  },

  // Kontrollera ett svar mot en fråga.
  checkAnswer(q, given) {
    if (q.type === "name2num" || q.type === "sym2num") {
      return this.checkNumber(given, q.element.number);
    }
    if (q.type === "write") {
      if (q.checkKind === "symbol") return this.checkSymbol(given, q.element.symbol);
      return this.checkName(given, q.element.name);
    }
    // flerval
    return this.normalize(given) === this.normalize(q.answer);
  },

  // ---- Spaced repetition-uppdatering ----
  // Rätt -> höj nivå + skjut fram nästa repetition. Fel -> sänk + snart igen.
  recordResult(number, correct, opts) {
    opts = opts || {};
    const st = Store.el(number);
    st.seen++;
    Store.data.answeredCount++;

    if (correct) {
      st.correct++;
      st.consecutive++;
      Store.data.totalCorrect++;
      // Höj nivå (SRS-box) – men bara ett steg per gång.
      if (st.level < MAX_LEVEL) st.level++;
      // Nästa repetition dröjer längre ju högre nivå.
      const gap = [1, 2, 4, 7, 12, 20][st.level] || 20;
      st.due = Store.data.answeredCount + gap;
    } else {
      st.wrong++;
      st.consecutive = 0;
      Store.data.totalWrong++;
      // Sänk nivå men inte under 0. Fel = repetera snart igen.
      st.level = Math.max(0, st.level - 1);
      st.due = Store.data.answeredCount + 1;
    }
    return st;
  },

  // ---- Byggnad av frågekö för olika lägen ----

  allElements() { return ELEMENTS.slice(); },

  hardElements() {
    // Ämnen med låg nivå eller markerade som svåra, sorterade svårast först.
    const list = ELEMENTS.filter((e) => {
      const st = Store.el(e.number);
      return st.markedHard || st.level <= 2 || (st.wrong > st.correct && st.seen > 0);
    });
    return list.sort((a, b) => this.difficultyScore(b) - this.difficultyScore(a));
  },

  difficultyScore(el) {
    const st = Store.el(el.number);
    const total = st.correct + st.wrong;
    const errRate = total ? st.wrong / total : 0;
    return (MAX_LEVEL - st.level) * 2 + errRate * 5 + (st.markedHard ? 2 : 0);
  },

  weakestElements(n) {
    return ELEMENTS.slice()
      .sort((a, b) => this.difficultyScore(b) - this.difficultyScore(a))
      .slice(0, n);
  },

  strongestElements(n) {
    return ELEMENTS.slice()
      .sort((a, b) => this.difficultyScore(a) - this.difficultyScore(b))
      .slice(0, n);
  },

  // Generera en session med frågor (adaptivt vald pool + typ).
  buildSession(count, opts) {
    opts = opts || {};
    const pool = opts.pool || this.allElements();
    const questions = [];
    let last = null;
    for (let i = 0; i < count; i++) {
      const el = this.pickWeighted(pool, last);
      last = el.number;
      const type = this.pickType(el, opts);
      questions.push(this.buildQuestion(el, type));
    }
    return questions;
  },

  // Prov-simulering / snabbtest: en fast blandad uppsättning frågor.
  buildRandomTest(count, opts) {
    opts = opts || {};
    opts.forceMix = true;
    const pool = this.allElements();
    const questions = [];
    let last = null;
    for (let i = 0; i < count; i++) {
      // Slumpa relativt jämnt men undvik direkt upprepning.
      let el = this.rand(pool.filter((e) => e.number !== last) || pool);
      if (!el) el = this.rand(pool);
      last = el.number;
      questions.push(this.buildQuestion(el, this.rand(this.ALL_TYPES)));
    }
    return questions;
  },

  // ---- XP & nivå ----
  levelForXp(xp) {
    // Enkel kurva: nivå ökar var 100:e XP, lite stigande.
    return Math.floor(Math.sqrt(xp / 50)) + 1;
  },
  xpForLevel(level) {
    return Math.pow(level - 1, 2) * 50;
  },

  addXp(amount) {
    const before = Store.data.level;
    Store.data.xp += amount;
    const newLevel = this.levelForXp(Store.data.xp);
    let leveledUp = false;
    if (newLevel > Store.data.level) {
      Store.data.level = newLevel;
      leveledUp = true;
    }
    return { leveledUp, level: Store.data.level, gained: amount, wasLevel: before };
  },

  // ---- Achievements ----
  checkAchievements(ctx) {
    ctx = ctx || {};
    const unlocked = [];
    const ach = Store.data.achievements;
    const tryUnlock = (id, cond) => {
      if (!ach[id] && cond) { ach[id] = true; unlocked.push(id); }
    };
    tryUnlock("first_quiz", ctx.quizDone);
    tryUnlock("streak10", Store.data.bestStreak >= 10);
    tryUnlock("streak20", Store.data.bestStreak >= 20);
    tryUnlock("master5", Store.masteredCount() >= 5);
    tryUnlock("master_all", Store.masteredCount() >= 20);
    tryUnlock("perfect", ctx.perfect);
    tryUnlock("know_all", ctx.knowAll);
    return unlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id));
  }
};
