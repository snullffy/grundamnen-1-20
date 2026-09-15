// Viktiga joner att kunna: namn (jon) <-> formel.
// "symbol" = formeln (behålls som fältnamn internt). "number" = internt id.
// hint = kort minneshjälp (kan vara tom).
const ELEMENTS = [
  { number: 1,  symbol: "OH⁻",   name: "Hydroxidjon",  hint: "" },
  { number: 2,  symbol: "H₃O⁺",  name: "Oxoniumjon",   hint: "" },
  { number: 3,  symbol: "CN⁻",   name: "Cyanidjon",    hint: "" },
  { number: 4,  symbol: "SO₄²⁻", name: "Sulfatjon",    hint: "Sulfat = SO₄ med laddning 2−." },
  { number: 5,  symbol: "SO₃²⁻", name: "Sulfitjon",    hint: "Sulfit = SO₃ (ett O mindre än sulfat)." },
  { number: 6,  symbol: "NO₃⁻",  name: "Nitratjon",    hint: "Nitrat = NO₃ med laddning 1−." },
  { number: 7,  symbol: "NO₂⁻",  name: "Nitritjon",    hint: "Nitrit = NO₂ (ett O mindre än nitrat)." },
  { number: 8,  symbol: "CO₃²⁻", name: "Karbonatjon",  hint: "Karbonat = CO₃ med laddning 2−." },
  { number: 9,  symbol: "PO₄³⁻", name: "Fosfatjon",    hint: "Fosfat = PO₄ med laddning 3−." },
  { number: 10, symbol: "O²⁻",   name: "Oxidjon",      hint: "" },
  { number: 11, symbol: "S²⁻",   name: "Sulfidjon",    hint: "" },
  { number: 12, symbol: "F⁻",    name: "Fluoridjon",   hint: "" },
  { number: 13, symbol: "Cl⁻",   name: "Kloridjon",    hint: "" },
  { number: 14, symbol: "Br⁻",   name: "Bromidjon",    hint: "" },
  { number: 15, symbol: "I⁻",    name: "Jodidjon",     hint: "" },
  { number: 16, symbol: "NH₄⁺",  name: "Ammoniumjon",  hint: "Ammonium = NH₄ med laddning 1+." },
  { number: 17, symbol: "H⁺",    name: "Vätejon",      hint: "" },
  { number: 18, symbol: "Li⁺",   name: "Litiumjon",    hint: "" },
  { number: 19, symbol: "Na⁺",   name: "Natriumjon",   hint: "" },
  { number: 20, symbol: "K⁺",    name: "Kaliumjon",    hint: "" },
  { number: 21, symbol: "Mg²⁺",  name: "Magnesiumjon", hint: "" },
  { number: 22, symbol: "Ca²⁺",  name: "Kalciumjon",   hint: "" },
  { number: 23, symbol: "Ba²⁺",  name: "Bariumjon",    hint: "" },
  { number: 24, symbol: "Al³⁺",  name: "Aluminiumjon", hint: "Aluminium har laddning 3+." },
  { number: 25, symbol: "Cu²⁺",  name: "Kopparjon",    hint: "" },
  { number: 26, symbol: "Ag⁺",   name: "Silverjon",    hint: "" },
  { number: 27, symbol: "Fe²⁺",  name: "Järn(II)jon",  hint: "Järn(II) = Fe med laddning 2+." },
  { number: 28, symbol: "Fe³⁺",  name: "Järn(III)jon", hint: "Järn(III) = Fe med laddning 3+." }
];

// Totalt antal (används överallt istället för hårdkodat tal).
const TOTAL = ELEMENTS.length;

// Achievements-definitioner
const ACHIEVEMENTS = [
  { id: "first_quiz",  emoji: "🏆", name: "Första quizet",   desc: "Klara ditt första quiz" },
  { id: "streak10",    emoji: "🔥", name: "10 i rad",         desc: "10 rätt i rad" },
  { id: "master5",     emoji: "🧠", name: "5 bemästrade",     desc: "Bemästra 5 joner" },
  { id: "streak20",    emoji: "⚡", name: "20 i rad",         desc: "20 rätt i rad" },
  { id: "master_all",  emoji: "👑", name: "Alla 28!",         desc: "Bemästra alla 28 joner" },
  { id: "perfect",     emoji: "💯", name: "Perfekt quiz",     desc: "Alla rätt på ett quiz" },
  { id: "know_all",    emoji: "🎓", name: "Kan alla 28",      desc: "Klara sluttestet 'Kan jag alla?'" }
];

// Kunskapsnivåer (SRS-boxar) 0..5
const LEVEL_NAMES = ["Ny", "Lär", "Tränad", "Bra", "Nästan", "Mästrad"];
const MAX_LEVEL = 5;
