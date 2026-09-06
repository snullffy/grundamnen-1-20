// Persistens i localStorage. All data sparas lokalt – inget konto behövs.
const STORAGE_KEY = "grundamnen_app_v1";

const Store = {
  data: null,

  defaults() {
    const elements = {};
    ELEMENTS.forEach((e) => {
      elements[e.number] = {
        level: 0,          // SRS-box 0..5 (kunskapsnivå -> stjärnor)
        correct: 0,        // totalt antal rätt
        wrong: 0,          // totalt antal fel
        seen: 0,           // hur många gånger visad
        consecutive: 0,    // rätt i rad just nu för detta ämne
        markedHard: false, // markerad som svår i lär-läget
        due: 0             // "timestamp"/räknare för när den bör repeteras
      };
    });
    return {
      xp: 0,
      level: 1,
      currentStreak: 0,    // nuvarande "rätt i rad"
      bestStreak: 0,       // bästa "rätt i rad"
      totalCorrect: 0,
      totalWrong: 0,
      quizzesCompleted: 0,
      answeredCount: 0,    // global räknare (används som "tid" för SRS)
      lastResults: [],     // [{mode, score, total, pct, date}]
      mistakes: [],        // grundämnen (nummer) man svarat fel på – sparas lokalt
      achievements: {},    // id -> true
      settings: { sound: true },
      elements
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign(this.defaults(), parsed);
        // säkerställ att alla element finns
        const def = this.defaults().elements;
        for (const k in def) {
          if (!this.data.elements[k]) this.data.elements[k] = def[k];
        }
      } else {
        this.data = this.defaults();
      }
    } catch (e) {
      this.data = this.defaults();
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* ignorera */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },

  el(number) {
    return this.data.elements[number];
  },

  // ---- Fel-lista ("gör om fel") sparad lokalt ----
  addMistake(number) {
    if (!Array.isArray(this.data.mistakes)) this.data.mistakes = [];
    // Ta bort ev. tidigare förekomst och lägg först (senaste felet överst).
    this.data.mistakes = this.data.mistakes.filter((n) => n !== number);
    this.data.mistakes.unshift(number);
    if (this.data.mistakes.length > 20) this.data.mistakes.length = 20;
  },
  removeMistake(number) {
    if (!Array.isArray(this.data.mistakes)) { this.data.mistakes = []; return; }
    this.data.mistakes = this.data.mistakes.filter((n) => n !== number);
  },
  mistakeList() {
    if (!Array.isArray(this.data.mistakes)) return [];
    return this.data.mistakes.slice();
  },

  masteredCount() {
    let n = 0;
    for (const k in this.data.elements) {
      if (this.data.elements[k].level >= MAX_LEVEL) n++;
    }
    return n;
  }
};
