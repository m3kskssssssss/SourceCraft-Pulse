// Кнопка «Войти с Яндекс ID» по правилам Яндекса: основной вариант —
// чёрная кнопка-таблетка, красный круглый знак с белой «Я» и белый текст.
// Цвет, обводку и содержимое кнопки менять нельзя, высота — из их сетки
// (M, 44 px). Знак и контур «Я» взяты из официальных SVG документации
// Яндекс ID (yandex.ru/dev/id/doc/ru/codes/buttons-design).
//
// Серверная форма: действие само уводит на oauth.yandex.ru, а оттуда
// Auth.js возвращает на главную.

import { yandexSignInAction } from '@/app/actions/auth';

/** Контур «Я» из официальной кнопки; там знак стоит в точке (44, 16). */
const YA_PATH = 'M57.6912 35.212H60.1982V20.812H56.5516C52.8843 20.812 50.9574 22.6975 50.9574 25.4739C50.9574 27.6909 52.0141 28.9962 53.8995 30.3429L50.6259 35.212H53.3401L56.9867 29.7628L55.7228 28.9133C54.1896 27.8773 53.4437 27.0693 53.4437 25.3288C53.4437 23.7956 54.5211 22.7596 56.5723 22.7596H57.6912V35.212Z';

function YandexMark() {
  return (
    <svg viewBox="44 16 24 24" width="24" height="24" aria-hidden className="shrink-0">
      <rect x="44" y="16" width="24" height="24" rx="12" fill="#FC3F1D" />
      <path d={YA_PATH} fill="#fff" />
    </svg>
  );
}

export function YandexButton() {
  return (
    <form action={yandexSignInAction}>
      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-[15px] font-medium text-white ring-1 ring-inset ring-white/15 transition hover:bg-[#1f1f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC3F1D] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]"
      >
        <YandexMark />
        Войти с Яндекс ID
      </button>
    </form>
  );
}

/** Разделитель «или» между кнопкой Яндекса и формой с паролем. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-[color:var(--muted-2)]">
      <span className="h-px flex-1 bg-[color:var(--line)]" />
      или по почте
      <span className="h-px flex-1 bg-[color:var(--line)]" />
    </div>
  );
}
