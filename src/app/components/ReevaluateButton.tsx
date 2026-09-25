// «Оценить заново» на публичных страницах репозитория и анализа.
//
// Раньше кнопка вела на пустую форму /analyze, и адрес приходилось вставлять
// снова. Теперь репозиторий известен сразу:
//   - подтверждённому владельцу — та же кнопка, что в «Моих репозиториях»:
//     оценка ставится его правами и идёт в бейдж (приватный — остаётся личным);
//   - остальным — /analyze?target=org/repo: оценка запускается без ввода.

import Link from 'next/link';
import { EvaluateButton } from './OwnedRepos';
import { cx } from './ui';

export function ReevaluateButton({
  org,
  repo,
  ownedId,
  label = 'Оценить заново',
  primary = false,
}: {
  org: string;
  repo: string;
  /** Запись «мой репозиторий», если смотрит владелец. */
  ownedId: string | null;
  label?: string;
  primary?: boolean;
}) {
  if (ownedId) return <EvaluateButton id={ownedId} again={!primary} />;
  return (
    <Link
      href={`/analyze?target=${encodeURIComponent(`${org}/${repo}`)}`}
      className={cx(
        'rounded-full px-4 py-2 text-sm transition',
        primary
          ? 'bg-[color:var(--ink)] font-medium text-[color:var(--paper)] hover:bg-[color:var(--ink-2)]'
          : 'border border-[color:var(--line)] text-[color:var(--ink)] hover:bg-[color:var(--panel)]',
      )}
    >
      {label}
    </Link>
  );
}
