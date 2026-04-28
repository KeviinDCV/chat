const REPLIES: { match: RegExp; out: string[] }[] = [
  {
    match: /\b(hola|buenas|hey|hi|hello|qué tal)\b/i,
    out: [
      "¡Hola! ¿Cómo va tu día? ☀️",
      "¡Hey! Qué gusto verte por aquí.",
      "¡Holaaa! Cuéntame qué tienes en mente.",
    ],
  },
  {
    match: /\b(gracias|thanks|ty)\b/i,
    out: ["¡De nada! 💛", "Para eso estoy 🌶️", "¡Cuando quieras!"],
  },
  {
    match: /\b(adios|adiós|bye|chao|nos vemos)\b/i,
    out: ["¡Hasta pronto! 👋", "Que te vaya bonito ✨", "¡Nos vemos!"],
  },
  {
    match: /\?$/,
    out: [
      "Buena pregunta… déjame pensar 🤔",
      "Mmm, depende. ¿Tú qué crees?",
      "Yo diría que sí, pero cuéntame más.",
    ],
  },
  {
    match: /\b(amor|te quiero|te amo)\b/i,
    out: ["💛❤️", "Aww, qué lindo 🥺", "Tú también me caes increíble."],
  },
];

const FALLBACKS = [
  "Cuéntame más 👀",
  "Eso suena interesante.",
  "Te leo. Sigue.",
  "Ajá… ¿y luego?",
  "Mmm, qué buena onda.",
  "Eso me gustó. ¿Algo más?",
];

export function botReply(input: string): string {
  const t = input.trim();
  for (const r of REPLIES) {
    if (r.match.test(t)) {
      return r.out[Math.floor(Math.random() * r.out.length)];
    }
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

// Simulated typing duration: depends on reply length, with jitter.
export function typingMs(reply: string): number {
  const base = 450;
  const perChar = 22;
  const jitter = Math.random() * 350;
  return Math.min(2400, base + reply.length * perChar + jitter);
}
