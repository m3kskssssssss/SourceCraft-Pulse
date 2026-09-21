// Что перед нами: проект или полезный материал.
//
// На SourceCraft, как и везде, рядом с программами лежат подборки ссылок,
// конспекты, шпаргалки, учебные материалы и наборы примеров. Оценивать их по
// шкале «активность / код / безопасность / документация» бессмысленно: у
// подборки ссылок не бывает тестов, а отсутствие CI ничего о ней не говорит.
// Такой репозиторий честнее не оценивать, а описать.
//
// Классификатор — набор признаков с весами, без машинного обучения: он должен
// быть объясним. Каждый сработавший признак попадает в `signals` и потом
// показывается пользователю, чтобы вердикт не выглядел гаданием.
//
// Окончательное слово остаётся за моделью (задача repo_kind): она видит README
// и структуру целиком. Эвристика даёт ей отправную точку и работает, когда ИИ
// недоступен.

export type RepoKindName = 'project' | 'material' | 'unclear';

export type RepoKind = {
  kind: RepoKindName;
  /** 0..1 — насколько уверенно. Ниже 0.5 — «непонятно». */
  confidence: number;
  /** Человекочитаемые причины: что именно повлияло. */
  signals: string[];
};

export type ClassifyInput = {
  /** Имя репозитория без организации. */
  name: string;
  description: string | null;
  /** Все пути из дерева. */
  files: string[];
  /** Сколько файлов с кодом нашлось (после отсева мусорных каталогов). */
  codeFiles: number;
  readme: string | null;
  /** Есть ли манифест сборки: package.json, go.mod, Cargo.toml и прочие. */
  hasManifest: boolean;
  hasTests: boolean;
  hasCi: boolean;
};

/** Слова в имени или описании, характерные для подборок и конспектов. */
const MATERIAL_WORDS = [
  'awesome',
  'cheatsheet',
  'cheat-sheet',
  'handbook',
  'roadmap',
  'tutorial',
  'tutorials',
  'course',
  'courses',
  'lecture',
  'lectures',
  'notes',
  'conspect',
  'конспект',
  'шпаргалка',
  'учебник',
  'материалы',
  'interview',
  'questions',
  'resources',
  'reading',
  'books',
  'papers',
  'articles',
  'blog',
  'docs',
  'documentation',
  'wiki',
  'guide',
  'guides',
  'howto',
  'faq',
  'list',
  'collection',
  'curated',
  'dataset',
  'datasets',
];

/** Расширения, которые сами по себе — текст, а не программа. */
const DOC_EXTENSIONS = ['.md', '.markdown', '.rst', '.txt', '.adoc', '.pdf', '.docx', '.epub'];

/** Порог, выше которого считаем вердикт уверенным. */
const CONFIDENT = 0.5;

export function classifyRepo(input: ClassifyInput): RepoKind {
  const signals: string[] = [];
  /** Положительный — в сторону материала, отрицательный — в сторону проекта. */
  let score = 0;

  const docFiles = input.files.filter((path) => isDoc(path)).length;
  const total = input.files.length || 1;
  const docShare = docFiles / total;

  if (input.hasManifest) {
    score -= 0.45;
    signals.push('есть манифест сборки — репозиторий собирается как программа');
  }
  if (input.hasTests) {
    score -= 0.2;
    signals.push('есть тесты');
  }
  if (input.hasCi) {
    score -= 0.15;
    signals.push('настроен CI');
  }

  if (input.codeFiles === 0) {
    score += 0.5;
    signals.push('файлов с кодом не найдено');
  } else if (input.codeFiles <= 3) {
    score += 0.3;
    signals.push(`файлов с кодом всего ${input.codeFiles}`);
  } else if (input.codeFiles >= 25) {
    score -= 0.35;
    signals.push(`файлов с кодом ${input.codeFiles}`);
  }

  if (docShare >= 0.7 && docFiles >= 3) {
    score += 0.35;
    signals.push(`${Math.round(docShare * 100)}% файлов — тексты, а не код`);
  }

  const word = matchMaterialWord(`${input.name} ${input.description ?? ''}`);
  if (word) {
    score += 0.3;
    signals.push(`в названии или описании — «${word}»`);
  }

  const links = readmeLinkDensity(input.readme);
  if (links !== null && links >= 4) {
    score += 0.35;
    signals.push(`README почти целиком из ссылок (${links} на сто слов)`);
  }

  const kind: RepoKindName =
    score >= CONFIDENT ? 'material' : score <= -CONFIDENT ? 'project' : 'unclear';

  return {
    kind,
    confidence: Math.min(1, Math.abs(score)),
    signals: signals.slice(0, 6),
  };
}

/** Ссылок в README на сто слов. Null — README нет или он слишком короткий. */
export function readmeLinkDensity(readme: string | null): number | null {
  if (!readme) return null;
  const words = readme.split(/\s+/).filter(Boolean).length;
  if (words < 40) return null;
  const links = (readme.match(/\]\(https?:\/\//g) ?? []).length;
  return Math.round((links / words) * 100 * 10) / 10;
}

function isDoc(path: string): boolean {
  const lower = path.toLowerCase();
  return DOC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function matchMaterialWord(text: string): string | null {
  const lower = text.toLowerCase();
  return MATERIAL_WORDS.find((word) => lower.includes(word)) ?? null;
}
