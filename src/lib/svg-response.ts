// Ответ с SVG бейджа или карточки.
//
// Без кэша: после переоценки картинка в README должна сразу показать новый
// балл, а CDN и прокси картинок держали старую до пятнадцати минут. Чтобы
// не гонять одинаковый SVG, отдаём ETag — повторный запрос с If-None-Match
// получает короткий 304.

import { createHash } from 'node:crypto';

export function svgResponse(request: Request, svg: string, status: number): Response {
  const etag = `"${createHash('sha1').update(svg).digest('base64url')}"`;
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    ETag: etag,
  };
  if (status === 200 && request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(svg, { status, headers });
}
