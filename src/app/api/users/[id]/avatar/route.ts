// Фото профиля. Лежит в базе, отдаётся отсюда.
//
// Адрес публичный: аватар видно под каждым комментарием, и прятать его за
// сессией смысла нет. В адресе есть ?v=<метка времени> — по ней и кэшируем
// надолго: сменили фото, сменилась метка, браузер сходит за новым.

import { NextResponse, type NextRequest } from 'next/server';
import { getAvatarBytes } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const avatar = await getAvatarBytes(id);
  if (!avatar) {
    return new NextResponse('Not found', { status: 404 });
  }

  const requestedVersion = request.nextUrl.searchParams.get('v');
  const immutable = requestedVersion === avatar.version;

  return new NextResponse(new Uint8Array(avatar.data), {
    headers: {
      'Content-Type': avatar.mime,
      'Content-Length': String(avatar.data.length),
      'Cache-Control': immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=60, must-revalidate',
      ETag: `"${avatar.version}"`,
    },
  });
}
