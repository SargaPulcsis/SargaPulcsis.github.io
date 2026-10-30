// Mods not on the Mod Portal yet, shown in "In development" on the home page.
// Edit by hand. stage: 1 = Concept, 2 = Development, 3 = Testing, 4 = Released.
// image is optional (a 144x144 thumbnail in assets/upcoming/).
window.UPCOMING = [
  {
    title: "Isotope Industry",
    stage: 3,
    version: "0.9.0",
    image: "assets/upcoming/isotope-industry.png",
    summary: "Nuclear industry for Krastorio 2 Spaced Out: irradiate materials in a reactor-fed channel and follow real decay chains, where short-lived isotopes spoil into their daughters. Thorium and plutonium cycles, a buildable breeder core, and tritium for K2 fusion.",
    needs: "Krastorio 2 Spaced Out, BZ Lead, Titanium and Zirconium, AluminiumX",
  },
  {
    title: "Five Moons",
    stage: 3,
    version: "1.0.1",
    image: "assets/upcoming/five-moons.png",
    summary: "Five new moons, one around each Space Age planet, each with a rule of its own. Their products meet in orbit, where zero-gravity industry builds what no planet can.",
    needs: "Space Age, PlanetsLib; Krastorio 2 Spaced Out optional",
  },
  {
    title: "Module Tiers 4-9",
    stage: 3,
    version: "1.0.1",
    summary: "Speed, productivity and efficiency module tiers 4-9, plus quality modules 4-9 when Quality is enabled. Every tier beats the one before it, starting from vanilla tier 3.",
    needs: "Base game; Space Age and Quality optional",
  },
  {
    title: "Robot Battery Swap",
    stage: 2,
    version: "0.1.0",
    summary: "Robots carry a swappable battery pack: on a roboport charging spot they trade the empty pack for a charged one from the logistic network and fly off at once. No new buildings.",
    needs: "Base game; Space Age, Krastorio 2 optional",
  },
  {
    title: "Polymer Industry",
    stage: 2,
    version: "0.1.0",
    summary: "Chemistry after the oil refinery: crack petroleum gas, light oil or naphtha into ethylene and propylene and turn them into polymers.",
    needs: "Base game; Krastorio 2, Space Age, BZ Titanium, Molybdenum optional",
  },
  {
    title: "Voltage Networks",
    stage: 2,
    version: "0.1.0",
    summary: "Power networks at different voltages (230 V, 380 V, 10 kV) with colour-coded poles, their own cables and transformer stations. A machine on too high a voltage blows up; on too low a voltage it stops.",
    needs: "Base game; Space Age, Krastorio 2 optional",
  },
  {
    title: "Crop Spray",
    stage: 1,
    summary: "Construction robots water the crops of marked agricultural towers or spray them with foliar fertilizer, so they ripen faster. No new robot, tower or plant: a planner tool, a few sprays and a small script.",
    needs: "Space Age; Krastorio 2 Spaced Out optional",
  },
  {
    title: "Entropia",
    stage: 1,
    summary: "A Space Age overhaul where every machine makes heat and every advanced process needs it: temperature tiers, waste heat to recover, and cooling that depends on the planet.",
    needs: "Space Age, Five Moons",
  },
];
