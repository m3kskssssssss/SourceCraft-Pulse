// Тело статьи из блоков. Код прокручивается внутри своего блока — страница
// на телефоне вбок не уезжает; схемы тянутся на всю ширину колонки.

import type { Block } from '@/lib/learn/types';
import { Figure } from './Figures';

export function ArticleBody({ body }: { body: Block[] }) {
  let figureNo = 0;
  return (
    <div className="text-[17px] leading-[1.7] text-[color:var(--ink-2)]">
      {body.map((block, i) => {
        switch (block.type) {
          case 'p':
            return <p key={i} className="mt-5">{block.text}</p>;
          case 'h2':
            return (
              <h2 key={i} className="mt-12 text-2xl font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
                {block.text}
              </h2>
            );
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag
                key={i}
                className={`mt-5 space-y-2 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-[color:var(--muted)]`}
              >
                {block.items.map((item) => (
                  <li key={item} className="pl-1">{item}</li>
                ))}
              </Tag>
            );
          }
          case 'code':
            return (
              <pre
                key={i}
                className="mt-5 overflow-x-auto rounded-2xl bg-[color:var(--ink)] px-5 py-4 font-mono text-[13px] leading-relaxed text-[color:var(--paper)]"
              >
                <code>{block.code}</code>
              </pre>
            );
          case 'note':
            return (
              <aside
                key={i}
                className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-4 text-[15px] leading-relaxed"
              >
                {block.text}
              </aside>
            );
          case 'figure':
            figureNo += 1;
            return (
              <figure key={i} className="mt-8 rounded-3xl border border-[color:var(--line)] p-4 sm:p-6">
                <Figure id={block.id} />
                <figcaption className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
                  <span className="font-medium text-[color:var(--ink)]">Рис. {figureNo}.</span> {block.caption}
                </figcaption>
              </figure>
            );
        }
      })}
    </div>
  );
}
