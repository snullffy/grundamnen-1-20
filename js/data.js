// De 20 första grundämnena + korta minnesknep.
// hint = kort minneshjälp (håll den enkel, fokus på läxförhöret).
const ELEMENTS = [
  { number: 1,  symbol: "H",  name: "Väte",       hint: "H = Väte. Lättast av alla – nummer 1." },
  { number: 2,  symbol: "He", name: "Helium",     hint: "He = Helium. Gasen i ballonger, nummer 2." },
  { number: 3,  symbol: "Li", name: "Litium",     hint: "Li = Litium. Finns i batterier." },
  { number: 4,  symbol: "Be", name: "Beryllium",  hint: "Be = Beryllium. 'Be' som i början av namnet." },
  { number: 5,  symbol: "B",  name: "Bor",        hint: "B = Bor. Kort namn, kort symbol." },
  { number: 6,  symbol: "C",  name: "Kol",        hint: "C = Kol (Carbon på engelska/latin)." },
  { number: 7,  symbol: "N",  name: "Kväve",      hint: "N = Kväve (Nitrogen). Störst del av luften." },
  { number: 8,  symbol: "O",  name: "Syre",       hint: "O = Syre (Oxygen). Det vi andas in." },
  { number: 9,  symbol: "F",  name: "Fluor",      hint: "F = Fluor. Finns i tandkräm." },
  { number: 10, symbol: "Ne", name: "Neon",       hint: "Ne = Neon. Neonskyltar lyser." },
  { number: 11, symbol: "Na", name: "Natrium",    hint: "Na = Natrium (latin: natrium). Finns i salt." },
  { number: 12, symbol: "Mg", name: "Magnesium",  hint: "Mg = Magnesium. 'Mg' börjar som Magnesium." },
  { number: 13, symbol: "Al", name: "Aluminium",  hint: "Al = Aluminium. Som i aluminiumfolie." },
  { number: 14, symbol: "Si", name: "Kisel",      hint: "Si = Kisel (Silicium). Finns i datorchip." },
  { number: 15, symbol: "P",  name: "Fosfor",     hint: "P = Fosfor (Phosphorus). Lyser i mörkret." },
  { number: 16, symbol: "S",  name: "Svavel",     hint: "S = Svavel (Sulfur). Luktar 'ruttna ägg'." },
  { number: 17, symbol: "Cl", name: "Klor",       hint: "Cl = Klor (Chlorine). Finns i pooler." },
  { number: 18, symbol: "Ar", name: "Argon",      hint: "Ar = Argon. 'Ar' börjar som Argon." },
  { number: 19, symbol: "K",  name: "Kalium",     hint: "K = Kalium. Från latinets kalium. Finns i bananer." },
  { number: 20, symbol: "Ca", name: "Kalcium",    hint: "Ca = Kalcium (Calcium). Finns i ben och mjölk." }
];

// Achievements-definitioner
const ACHIEVEMENTS = [
  { id: "first_quiz",  emoji: "🏆", name: "Första quizet",   desc: "Klara ditt första quiz" },
  { id: "streak10",    emoji: "🔥", name: "10 i rad",         desc: "10 rätt i rad" },
  { id: "master5",     emoji: "🧠", name: "5 bemästrade",     desc: "Bemästra 5 grundämnen" },
  { id: "streak20",    emoji: "⚡", name: "20 i rad",         desc: "20 rätt i rad" },
  { id: "master_all",  emoji: "👑", name: "Alla 20!",         desc: "Bemästra alla 20 grundämnen" },
  { id: "perfect",     emoji: "💯", name: "Perfekt quiz",     desc: "Alla rätt på ett quiz" },
  { id: "know_all",    emoji: "🎓", name: "Kan alla 20",      desc: "Klara sluttestet 'Kan jag alla?'" }
];

// Kunskapsnivåer (SRS-boxar) 0..5
const LEVEL_NAMES = ["Ny", "Lär", "Tränad", "Bra", "Nästan", "Mästrad"];
const MAX_LEVEL = 5;
