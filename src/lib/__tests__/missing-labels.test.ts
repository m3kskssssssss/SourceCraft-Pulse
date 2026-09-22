import { describe, expect, it } from 'vitest';
import { describeMissing, describeMissingList } from '../missing-labels';

describe('describeMissing', () => {
  it('переводит известный ключ', () => {
    expect(describeMissing('readme_missing').text).toBe('В репозитории нет README');
  });

  it('вытаскивает уточнение после двоеточия', () => {
    const note = describeMissing('tree_fetch_failed:timeout');
    expect(note.text).toBe('Дерево файлов не пришло из API');
    expect(note.detail).toBe('timeout');
  });

  it('незнакомый ключ показывает как есть', () => {
    const note = describeMissing('какая_то_новая_причина');
    expect(note.detail).toBe('какая_то_новая_причина');
  });
});

describe('describeMissingList', () => {
  it('не показывает отсутствие lock-файла: это норма, а не пробел', () => {
    const notes = describeMissingList(['no_supported_lockfile_found', 'readme_missing']);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.raw).toBe('readme_missing');
  });

  it('оставляет lock-файл, который мы не умеем разбирать', () => {
    const notes = describeMissingList(['deps_lockfile_unsupported:Cargo.lock']);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.detail).toBe('Cargo.lock');
  });

  it('список только из скрытых ключей становится пустым', () => {
    expect(describeMissingList(['no_supported_lockfile_found'])).toEqual([]);
  });
});
