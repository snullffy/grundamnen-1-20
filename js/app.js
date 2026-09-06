// ==========================================================================
// App: UI-controller, router och alla lägen.
// ==========================================================================

const App = {
  root: null,
  topbar: null,
  currentStreak: 0,

  init() {
    Store.load();
    this.currentStreak = Store.data.currentStreak || 0;
    this.root = document.getElementById("app");
    this.topbar = document.getElementById("topbar");
    document.getElementById("homeBtn").addEventListener("click", () => this.go("home"));
    document.getElementById("themeBtn").addEventListener("click", () => this.toggleTheme());
    this.applyTheme();
    this.setupConfetti();
    this.go("home");
  },

  applyTheme() {
    const theme = (Store.data.settings && Store.data.settings.theme) || "light";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#17181C" : "#F6F6F4");
  },

  toggleTheme() {
    if (!Store.data.settings) Store.data.settings = {};
    Store.data.settings.theme = (Store.data.settings.theme === "dark") ? "light" : "dark";
    Store.save();
    this.applyTheme();
    // Uppdatera hemknappens text om vi är på startsidan.
    if (this.currentView === "home") this.go("home");
  },

  go(view, arg) {
    this.currentView = view;
    this.topbar.classList.remove("hidden");
    this.topbar.classList.toggle("is-home", view === "home");
    this.updateTopbar();
    window.scrollTo(0, 0);
    const fn = this.views[view];
    if (fn) fn.call(this, arg);
  },

  updateTopbar() {
    document.getElementById("tbLevel").textContent = Store.data.level;
    document.getElementById("tbXp").textContent = Store.data.xp;
    document.getElementById("tbStreak").textContent = this.currentStreak;
  },

  // ---------- Small DOM helpers ----------
  html(str) { this.root.innerHTML = str; },

  stars(level) {
    const full = "⭐".repeat(level);
    const empty = "·".repeat(MAX_LEVEL - level);
    return `<span class="stars">${full}${empty}</span>`;
  },

  // ================= VIEWS =================
  views: {
    // ---------------- HOME ----------------
    home() {
      const d = Store.data;
      const mastered = Store.masteredCount();
      const pct = Math.round((mastered / 20) * 100);
      const xpFloor = Engine.xpForLevel(d.level);
      const xpNext = Engine.xpForLevel(d.level + 1);
      const xpPct = Math.min(100, Math.round(((d.xp - xpFloor) / (xpNext - xpFloor)) * 100));
      const last = d.lastResults[0];

      this.html(`
        <section class="view">
          <header class="home-hero">
            <span class="badge">Periodiska systemet 1–20</span>
            <h1>Grundämnen</h1>
            <p>Träna smart inför läxförhöret 🧪</p>
          </header>

          <div class="stat-grid">
            <div class="stat"><div class="big">${mastered}/20</div><div class="lbl">Kan</div></div>
            <div class="stat"><div class="big">🔥 ${this.currentStreak}</div><div class="lbl">Streak</div></div>
            <div class="stat"><div class="big">${d.xp}</div><div class="lbl">XP</div></div>
            <div class="stat"><div class="big">Nivå ${d.level}</div><div class="lbl">Nivå</div></div>
          </div>

          <div class="mastery-card">
            <div class="row"><h3>Din progress</h3><span class="count">${mastered}/20</span></div>
            <div class="progress"><span style="width:${pct}%"></span></div>
            <div class="row" style="margin:14px 0 6px;">
              <span class="sub">Nivå ${d.level} · ${d.xp} XP</span>
              <span class="sub">${xpNext - d.xp} XP till nästa</span>
            </div>
            <div class="progress xp"><span style="width:${xpPct}%"></span></div>
          </div>

          <button class="exam-banner" id="examBanner">
            <span class="big-emj">🚨</span>
            <span><h3>Prov imorgon?</h3><p>Starta ett smart pass på det du är sämst på.</p></span>
          </button>

          <div class="section-title">Träna</div>
          <div class="btn-grid">
            <button class="btn btn-primary" data-go="learn"><span class="emj">📚</span><span>Lär dig<small>Korten steg för steg</small></span></button>
            <button class="btn btn-accent" data-go="quiz"><span class="emj">⚡</span><span>Snabbquiz<small>4 delar · adaptivt</small></span></button>
            <button class="btn btn-amber" data-go="review"><span class="emj">🎯</span><span>Repetera svåra<small>Dina svaga ämnen</small></span></button>
            <button class="btn btn-red" data-go="mistakes"><span class="emj">🔁</span><span>Gör om fel<small>${Store.mistakeList().length ? Store.mistakeList().length + " att träna om" : "Inga fel just nu"}</small></span></button>
            <button class="btn btn-green" data-go="blind"><span class="emj">✍️</span><span>Skriv allt<small>Fyll i på blindo</small></span></button>
            <button class="btn btn-purple" data-go="table"><span class="emj">📋</span><span>Fyll i tabellen<small>Göm & skriv in</small></span></button>
            <button class="btn btn-pink" data-go="quicktest"><span class="emj">📝</span><span>Snabbtest<small>10 eller 20 frågor</small></span></button>
          </div>

          <div class="section-title">Testa & följ</div>
          <div class="btn-grid">
            <button class="btn btn-dark" data-go="examsim"><span class="emj">🎓</span><span>Prov-simulering<small>Som ett riktigt prov</small></span></button>
            <button class="btn btn-dark" data-go="list"><span class="emj">🔬</span><span>Alla grundämnen<small>Se alla 20</small></span></button>
            <button class="btn btn-dark" data-go="progress"><span class="emj">📈</span><span>Min utveckling<small>Statistik & märken</small></span></button>
          </div>

          <div class="spacer"></div>
          <button class="big-final-btn" id="finalBtn"><span>🧠</span><span>Kan jag alla 20?</span></button>

          <div class="last-result">
            ${last ? `Senaste: <b>${last.label}</b> · ${last.score}/${last.total} (${last.pct}%)` : "Inget resultat än – kör ditt första pass! 🚀"}
          </div>
          <div class="footer-note">
            <span>Sparas lokalt · fungerar offline</span>
            <button class="hint-btn" id="themeBtnHome">◐ ${(Store.data.settings.theme === "dark") ? "Ljust läge" : "Mörkt läge"}</button>
            <button class="hint-btn" id="resetBtn">Nollställ data</button>
          </div>
        </section>
      `);

      this.root.querySelectorAll("[data-go]").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.go)));
      document.getElementById("examBanner").addEventListener("click", () => this.go("examtomorrow"));
      document.getElementById("finalBtn").addEventListener("click", () => this.go("finaltest"));
      document.getElementById("themeBtnHome").addEventListener("click", () => this.toggleTheme());
      document.getElementById("resetBtn").addEventListener("click", () => {
        if (confirm("Nollställa all progress, XP och statistik?")) { Store.reset(); this.applyTheme(); this.currentStreak = 0; this.go("home"); }
      });
    },

    // ---------------- LEARN (flashcards) ----------------
    learn() {
      Learn.start.call(this);
    },

    // ---------------- QUIZ (part selector) ----------------
    quiz() {
      const groups = [
        { label: "Del 1", range: "1–5",   nums: [1, 2, 3, 4, 5] },
        { label: "Del 2", range: "6–10",  nums: [6, 7, 8, 9, 10] },
        { label: "Del 3", range: "11–15", nums: [11, 12, 13, 14, 15] },
        { label: "Del 4", range: "16–20", nums: [16, 17, 18, 19, 20] }
      ];
      const cards = groups.map((g, i) => {
        const syms = g.nums.map((n) => Engine.byNumber(n).symbol).join(" · ");
        const done = g.nums.filter((n) => Store.el(n).level >= MAX_LEVEL).length;
        return `
          <button class="btn btn-dark" data-part="${i}">
            <span class="emj">${done === 5 ? "✅" : "🔹"}</span>
            <span>${g.label} <span style="color:var(--muted);font-weight:500">(${g.range})</span>
            <small>${syms} · ${done}/5 klara</small></span>
          </button>`;
      }).join("");

      this.html(`
        <section class="view">
          <header class="hero"><h1>Snabbquiz</h1><p>Välj en del att träna på – 5 grundämnen i taget.</p></header>
          <p class="mode-desc">Smart och adaptivt: du får fler frågor på det du har svårt för. Ta en del i taget så blir det inte för mycket på en gång.</p>

          <div class="section-title">Välj del</div>
          <div class="btn-grid">${cards}</div>

          <div class="spacer"></div>
          <div class="section-title">Eller kör allt</div>
          <button class="big-final-btn" id="allBtn">🎲 Alla 20 grundämnen</button>
        </section>
      `);

      const start = (nums, len) => {
        Quiz.startAdaptive.call(this, {
          label: "Snabbquiz",
          length: len,
          pool: nums.map((n) => Engine.byNumber(n)),
          showFeedback: true
        });
      };
      this.root.querySelectorAll("[data-part]").forEach((b) =>
        b.addEventListener("click", () => start(groups[+b.dataset.part].nums, 10)));
      document.getElementById("allBtn").addEventListener("click", () =>
        start([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], 14));
    },

    // ---------------- REVIEW HARD ----------------
    review() {
      let pool = Engine.hardElements();
      if (pool.length === 0) {
        this.toast("Inga svåra ämnen än – bra jobbat! 💪");
        pool = Engine.allElements();
      }
      Quiz.startAdaptive.call(this, {
        label: "Repetera svåra",
        length: Math.max(8, Math.min(14, pool.length * 2)),
        pool,
        showFeedback: true
      });
    },

    // ---------------- GÖR OM FEL (mistakes) ----------------
    mistakes() {
      const list = Store.mistakeList();
      if (list.length === 0) {
        this.html(`
          <section class="view center-col">
            <header class="hero"><h1>Gör om fel</h1><p>Här samlas allt du svarar fel på.</p></header>
            <div class="feedback ok" style="text-align:center;margin-top:10px;">
              <div class="fb-title">🎉 Inga fel just nu!</div>
              <div class="fb-body">Du har inga grundämnen i fel-listan. Kör ett quiz så dyker det du missar upp här automatiskt.</div>
            </div>
            <div class="spacer"></div>
            <div style="display:grid;gap:12px;">
              <button class="btn btn-solid btn-block" data-go="quiz">⚡ Kör ett quiz</button>
              <button class="btn btn-block" id="allBtn2">🎲 Gör alla 20</button>
              <button class="btn btn-block" data-go="home">🏠 Till start</button>
            </div>
          </section>`);
        this.root.querySelectorAll("[data-go]").forEach((b) =>
          b.addEventListener("click", () => this.go(b.dataset.go)));
        document.getElementById("allBtn2").addEventListener("click", () =>
          Quiz.startAdaptive.call(this, { label: "Snabbquiz", length: 14, pool: Engine.allElements(), showFeedback: true }));
        return;
      }

      const chips = list.map((n) => {
        const e = Engine.byNumber(n);
        return `<span class="miss-chip">${e.symbol} <b>${e.name}</b></span>`;
      }).join("");

      this.html(`
        <section class="view">
          <header class="hero"><h1>Gör om fel</h1><p>${list.length} grundämne${list.length === 1 ? "" : "n"} du har haft fel på.</p></header>
          <p class="mode-desc">Smart repetition: appen tränar just det du missat tills du kan det. När du svarar rätt försvinner ämnet härifrån automatiskt. Allt sparas lokalt i din webbläsare.</p>

          <div class="section-title">Dina fel</div>
          <div class="miss-list">${chips}</div>

          <div class="spacer"></div>
          <div style="display:grid;gap:12px;">
            <button class="big-final-btn" id="doMistakes">🔁 Träna på mina fel (${list.length})</button>
            <button class="btn btn-block" id="allBtn2">🎲 Gör alla 20 istället</button>
            <button class="btn btn-block" id="clearMiss">🧹 Rensa fel-listan</button>
          </div>
        </section>
      `);

      document.getElementById("doMistakes").addEventListener("click", () => {
        Quiz.startAdaptive.call(this, {
          label: "Gör om fel",
          length: Math.max(8, Math.min(16, list.length * 2)),
          pool: list.map((n) => Engine.byNumber(n)),
          showFeedback: true,
          forceMix: true
        });
      });
      document.getElementById("allBtn2").addEventListener("click", () =>
        Quiz.startAdaptive.call(this, { label: "Snabbquiz", length: 14, pool: Engine.allElements(), showFeedback: true }));
      document.getElementById("clearMiss").addEventListener("click", () => {
        if (confirm("Rensa listan med fel?")) { Store.data.mistakes = []; Store.save(); this.go("mistakes"); }
      });
    },

    // ---------------- EXAM TOMORROW ----------------
    examtomorrow() {
      // Optimerat pass: börja med de sämsta, blanda frågetyper.
      const weak = Engine.weakestElements(20);
      Quiz.startAdaptive.call(this, {
        label: "Prov imorgon",
        length: 18,
        pool: weak,
        showFeedback: true,
        forceMix: true,
        isExamPrep: true
      });
    },

    // ---------------- ALL ELEMENTS ----------------
    list() {
      const tiles = ELEMENTS.map((e) => {
        const st = Store.el(e.number);
        const pct = Math.round((st.level / MAX_LEVEL) * 100);
        return `
          <div class="el-tile">
            <div class="t-num">#${e.number}</div>
            <div class="t-sym">${e.symbol}</div>
            <div class="t-name">${e.name}</div>
            <div class="t-stars">${this.stars(st.level)}</div>
            <div class="t-bar" style="width:${pct}%"></div>
          </div>`;
      }).join("");
      this.html(`
        <section class="view">
          <div class="hero"><h1>Alla grundämnen</h1><p>De 20 första i periodiska systemet</p></div>
          <div class="el-list">${tiles}</div>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-block" data-go="learn">📚 Lär dig korten</button>
        </section>
      `);
      this.root.querySelectorAll("[data-go]").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.go)));
    },

    // ---------------- BLIND TYPE-IN ----------------
    blind() {
      Blind.start.call(this);
    },

    // ---------------- FILL-IN TABLE ----------------
    table() {
      Table.start.call(this);
    },

    // ---------------- QUICK TEST ----------------
    quicktest() {
      this.html(`
        <section class="view center-col">
          <div class="hero"><h1>Snabbtest</h1></div>
          <p class="mode-desc">Ingen hjälp visas under testet.<br>Resultatet kommer på slutet.</p>
          <div class="pill-row" id="qtLen">
            <button class="pill active" data-len="10">10 frågor</button>
            <button class="pill" data-len="20">20 frågor</button>
          </div>
          <button class="btn btn-pink btn-block" id="qtStart">📝 Starta snabbtest</button>
          <div class="spacer"></div>
        </section>
      `);
      let len = 10;
      this.root.querySelectorAll("#qtLen .pill").forEach((p) =>
        p.addEventListener("click", () => {
          this.root.querySelectorAll("#qtLen .pill").forEach((x) => x.classList.remove("active"));
          p.classList.add("active"); len = parseInt(p.dataset.len, 10);
        }));
      document.getElementById("qtStart").addEventListener("click", () => {
        Quiz.startTest.call(this, {
          label: "Snabbtest",
          questions: Engine.buildRandomTest(len),
          grade: false
        });
      });
    },

    // ---------------- EXAM SIMULATION ----------------
    examsim() {
      this.html(`
        <section class="view center-col">
          <div class="hero"><h1>Prov-simulering</h1></div>
          <p class="mode-desc">Känns som ett riktigt läxförhör.<br>20 slumpmässiga frågor. Ingen feedback förrän på slutet – sedan får du ett betyg.</p>
          <button class="btn btn-primary btn-block" id="esStart">🎓 Starta provet</button>
          <div class="spacer"></div>
        </section>
      `);
      document.getElementById("esStart").addEventListener("click", () => {
        Quiz.startTest.call(this, {
          label: "Prov-simulering",
          questions: Engine.buildRandomTest(20),
          grade: true
        });
      });
    },

    // ---------------- FINAL TEST ----------------
    finaltest() {
      this.html(`
        <section class="view center-col">
          <div class="hero"><h1>🧠 Kan jag alla 20?</h1></div>
          <p class="mode-desc">Sluttestet. Du måste visa att du kan alla 20 åt båda hållen:<br>namn → symbol, symbol → namn, namn → atomnummer och atomnummer → namn.<br><b>Klara minst 18 av 20 för att bli godkänd.</b></p>
          <button class="big-final-btn" id="ftStart"><span>🚀</span><span>STARTA SLUTTESTET</span></button>
          <div class="spacer"></div>
        </section>
      `);
      document.getElementById("ftStart").addEventListener("click", () => {
        Quiz.startTest.call(this, {
          label: "Kan jag alla 20",
          questions: FinalTest.build(),
          grade: false,
          isFinal: true
        });
      });
    },

    // ---------------- PROGRESS ----------------
    progress() {
      Progress.render.call(this);
    }
  },

  // ================= SHARED FEEDBACK / EFFECTS =================
  toast(msg, ms) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove("show"), ms || 1800);
  },

  floatXp(amount, x, y) {
    const f = document.getElementById("xpFloat");
    f.textContent = "+" + amount + " XP";
    f.style.left = (x || window.innerWidth / 2) + "px";
    f.style.top = (y || 120) + "px";
    f.classList.remove("go");
    void f.offsetWidth;
    f.classList.add("go");
  },

  // Registrera ett svar globalt: streak, achievements, XP för rätt.
  applyAnswer(question, correct, giveXp) {
    const beforeLevel = Store.el(question.element.number).level;
    Engine.recordResult(question.element.number, correct);
    const afterLevel = Store.el(question.element.number).level;

    if (correct) {
      this.currentStreak++;
      if (this.currentStreak > Store.data.bestStreak) Store.data.bestStreak = this.currentStreak;
      if (giveXp) this.award(10);
      // Bemästrat ett ämne (nådde max nivå)?
      if (afterLevel >= MAX_LEVEL && beforeLevel < MAX_LEVEL) {
        this.award(50);
        this.toast("🧠 Grundämne bemästrat! +50 XP");
      }
      // Rätt svar → ta bort från fel-listan.
      Store.removeMistake(question.element.number);
    } else {
      this.currentStreak = 0;
      // Fel svar → spara i fel-listan lokalt så det kan tränas om.
      Store.addMistake(question.element.number);
    }
    Store.data.currentStreak = this.currentStreak;
    Store.save();
    this.updateTopbar();
    this.evalAchievements({});
  },

  award(amount) {
    const res = Engine.addXp(amount);
    this.floatXp(amount);
    if (res.leveledUp) this.showLevelUp(res.level);
    this.updateTopbar();
  },

  evalAchievements(ctx) {
    const before20 = Store.data.achievements["master_all"];
    const unlocked = Engine.checkAchievements(ctx);
    unlocked.forEach((a) => {
      this.showAchievement(a);
      if (a.id === "master_all") this.award(100); // bonus: alla 20 bemästrade
      if (a.id === "know_all") this.award(100);
    });
    if (unlocked.length) Store.save();
  },

  showAchievement(a) {
    setTimeout(() => this.toast(`${a.emoji} Märke: ${a.name}!`, 2600), 400);
  },

  showLevelUp(level) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="m-emj">🎖️</div>
        <h2>Nivå ${level}!</h2>
        <p>Du klättrar uppåt. Fortsätt så!</p>
        <button class="btn btn-primary btn-block" id="luClose">Nice! 🎉</button>
      </div>`;
    document.body.appendChild(overlay);
    this.burst();
    overlay.querySelector("#luClose").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  },

  // ---------- Confetti ----------
  setupConfetti() {
    this.cv = document.getElementById("confetti");
    this.ctx = this.cv.getContext("2d");
    this.parts = [];
    const resize = () => { this.cv.width = window.innerWidth; this.cv.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      this.parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.rot += p.vr; p.life--;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        this.ctx.restore();
      });
      this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.cv.height + 40);
      requestAnimationFrame(loop);
    };
    loop();
  },

  burst(count) {
    const colors = ["#5B5BD6", "#2E9E5B", "#C67A18", "#8385F0", "#6A6E77", "#4B4BC7"];
    const n = count || 90;
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: this.cv.width / 2 + (Math.random() - 0.5) * 120,
        y: this.cv.height / 3,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -8 - 3,
        s: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        life: 120 + Math.random() * 60
      });
    }
  },

  // Spara ett resultat i historiken.
  saveResult(label, score, total) {
    const pct = Math.round((score / total) * 100);
    Store.data.lastResults.unshift({ label, score, total, pct, date: Date.now() });
    Store.data.lastResults = Store.data.lastResults.slice(0, 8);
    Store.data.quizzesCompleted++;
    Store.save();
    return pct;
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
