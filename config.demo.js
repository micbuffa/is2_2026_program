// For local visual testing only: rename this file to config.js temporarily.
window.IS2_PROGRAM_CONFIG = {
  csvUrl: "demo-program.csv",
  conference: {
    shortName: "IEEE IS2 2026",
    name: "7th IEEE International Symposium on the Internet of Sounds",
    city: "Cannes, France",
    dates: "28–30 October 2026"
  },
  tracks: [
    { id: "IEEE IS2 2026", label: "Main Track", className: "track-main" },
    { id: "IWMM 2026", label: "IWMM", className: "track-iwmm" },
    { id: "IWNIA 2026", label: "IWNIA", className: "track-iwnia" },
    { id: "IwSonIoS 2026", label: "IwSonIoS", className: "track-iwsonios" },
    { id: "IS2 2026-Demos", label: "Demos", className: "track-demos" },
    { id: "IS2 2026 PSI", label: "Performances & Installations", className: "track-psi" }
  ],
  locations: {
    "Amphithéâtre 38": "Main track and workshops",
    "Main hall": "Posters, registration and breaks",
    "First floor rooms": "Demos",
    "Grand Plateau": "Music performances",
    "La Siesta": "Social event — Thursday 29 October"
  }
};
