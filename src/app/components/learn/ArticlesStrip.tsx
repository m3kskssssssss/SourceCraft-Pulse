'use client';

// Шесть случайных статей в одну линию для главной. Страница кэшируется
// (revalidate), поэтому выбор делается в браузере: у каждого посетителя и на
// каждом заходе — свой набор. До перемешивания стоят первые шесть, чтобы
// разметка с сервера не была пустой; после — карточки проявляются заново.

import { useEffect, useState } from 'react';
import type { ArticleSummary } from '@/lib/learn';
import { ArticleCard } from './ArticleCard';

const COUNT = 6;

export function ArticlesStrip({ articles }: { articles: ArticleSummary[] }) {
  const [picked, setPicked] = useState(() => articles.slice(0, COUNT));
  const [round, setRound] = useState(0);

  useEffect(() => {
    const pool = [...articles];
    // Фишер — Йетс: честное перемешивание, без перекоса sort(() => Math.random()).
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    setPicked(pool.slice(0, COUNT));
    setRound(1);
  }, [articles]);

  return (
    // Одна линия на любом экране: лента с прокруткой вбок и примагничиванием.
    <div className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:scroll-px-6 sm:px-6 [scrollbar-width:thin]">
      {picked.map((a, i) => (
        <div
          key={`${round}-${a.slug}`}
          className="rise w-[78%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/3.4)]"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <ArticleCard article={a} />
        </div>
      ))}
    </div>
  );
}
