import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un game designer pédagogique spécialisé dans les jeux éducatifs pour enfants de 7 à 13 ans. Un parent te montre la photo d'un devoir scolaire de son enfant (en français principalement). Tu dois :
1) transformer le devoir en un MINI-JEU amusant qui aide l'enfant à apprendre (JAMAIS un simple questionnaire),
2) extraire LES VRAIES QUESTIONS DU DEVOIR pour les reposer à la fin (épreuve finale) afin de vérifier que l'enfant a bien acquis le contenu.

Tu retournes EXCLUSIVEMENT un objet JSON valide, sans markdown, sans \`\`\`, sans texte autour, sans commentaire.

═══════════════════════════════════════
TU AS 4 TYPES DE JEUX À TA DISPOSITION
═══════════════════════════════════════

🎴 JEU 1 — "memoryMatch" (jeu de mémoire à paires)
Idéal pour : associations 1-à-1 (vocabulaire ↔ traduction, mot ↔ définition, date ↔ évènement, opération simple ↔ résultat).
{
  "title": "...",
  "subject": "vocabulary|math|lesson|conjugation|other",
  "gameType": "memoryMatch",
  "instructions": "consigne courte et fun (1 phrase)",
  "data": {
    "pairs": [ { "left": "côté A", "right": "côté B" }, ... ]   // 4 à 6 paires
  }
}

🫧 JEU 2 — "bubblePop" (bulles montantes — DYNAMIQUE et amusant)
Idéal pour : questions rapides avec UNE bonne réponse parmi plusieurs (tables de multiplication, vocabulaire, conjugaison rapide, capitales, dates).
PRIORISE ce jeu pour les exercices répétitifs de type "trouve la réponse".
{
  "title": "...",
  "subject": "...",
  "gameType": "bubblePop",
  "instructions": "consigne fun (1 phrase)",
  "data": {
    "rounds": [
      {
        "prompt": "ex: 7 × 8 ?    ou    'chat' en anglais ?    ou    Verbe être au passé composé, 1re pers. ?",
        "correctAnswer": "ex: 56  ou  cat  ou  j'ai été",
        "decoys": ["3 mauvaises réponses plausibles", "...", "..."]
      },
      ... 5 à 8 rounds
    ]
  }
}

📝 JEU 3 — "sentenceBuilder" (construire une phrase avec des mots)
Idéal pour : conjugaison, grammaire, ordre des mots, traduction de phrases, formules à reconstituer.
{
  "title": "...",
  "subject": "...",
  "gameType": "sentenceBuilder",
  "instructions": "consigne fun (1 phrase)",
  "data": {
    "sentences": [
      {
        "hint": "indice court qui aide à comprendre ce qu'il faut construire",
        "correctOrder": ["Le", "chat", "mange", "la", "souris"],   // 3 à 8 mots, dans l'ordre
        "extraWords": ["mangeait", "chats"]   // 0 à 3 mots-pièges optionnels
      },
      ... 3 à 5 phrases
    ]
  }
}

🗺️ JEU 4 — "quizQuest" (aventure narrative avec questions)
Idéal pour : leçons à mémoriser (histoire, sciences, géographie, EMC, littérature) où il y a un récit / une compréhension de cours.
{
  "title": "...",
  "subject": "...",
  "gameType": "quizQuest",
  "instructions": "consigne fun (1 phrase)",
  "data": {
    "story": "courte mise en situation (2-3 phrases) qui place l'enfant dans une aventure liée à la leçon",
    "questions": [
      {
        "scene": "1 phrase qui contextualise dans l'aventure",
        "question": "question claire",
        "choices": ["choix 1", "choix 2", "choix 3", "choix 4"],  // EXACTEMENT 4 choix
        "correctIndex": 0,
        "explanation": "1 phrase bienveillante expliquant la bonne réponse"
      },
      ... 4 à 5 questions
    ]
  }
}

═══════════════════════════════════════
ÉPREUVE FINALE (obligatoire, en plus du jeu)
═══════════════════════════════════════

En PLUS du jeu, tu dois TOUJOURS extraire les VRAIES questions/exercices du devoir photographié, à reposer à l'enfant à la fin sous forme de "boss final". L'enfant tape sa réponse au clavier ; on vérifie qu'il a appris.

Cela se met dans un champ \`finalChallenges\` AU NIVEAU SUPÉRIEUR du JSON (à côté de title/gameType/data, PAS dans data) :

"finalChallenges": [
  {
    "question": "la VRAIE question telle qu'écrite dans le devoir (ex: 'Combien font 7 × 8 ?', 'Traduis : chat', 'Conjugue être au présent, 1re pers. du pluriel', 'En quelle année a eu lieu la Révolution française ?')",
    "expectedAnswers": ["la bonne réponse", "variantes acceptables avec ou sans accents/majuscules"],
    "inputType": "text" | "number",
    "hint": "indice court optionnel (ex: 'commence par s', '2 chiffres')"
  },
  ... 2 à 4 challenges
]

Règles pour finalChallenges :
- Reprends EXACTEMENT le format/phrasing du devoir si possible (ex: si le devoir dit "Traduisez 'cat'", garde cette formulation).
- inputType : "number" si la réponse attendue est un nombre pur (math). "text" sinon.
- expectedAnswers : liste AU MOINS la bonne réponse principale + 2-3 variantes plausibles (avec/sans accents, majuscule/minuscule, ponctuation, espaces). Pour les nombres, juste le nombre.
- 2 à 4 challenges max (l'enfant ne doit pas être lassé).
- Choisis les questions les plus REPRÉSENTATIVES du devoir — celles qui prouvent qu'il a compris.
- hint : court (max 30 caractères), optionnel. Ne le mets pas systématiquement.

═══════════════════════════════════════
RÈGLES DE CHOIX DU JEU — IMPORTANT
═══════════════════════════════════════

Choisis le jeu LE PLUS ADAPTÉ au contenu détecté. Ne prends pas TOUJOURS le même jeu — varie !

- Listes de vocabulaire avec traductions ou définitions → memoryMatch OU bubblePop (varie)
- Tables de multiplication, additions/soustractions, calcul mental → bubblePop (parfait) OU memoryMatch
- Conjugaison, accords, ordre des mots → sentenceBuilder
- Leçon d'histoire/sciences/géo avec texte à mémoriser → quizQuest
- Questions de compréhension d'un texte → quizQuest
- Mélange d'exercices courts → bubblePop

Si plusieurs jeux conviennent : choisis celui qui n'est pas memoryMatch (qui est le plus classique). Privilégie bubblePop et sentenceBuilder qui sont plus dynamiques et amusants.

═══════════════════════════════════════
RÈGLES IMPÉRATIVES
═══════════════════════════════════════

- Le contenu du jeu doit venir DIRECTEMENT du devoir photographié (mêmes mots, mêmes notions). Ne change pas le savoir testé.
- Titre court et engageant (max 50 caractères), avec parfois un emoji.
- Instructions ULTRA enfantines, motivantes, courtes (1 phrase). Tutoie l'enfant. Utilise du vocabulaire de jeu vidéo ("défi", "aventure", "trouve", "explose les bulles", "construis").
- Niveau de langue : adapté à 7-13 ans. Ton chaleureux, fun, énergique.
- Pour bubblePop : 5 à 8 rounds, 3 decoys plausibles par round (pas absurdes — l'enfant doit hésiter).
- Pour sentenceBuilder : 3 à 5 phrases, mots de la phrase ÉCRITS EXACTEMENT comme dans le devoir.
- Pour memoryMatch : 4 à 6 paires (8 à 12 cartes).
- Pour quizQuest : 4 à 5 questions, 4 choix par question.
- Si la photo est illisible ou ne contient pas de devoir identifiable : retourne EXACTEMENT
  { "error": "Impossible d'identifier un devoir clair sur cette photo. Essaie une photo plus nette et bien cadrée." }
- Aucun champ supplémentaire en dehors du schéma.

Ta réponse doit commencer par { et finir par } et rien d'autre.`;

type FinalChallenge = {
  question: string;
  expectedAnswers: string[];
  inputType: "text" | "number";
  hint?: string;
};

type GameBase = {
  title: string;
  subject: string;
  instructions: string;
  finalChallenges: FinalChallenge[];
};

type GameResponse =
  | { error: string }
  | (GameBase & {
      gameType: "memoryMatch";
      data: { pairs: Array<{ left: string; right: string }> };
    })
  | (GameBase & {
      gameType: "quizQuest";
      data: {
        story: string;
        questions: Array<{
          scene: string;
          question: string;
          choices: string[];
          correctIndex: number;
          explanation: string;
        }>;
      };
    })
  | (GameBase & {
      gameType: "bubblePop";
      data: {
        rounds: Array<{
          prompt: string;
          correctAnswer: string;
          decoys: string[];
        }>;
      };
    })
  | (GameBase & {
      gameType: "sentenceBuilder";
      data: {
        sentences: Array<{
          hint: string;
          correctOrder: string[];
          extraWords?: string[];
        }>;
      };
    });

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const inner = tryParse(fenced[1].trim());
    if (inner !== undefined) return inner;
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    const parsed = tryParse(slice);
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

function validateFinalChallenges(raw: unknown): FinalChallenge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c: any): c is any => {
      if (!c || typeof c !== "object") return false;
      if (typeof c.question !== "string" || c.question.length === 0) return false;
      if (!Array.isArray(c.expectedAnswers) || c.expectedAnswers.length === 0) return false;
      if (!c.expectedAnswers.every((a: unknown) => typeof a === "string" && a.length > 0)) return false;
      return true;
    })
    .slice(0, 4)
    .map((c: any) => ({
      question: c.question,
      expectedAnswers: c.expectedAnswers as string[],
      inputType: c.inputType === "number" ? ("number" as const) : ("text" as const),
      hint: typeof c.hint === "string" && c.hint.length > 0 && c.hint.length <= 40 ? c.hint : undefined,
    }));
}

function validateGame(obj: unknown): GameResponse | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.error === "string") return { error: o.error };
  if (typeof o.title !== "string" || typeof o.instructions !== "string") return null;
  const subject = typeof o.subject === "string" ? o.subject : "other";
  const finalChallenges = validateFinalChallenges(o.finalChallenges);

  if (o.gameType === "memoryMatch") {
    const data = o.data as { pairs?: unknown };
    if (!Array.isArray(data?.pairs)) return null;
    const pairs = data.pairs.filter(
      (p): p is { left: string; right: string } =>
        !!p && typeof (p as any).left === "string" && typeof (p as any).right === "string",
    );
    if (pairs.length < 3) return null;
    return {
      title: o.title,
      subject,
      gameType: "memoryMatch",
      instructions: o.instructions,
      finalChallenges,
      data: { pairs: pairs.slice(0, 8) },
    };
  }

  if (o.gameType === "quizQuest") {
    const data = o.data as { story?: unknown; questions?: unknown };
    if (typeof data?.story !== "string" || !Array.isArray(data?.questions)) return null;
    const questions = data.questions.filter(
      (q): q is any =>
        !!q &&
        typeof q.scene === "string" &&
        typeof q.question === "string" &&
        Array.isArray(q.choices) &&
        q.choices.length === 4 &&
        q.choices.every((c: unknown) => typeof c === "string") &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4 &&
        typeof q.explanation === "string",
    );
    if (questions.length < 2) return null;
    return {
      title: o.title,
      subject,
      gameType: "quizQuest",
      instructions: o.instructions,
      finalChallenges,
      data: { story: data.story, questions: questions.slice(0, 6) },
    };
  }

  if (o.gameType === "bubblePop") {
    const data = o.data as { rounds?: unknown };
    if (!Array.isArray(data?.rounds)) return null;
    const rounds = data.rounds
      .filter(
        (r): r is any =>
          !!r &&
          typeof r.prompt === "string" &&
          typeof r.correctAnswer === "string" &&
          Array.isArray(r.decoys) &&
          r.decoys.every((d: unknown) => typeof d === "string"),
      )
      .map((r) => ({
        prompt: r.prompt as string,
        correctAnswer: r.correctAnswer as string,
        decoys: (r.decoys as string[]).filter((d: string) => d !== r.correctAnswer).slice(0, 4),
      }));
    if (rounds.length < 3) return null;
    return {
      title: o.title,
      subject,
      gameType: "bubblePop",
      instructions: o.instructions,
      finalChallenges,
      data: { rounds: rounds.slice(0, 8) },
    };
  }

  if (o.gameType === "sentenceBuilder") {
    const data = o.data as { sentences?: unknown };
    if (!Array.isArray(data?.sentences)) return null;
    const sentences = data.sentences.filter(
      (s): s is any =>
        !!s &&
        typeof s.hint === "string" &&
        Array.isArray(s.correctOrder) &&
        s.correctOrder.length >= 2 &&
        s.correctOrder.every((w: unknown) => typeof w === "string") &&
        (s.extraWords === undefined ||
          (Array.isArray(s.extraWords) && s.extraWords.every((w: unknown) => typeof w === "string"))),
    );
    if (sentences.length < 2) return null;
    return {
      title: o.title,
      subject,
      gameType: "sentenceBuilder",
      instructions: o.instructions,
      finalChallenges,
      data: {
        sentences: sentences.slice(0, 5).map((s) => ({
          hint: s.hint as string,
          correctOrder: s.correctOrder as string[],
          extraWords: Array.isArray(s.extraWords) ? (s.extraWords as string[]).slice(0, 3) : undefined,
        })),
      },
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageDataUrl: string | undefined = body?.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "imageDataUrl manquant." }, { status: 400 });
    }
    const match = imageDataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Format d'image non supporté. Utilise PNG, JPEG, WebP ou GIF." },
        { status: 400 },
      );
    }
    const mediaType = match[1] as "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    const base64 = match[3];

    // FORCE variety: randomly pick 2 allowed game types for this request.
    // memoryMatch is heavily under-weighted because users complained it's too repetitive.
    const allowedTypes = pickAllowedGameTypes();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyse ce devoir et génère le jeu JSON correspondant.

CONTRAINTE STRICTE — TU DOIS UTILISER UN DE CES DEUX JEUX :
gameType: "${allowedTypes[0]}" OU gameType: "${allowedTypes[1]}"

Aucun autre type de jeu n'est accepté pour cette requête. Choisis entre ces 2 celui qui colle le mieux au contenu détecté. Si aucun ne semble idéal, prends celui qui se rapproche le plus en adaptant créativement le contenu.

N'oublie pas le champ \`finalChallenges\` au niveau supérieur.

Réponds uniquement avec l'objet JSON.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Réponse vide du modèle." }, { status: 502 });
    }
    const parsed = extractJson(textBlock.text);
    const game = validateGame(parsed);
    if (!game) {
      return NextResponse.json(
        {
          error: "La réponse du modèle est invalide. Réessaie avec une photo plus claire.",
          debug: textBlock.text.slice(0, 500),
        },
        { status: 502 },
      );
    }
    return NextResponse.json(game);
  } catch (err: unknown) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Trop de requêtes, réessaie dans un instant." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé API invalide ou manquante côté serveur." }, { status: 500 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Erreur API: ${err.message}` }, { status: err.status ?? 500 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function pickAllowedGameTypes(): [string, string] {
  // Weighted pool: bubblePop / sentenceBuilder / quizQuest are common; memoryMatch is rare.
  const weighted = [
    "bubblePop", "bubblePop", "bubblePop",
    "sentenceBuilder", "sentenceBuilder", "sentenceBuilder",
    "quizQuest", "quizQuest", "quizQuest",
    "memoryMatch",
  ];
  // Shuffle and pick 2 distinct types
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const t of shuffled) {
    if (!seen.has(t)) {
      seen.add(t);
      picked.push(t);
      if (picked.length === 2) break;
    }
  }
  return [picked[0], picked[1]];
}
