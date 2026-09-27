// Выгрузка оценки картинкой и PDF: карточка (одна страница — балл и шесть
// категорий) и подробный отчёт (метрики, штрафы, рекомендации).
//
// Рисуем тем же движком, что и соцкартинки Next (next/og: satori + resvg),
// в светлой палитре сайта. PDF — те же страницы, собранные pdf-lib в A4:
// один макет на оба формата, и на Vercel не нужен браузер.
//
// Ограничения satori: только flex-раскладка, у блока с несколькими детьми
// обязателен display: flex. Высоту текста он сам не сообщает, поэтому
// страницы отчёта набираются по оценке высоты блоков — с запасом.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { PDFDocument } from 'pdf-lib';
import type { PublicReport } from '@/lib/public-report';
import { APP_TIME_ZONE } from '@/lib/time';

/** Масштаб: макет в «точках» A4 при 150 dpi, выводим в 1,5 раза плотнее. */
const S = 1.5;
const u = (n: number): number => Math.round(n * S * 100) / 100;

const PAGE_W = 1240;
const PAGE_H = 1754;
const CARD_W = 1080;
const CARD_H = 1350;
const PAD = 88;

const C = {
  paper: '#ffffff',
  paper2: '#fafafa',
  panel: '#f5f5f5',
  line: '#e5e5e5',
  line2: '#d4d4d4',
  muted2: '#a3a3a3',
  muted: '#737373',
  ink2: '#404040',
  ink: '#0a0a0a',
};

const ACCENT: Record<string, string> = {
  security: '#2f6f4f',
  code: '#2b4c8c',
  activity: '#b4472a',
  docs: '#8a6320',
  ci: '#6a3d9a',
  issues: '#1d6b78',
};

const EFFORT_LABELS: Record<string, string> = {
  trivial: 'минуты',
  small: 'час',
  medium: 'день',
  large: 'неделя и больше',
};

type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' };
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    ([
      [400, 'Inter_400Regular.ttf'],
      [600, 'Inter_600SemiBold.ttf'],
      [700, 'Inter_700Bold.ttf'],
    ] as const).map(async ([weight, file]) => {
      const buf = await readFile(path.join(process.cwd(), 'src/lib/poster/fonts', file));
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return { name: 'Inter', data, weight, style: 'normal' as const };
    }),
  );
  return fontsPromise;
}

export type ExportContext = {
  report: PublicReport;
  /** Адрес сайта для подписи внизу: pulse.example/a/… */
  host: string;
};

// ---------- общее ----------

function Globe({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <g fill="none" stroke={C.ink} strokeWidth="1.8">
        <circle cx="32" cy="32" r="30" />
        <ellipse cx="32" cy="11" rx="21.42" ry="5.57" />
        <ellipse cx="32" cy="32" rx="30" ry="7.8" />
        <ellipse cx="32" cy="53" rx="21.42" ry="5.57" />
        <ellipse cx="32" cy="32" rx="25.98" ry="30" />
        <ellipse cx="32" cy="32" rx="15" ry="30" />
        <ellipse cx="32" cy="32" rx="0.6" ry="30" />
      </g>
    </svg>
  );
}

function Brand({ note }: { note: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: u(14) }}>
        <Globe size={u(40)} />
        <span style={{ fontSize: u(30), fontWeight: 700, letterSpacing: u(-0.5) }}>Pulse</span>
      </div>
      <span style={{ fontSize: u(18), color: C.muted, textTransform: 'uppercase', letterSpacing: u(2) }}>{note}</span>
    </div>
  );
}

function Dial({ value, size }: { value: number | null; size: number }) {
  const r = 42;
  const len = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.line} strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={C.ink}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(len * v) / 100} ${len}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        }}
      >
        <span style={{ fontSize: size * 0.34, fontWeight: 700, lineHeight: 1, letterSpacing: -size * 0.01 }}>
          {value ?? '—'}
        </span>
        <span style={{ marginTop: size * 0.03, fontSize: size * 0.075, color: C.muted }}>из 100</span>
      </div>
    </div>
  );
}

function Bar({ value, color, height, width }: { value: number | null; color: string; height: number; width: number }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', width, height, borderRadius: height, background: C.line, overflow: 'hidden' }}>
      <div style={{ display: 'flex', width: (width * v) / 100, height, borderRadius: height, background: color }} />
    </div>
  );
}

/** Шесть категорий плитками по три в ряд: название, крупный балл, полоса. */
function CategoryTiles({ report, width }: { report: PublicReport; width: number }) {
  const gap = u(16);
  const tileW = (width - gap * 2) / 3;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap, width }}>
      {report.categories.map((c) => {
        const color = ACCENT[c.key] ?? C.ink;
        const empty = c.score == null;
        return (
          <div
            key={c.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: tileW,
              padding: u(22),
              borderRadius: u(22),
              border: `${u(1.5)}px solid ${C.line}`,
              background: C.paper2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: u(10) }}>
              <div style={{ display: 'flex', width: u(10), height: u(10), borderRadius: u(10), background: color }} />
              <span style={{ fontSize: u(19), color: C.ink2 }}>{c.title}</span>
            </div>
            <span
              style={{
                marginTop: u(12),
                fontSize: u(52),
                fontWeight: 700,
                lineHeight: 1,
                color: empty ? C.muted2 : C.ink,
              }}
            >
              {c.score ?? '—'}
            </span>
            <div style={{ display: 'flex', marginTop: u(16) }}>
              <Bar value={c.score} color={color} height={u(7)} width={tileW - u(44) - u(3)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RepoTitle({ report, size }: { report: PublicReport; size: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: size, fontWeight: 700, lineHeight: 1.1, letterSpacing: -size * 0.02 }}>
      <span style={{ color: C.muted2 }}>{report.repository.org}/</span>
      <span>{report.repository.repo}</span>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: u(10) }}>
      {items.map((t) => (
        <span
          key={t}
          style={{
            display: 'flex',
            padding: `${u(7)}px ${u(16)}px`,
            borderRadius: u(99),
            background: C.panel,
            fontSize: u(18),
            color: C.ink2,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function metaChips(report: PublicReport): string[] {
  const items = [report.repository.language ?? 'Язык не определён'];
  if (report.analyzedAt) items.push(`Оценено ${formatDate(report.analyzedAt)}`);
  if (report.coverage != null) items.push(`Данных собрано ${Math.round(report.coverage * 100)}%`);
  return items;
}

function Footer({ host, id, page }: { host: string; id: string; page?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: u(20),
        borderTop: `${u(1.5)}px solid ${C.line}`,
        fontSize: u(17),
        color: C.muted,
      }}
    >
      <span>
        {host}/a/{id}
      </span>
      <span>{page ?? 'Pulse · оценка здоровья репозиториев SourceCraft'}</span>
    </div>
  );
}

function Frame({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: u(width),
        height: u(height),
        padding: u(PAD),
        background: C.paper,
        color: C.ink,
        fontFamily: 'Inter',
      }}
    >
      {children}
    </div>
  );
}

// ---------- карточка ----------

function CardPoster({ report, host }: ExportContext) {
  const inner = u(CARD_W - PAD * 2);
  const material = report.kind === 'material';
  return (
    <Frame width={CARD_W} height={CARD_H}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Brand note="Карточка репозитория" />
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: u(56) }}>
          <RepoTitle report={report} size={u(64)} />
          <div style={{ display: 'flex', marginTop: u(22) }}>
            <Chips items={metaChips(report)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: u(44), marginTop: u(48), width: inner }}>
          {material ? (
            <span style={{ fontSize: u(56), fontWeight: 700 }}>Полезный материал</span>
          ) : (
            <>
              <Dial value={report.score} size={u(250)} />
              <div style={{ display: 'flex', flexDirection: 'column', width: inner - u(250) - u(44) }}>
                <span style={{ fontSize: u(20), color: C.muted, textTransform: 'uppercase', letterSpacing: u(2) }}>
                  Балл здоровья
                </span>
                <span style={{ marginTop: u(10), fontSize: u(30), lineHeight: 1.3, color: C.ink2 }}>
                  {verdict(report.score)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      {!material && <CategoryTiles report={report} width={inner} />}
      <Footer host={host} id={report.id} />
    </Frame>
  );
}

function verdict(score: number | null): string {
  if (score == null) return 'Оценки нет';
  if (score >= 85) return 'Отличное состояние: проект ухожен по всем направлениям.';
  if (score >= 70) return 'Хорошее состояние, есть что подтянуть.';
  if (score >= 50) return 'Среднее состояние: заметные пробелы.';
  if (score >= 30) return 'Слабое состояние: многое стоит поправить.';
  return 'Проекту нужна серьёзная работа.';
}

// ---------- подробный отчёт ----------

/** keepWithNext — заголовок раздела не остаётся один внизу страницы. */
type Block = { height: number; node: React.ReactNode; keepWithNext?: boolean };

const TEXT_W = PAGE_W - PAD * 2;

/** Грубая оценка высоты абзаца: средняя ширина знака Inter ≈ 0,54 кегля. */
function textHeight(text: string, size: number, width: number, lineHeight = 1.4): number {
  const perLine = Math.max(1, Math.floor(width / (size * 0.54)));
  const lines = text
    .split('\n')
    .reduce((n, part) => n + Math.max(1, Math.ceil(part.length / perLine)), 0);
  return lines * size * lineHeight;
}

function SectionTitle({ children }: { children: string }) {
  return <span style={{ fontSize: u(34), fontWeight: 700, letterSpacing: u(-0.5) }}>{children}</span>;
}

function summaryBlocks(report: PublicReport): Block[] {
  const material = report.kind === 'material';
  const blocks: Block[] = [
    {
      height: 160,
      node: (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <RepoTitle report={report} size={u(60)} />
          <div style={{ display: 'flex', marginTop: u(20) }}>
            <Chips items={metaChips(report)} />
          </div>
        </div>
      ),
    },
    {
      height: 260,
      node: material ? (
        <span style={{ fontSize: u(52), fontWeight: 700 }}>Полезный материал</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: u(40), width: u(TEXT_W) }}>
          <Dial value={report.score} size={u(230)} />
          <div style={{ display: 'flex', flexDirection: 'column', width: u(TEXT_W - 230 - 40) }}>
            <span style={{ fontSize: u(19), color: C.muted, textTransform: 'uppercase', letterSpacing: u(2) }}>
              Балл здоровья
            </span>
            <span style={{ marginTop: u(10), fontSize: u(28), lineHeight: 1.3, color: C.ink2 }}>
              {verdict(report.score)}
            </span>
            {report.unranked && (
              <span style={{ marginTop: u(12), fontSize: u(19), lineHeight: 1.4, color: C.muted }}>{report.unranked}</span>
            )}
          </div>
        </div>
      ),
    },
  ];
  if (!material && report.categories.length > 0) {
    blocks.push({ height: 420, node: <CategoryTiles report={report} width={u(TEXT_W)} /> });
  }
  if (report.penalties.length > 0) {
    const rows = report.penalties.map((p) => ({ p, h: textHeight(p.reason, 20, TEXT_W - 120) + 16 }));
    blocks.push({
      height: 60 + rows.reduce((n, r) => n + r.h, 0),
      node: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
          <span style={{ fontSize: u(24), fontWeight: 600 }}>Штрафы</span>
          {report.penalties.map((p) => (
            <div key={p.key} style={{ display: 'flex', gap: u(16), fontSize: u(20), lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: ACCENT.activity, width: u(70) }}>−{p.amount}</span>
              <span style={{ flex: 1, color: C.ink2 }}>{p.reason}</span>
            </div>
          ))}
        </div>
      ),
    });
  }
  return blocks;
}

function categoryBlocks(report: PublicReport): Block[] {
  if (report.kind === 'material') return [];
  const blocks: Block[] = [{ height: 70, keepWithNext: true, node: <SectionTitle>Категории и метрики</SectionTitle> }];
  for (const c of report.categories) {
    const color = ACCENT[c.key] ?? C.ink;
    const metrics = c.metrics.map((m) => ({
      m,
      h: 34 + (m.hint ? textHeight(m.hint, 17, TEXT_W - 300) : 0) + 14,
    }));
    blocks.push({
      height: 96 + metrics.reduce((n, r) => n + r.h, 0) + 24,
      node: (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: u(26),
            borderRadius: u(24),
            border: `${u(1.5)}px solid ${C.line}`,
            background: C.paper2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
              <div style={{ display: 'flex', width: u(12), height: u(12), borderRadius: u(12), background: color }} />
              <span style={{ fontSize: u(26), fontWeight: 600 }}>{c.title}</span>
              {c.weightPercent != null && (
                <span style={{ fontSize: u(18), color: C.muted }}>вес {c.weightPercent}%</span>
              )}
            </div>
            <span style={{ fontSize: u(36), fontWeight: 700, color: c.score == null ? C.muted2 : C.ink }}>
              {c.score ?? '—'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: u(14), gap: u(14) }}>
            {c.metrics.map((m) => (
              <div key={m.key} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: u(16) }}>
                  <span style={{ flex: 1, fontSize: u(20), color: m.score == null ? C.muted : C.ink }}>{m.title}</span>
                  <Bar value={m.score} color={color} height={u(6)} width={u(180)} />
                  <span
                    style={{
                      width: u(56),
                      fontSize: u(20),
                      fontWeight: 600,
                      textAlign: 'right',
                      color: m.score == null ? C.muted2 : C.ink,
                    }}
                  >
                    {m.score ?? '—'}
                  </span>
                </div>
                {m.hint && (
                  <span style={{ marginTop: u(4), paddingRight: u(270), fontSize: u(17), lineHeight: 1.4, color: C.muted }}>
                    {m.hint}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }
  return blocks;
}

function recommendationBlocks(report: PublicReport): Block[] {
  if (report.recommendations.length === 0) return [];
  const blocks: Block[] = [{ height: 70, keepWithNext: true, node: <SectionTitle>Что сделать</SectionTitle> }];
  report.recommendations.forEach((r, i) => {
    const w = TEXT_W - 140;
    const h =
      60 +
      textHeight(r.title, 24, w, 1.3) +
      (r.now ? textHeight(`Сейчас: ${r.now}`, 19, w) + 8 : 0) +
      (r.how ? textHeight(r.how, 19, w) + 8 : 0) +
      36;
    blocks.push({
      height: h,
      node: (
        <div style={{ display: 'flex', gap: u(20), paddingBottom: u(22), borderBottom: `${u(1.5)}px solid ${C.line}` }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: u(44),
              height: u(44),
              borderRadius: u(44),
              background: C.ink,
              color: C.paper,
              fontSize: u(20),
              fontWeight: 700,
            }}
          >
            {i + 1}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: u(16) }}>
              <span style={{ flex: 1, fontSize: u(24), fontWeight: 600, lineHeight: 1.3 }}>{r.title}</span>
              <span style={{ fontSize: u(22), fontWeight: 700, color: ACCENT[r.category] ?? C.ink }}>+{r.gain}</span>
            </div>
            {r.now && (
              <span style={{ marginTop: u(8), fontSize: u(19), lineHeight: 1.4, color: C.muted }}>Сейчас: {r.now}</span>
            )}
            {r.how && <span style={{ marginTop: u(8), fontSize: u(19), lineHeight: 1.4, color: C.ink2 }}>{r.how}</span>}
            <span style={{ marginTop: u(10), fontSize: u(16), color: C.muted }}>
              Усилия: {EFFORT_LABELS[r.effort] ?? r.effort}
            </span>
          </div>
        </div>
      ),
    });
  });
  return blocks;
}

function missingBlocks(report: PublicReport): Block[] {
  if (report.missing.length === 0) return [];
  const text = (m: { text: string; detail: string | null }): string => (m.detail ? `${m.text} — ${m.detail}` : m.text);
  const h = 70 + report.missing.reduce((n, m) => n + textHeight(text(m), 19, TEXT_W - 30) + 10, 0);
  return [
    {
      height: h,
      node: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
          <span style={{ fontSize: u(24), fontWeight: 600 }}>Каких данных нет</span>
          {report.missing.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: u(12), fontSize: u(19), lineHeight: 1.4, color: C.ink2 }}>
              <span style={{ color: C.muted2 }}>•</span>
              <span style={{ flex: 1 }}>{text(m)}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];
}

const BLOCK_GAP = 36;
const HEADER_H = 60 + 48;
const FOOTER_H = 80;

/** Раскладывает блоки по страницам A4. Блок выше страницы идёт один. */
function paginate(blocks: Block[]): Block[][] {
  const room = PAGE_H - PAD * 2 - HEADER_H - FOOTER_H;
  const pages: Block[][] = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    // Заголовок меряем вместе со следующим блоком: переносятся они вместе.
    const next = b.keepWithNext ? blocks[i + 1] : undefined;
    const need = (used > 0 ? BLOCK_GAP : 0) + b.height + (next ? BLOCK_GAP + next.height : 0);
    if (used > 0 && used + need > room) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1]!.push(b);
    used += used > 0 ? BLOCK_GAP + b.height : b.height;
  });
  return pages;
}

function ReportPage({
  blocks,
  ctx,
  page,
  total,
  height,
}: {
  blocks: Block[];
  ctx: ExportContext;
  page: number;
  total: number;
  height: number;
}) {
  return (
    <Frame width={PAGE_W} height={height}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Brand note={page === 1 ? 'Отчёт об оценке' : `${ctx.report.repository.org}/${ctx.report.repository.repo}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(BLOCK_GAP), marginTop: u(48) }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              {b.node}
            </div>
          ))}
        </div>
      </div>
      <Footer host={ctx.host} id={ctx.report.id} page={total > 1 ? `Страница ${page} из ${total}` : undefined} />
    </Frame>
  );
}

function reportBlocks(report: PublicReport): Block[] {
  return [
    ...summaryBlocks(report),
    ...categoryBlocks(report),
    ...recommendationBlocks(report),
    ...missingBlocks(report),
  ];
}

// ---------- вывод ----------

async function toPng(node: React.ReactElement, width: number, height: number): Promise<Uint8Array> {
  const res = new ImageResponse(node, { width: u(width), height: u(height), fonts: await loadFonts() });
  return new Uint8Array(await res.arrayBuffer());
}

export async function renderCardPng(ctx: ExportContext): Promise<Uint8Array> {
  return toPng(<CardPoster {...ctx} />, CARD_W, CARD_H);
}

/** Весь отчёт одним длинным плакатом: высота — сумма оценок блоков. */
export async function renderReportPng(ctx: ExportContext): Promise<Uint8Array> {
  const blocks = reportBlocks(ctx.report);
  // Оценки высот намеренно с запасом (для PDF страница не должна переполниться);
  // на длинном плакате запас дал бы пустой хвост, поэтому его ужимаем.
  const content = blocks.reduce((n, b, i) => n + b.height + (i > 0 ? BLOCK_GAP : 0), 0) * 0.88;
  const height = Math.max(PAGE_H, Math.ceil(PAD * 2 + HEADER_H + FOOTER_H + content));
  return toPng(<ReportPage blocks={blocks} ctx={ctx} page={1} total={1} height={height} />, PAGE_W, height);
}

/** A4 в пунктах PDF. */
const A4: [number, number] = [595.28, 841.89];

export async function renderCardPdf(ctx: ExportContext): Promise<Uint8Array> {
  const pdf = await newPdf(ctx);
  const png = await pdf.embedPng(await renderCardPng(ctx));
  // Карточка 4:5 по центру листа A4 с полями.
  const page = pdf.addPage(A4);
  const w = A4[0] - 60;
  const h = (w * CARD_H) / CARD_W;
  page.drawImage(png, { x: 30, y: (A4[1] - h) / 2, width: w, height: h });
  return pdf.save();
}

export async function renderReportPdf(ctx: ExportContext): Promise<Uint8Array> {
  const pdf = await newPdf(ctx);
  const pages = paginate(reportBlocks(ctx.report));
  for (let i = 0; i < pages.length; i += 1) {
    const bytes = await toPng(
      <ReportPage blocks={pages[i]!} ctx={ctx} page={i + 1} total={pages.length} height={PAGE_H} />,
      PAGE_W,
      PAGE_H,
    );
    const png = await pdf.embedPng(bytes);
    const page = pdf.addPage(A4);
    page.drawImage(png, { x: 0, y: 0, width: A4[0], height: A4[1] });
  }
  return pdf.save();
}

async function newPdf(ctx: ExportContext): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Pulse — ${ctx.report.repository.org}/${ctx.report.repository.repo}`);
  pdf.setCreator('Pulse');
  pdf.setProducer('Pulse');
  return pdf;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
