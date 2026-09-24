// Карточка статьи: верхняя половина — 8-битная сцена, нижняя — уровень,
// время чтения, заголовок и одна строка о чём статья.

import Link from 'next/link';
import type { ArticleSummary } from '@/lib/learn';
import { LEVEL_LABEL } from '@/lib/learn/types';
import { Chip } from '../ui';
import { PixelScene } from './PixelScene';

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--line)] bg-[color:var(--paper)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]"
    >
      <PixelScene scene={article.scene} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={article.level === 'senior' ? 'ink' : 'outline'}>{LEVEL_LABEL[article.level]}</Chip>
          <span className="text-xs text-[color:var(--muted)]">{article.minutes} мин чтения</span>
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight group-hover:underline group-hover:underline-offset-4">
          {article.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">{article.summary}</p>
      </div>
    </Link>
  );
}
