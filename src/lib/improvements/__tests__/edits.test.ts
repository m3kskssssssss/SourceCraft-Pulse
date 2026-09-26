import { describe, expect, it } from 'vitest';
import { applySearchReplace, detectEol, isEditablePath, lineDiff, withEol } from '../edits';

describe('applySearchReplace', () => {
  const file = 'function a() {\n  return 1;\n}\n\nfunction b() {\n  return 2;\n}\n';

  it('заменяет фрагмент, который встречается ровно один раз', () => {
    const result = applySearchReplace(file, [{ search: '  return 2;', replace: '  return 3;' }]);
    expect(result).toEqual({ ok: true, content: file.replace('return 2', 'return 3') });
  });

  it('применяет блоки по очереди', () => {
    const result = applySearchReplace(file, [
      { search: 'function a()', replace: 'function first()' },
      { search: 'function first() {\n  return 1;', replace: 'function first() {\n  return 10;' },
    ]);
    expect(result.ok && result.content).toContain('return 10;');
  });

  it('отбрасывает правку, если фрагмент не найден', () => {
    const result = applySearchReplace(file, [{ search: 'return 42;', replace: 'return 0;' }]);
    expect(result.ok).toBe(false);
  });

  it('отбрасывает неоднозначный фрагмент', () => {
    const result = applySearchReplace(file, [{ search: '  return', replace: '  yield' }]);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.reason).toContain('несколько раз');
  });

  it('понимает фрагмент с CRLF от модели', () => {
    const result = applySearchReplace(file, [{ search: 'function b() {\r\n  return 2;', replace: 'function b() {\n  return 5;' }]);
    expect(result.ok && result.content).toContain('return 5;');
  });

  it('не считает правкой замену на то же самое', () => {
    expect(applySearchReplace(file, [{ search: 'return 1;', replace: 'return 1;' }]).ok).toBe(false);
  });
});

describe('переводы строк', () => {
  it('определяет CRLF и возвращает его после правки', () => {
    const crlf = 'a\r\nb\r\nc\r\n';
    expect(detectEol(crlf)).toBe('\r\n');
    expect(detectEol('a\nb\n')).toBe('\n');
    expect(withEol('x\ny\n', '\r\n')).toBe('x\r\ny\r\n');
  });
});

describe('isEditablePath', () => {
  it('пускает обычные файлы проекта', () => {
    expect(isEditablePath('src/index.ts')).toBe(true);
    expect(isEditablePath('README.md')).toBe(true);
    expect(isEditablePath('.env.example')).toBe(true);
  });

  it('не пускает лок-файлы, CI, секреты и выход из репозитория', () => {
    for (const path of [
      'pnpm-lock.yaml',
      'app/package-lock.json',
      '.github/workflows/ci.yml',
      '.sourcecraft/ci.yaml',
      '.env',
      '.env.production',
      '../etc/passwd',
      '/abs/path',
      'src//double',
      '.git/config',
      'logo.png',
    ]) {
      expect(isEditablePath(path), path).toBe(false);
    }
  });
});

describe('lineDiff', () => {
  it('считает добавленные и удалённые строки и оставляет контекст', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n') + '\n';
    const after = before.replace('line 10\n', 'line ten\n');
    const diff = lineDiff(before, after);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.lines[0]).toEqual({ t: 'gap', skipped: 7 });
    expect(diff.lines.filter((l) => l.t === 'ctx')).toHaveLength(6);
    expect(diff.lines.at(-1)).toEqual({ t: 'gap', skipped: 6 });
  });

  it('новый файл — все строки добавлены', () => {
    const diff = lineDiff('', 'a\nb\n');
    expect(diff).toMatchObject({ added: 2, removed: 0 });
    expect(diff.lines).toEqual([
      { t: 'add', text: 'a' },
      { t: 'add', text: 'b' },
    ]);
  });
});
