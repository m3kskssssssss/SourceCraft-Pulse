// Общее для оценок и обсуждения: шкала и формы данных.
//
// Отдельный файл, потому что звёзды рисует клиентский компонент, а social.ts
// тянет за собой драйвер Postgres. Значение шкалы должно быть одно и то же и
// у кнопки, и у проверки на сервере, иначе разъедутся.

/** Сколько звёзд максимум. Шкала целая: 1..5. */
export const MAX_RATING = 5;

export type RatingSummary = {
  /** Средняя оценка, округлённая до одного знака. null — никто не оценивал. */
  average: number | null;
  count: number;
  /** Оценка текущего пользователя, если он её ставил. */
  mine: number | null;
};

export type CommentAuthor = {
  id: string;
  displayName: string;
  hasAvatar: boolean;
  avatarVersion: string | null;
};

/** Агрегаты по одному анализу — для карточки рейтинга и страницы анализа. */
export type AnalysisSocial = {
  ratingAverage: number | null;
  ratingCount: number;
  commentCount: number;
};

export const EMPTY_SOCIAL: AnalysisSocial = {
  ratingAverage: null,
  ratingCount: 0,
  commentCount: 0,
};
