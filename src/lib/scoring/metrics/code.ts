// Метрики категории «Работа с кодом».
//
// Считаем по самому коду: сколько тестов, насколько крупные файлы, много ли
// пояснений, сколько незакрытых TODO. Источник — git/code-facts.ts, то есть
// файлы из клона, а не признаки вокруг репозитория.
//
// Если клон не получился, факты по коду недоступны: метрики по исходникам
// честно уходят в unknown, а тесты подхватываются запасным признаком из
// дерева файлов («есть каталог с тестами»), чтобы категория не обнулялась.

import type { RepoFacts } from '../../collect';
import {
  CODE_WEIGHTS,
  COMMENT_SHARE_TARGET,
  LONG_FILE_SHARE_BEST,
  LONG_FILE_SHARE_WORST,
  TESTS_PER_100_FILES_TARGET,
  TODO_PER_KLOC_BEST,
  TODO_PER_KLOC_WORST,
} from '../config';
import { boolScore, invertedLinearScore, linearScore } from '../normalize';
import { isUnknown } from '../facts-helpers';
import type { MetricScore } from '../types';

const CATEGORY = 'code' as const;

export function computeCodeMetrics(facts: RepoFacts): MetricScore[] {
  return [
    testsMetric(facts),
    fileSizeMetric(facts),
    commentsMetric(facts),
    todoDebtMetric(facts),
    hasLinterMetric(facts),
    hasBuildManifestMetric(facts),
    hasGitignoreMetric(facts),
    hasEditorConfigMetric(facts),
    lockfileMetric(facts),
    dependencyBotMetric(facts),
  ];
}

/** Флаг из дерева файлов: одинаковая обвязка для трёх метрик ниже. */
function treeFlagMetric(
  facts: RepoFacts,
  spec: {
    key: string;
    weight: number;
    flag: boolean;
    yes: string;
    no: string;
    effort: 'trivial' | 'small' | 'medium' | 'large';
    recommendationKind: string;
  },
): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: spec.key,
      category: CATEGORY,
      weight: spec.weight,
      value: null,
      unknown: true,
      hint: 'Дерево файлов недоступно',
    };
  }
  return {
    key: spec.key,
    category: CATEGORY,
    weight: spec.weight,
    value: boolScore(spec.flag),
    hint: spec.flag ? spec.yes : spec.no,
    target: 100,
    effort: spec.effort,
    recommendationKind: spec.recommendationKind,
  };
}

/** Манифест сборки: без него непонятно, как проект ставить и собирать. */
function hasBuildManifestMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'code.build_manifest',
    weight: CODE_WEIGHTS.hasBuildManifest,
    flag: facts.tree.flags.hasBuildManifest,
    yes: 'Манифест сборки есть',
    no: 'Манифеста сборки нет',
    effort: 'small',
    recommendationKind: 'add_build_manifest',
  });
}

/** .gitignore: без него в репозиторий попадает сборка и локальный мусор. */
function hasGitignoreMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'code.gitignore',
    weight: CODE_WEIGHTS.hasGitignore,
    flag: facts.tree.flags.hasGitignore,
    yes: '.gitignore есть',
    no: '.gitignore отсутствует',
    effort: 'trivial',
    recommendationKind: 'add_gitignore',
  });
}

/** .editorconfig: отступы и переводы строк одинаковы у всех редакторов. */
function hasEditorConfigMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'code.editorconfig',
    weight: CODE_WEIGHTS.hasEditorConfig,
    flag: facts.tree.flags.hasEditorConfig,
    yes: '.editorconfig есть',
    no: '.editorconfig отсутствует',
    effort: 'trivial',
    recommendationKind: 'add_editorconfig',
  });
}

function testsMetric(facts: RepoFacts): MetricScore {
  const base = {
    key: 'code.tests',
    category: CATEGORY,
    weight: CODE_WEIGHTS.tests,
    effort: 'medium' as const,
    recommendationKind: 'add_tests',
  };

  const ratio = facts.code.testsPer100SourceFiles;
  if (facts.code.available && ratio !== null) {
    return {
      ...base,
      // Цель — не «сто процентов», а заметная доля тестов: до идеала по этой
      // шкале не дотягивает почти никто, и рекомендация висела бы всегда.
      target: 60,
      value: linearScore(ratio, { min: 0, max: TESTS_PER_100_FILES_TARGET }),
      hint:
        facts.code.testFiles > 0
          ? `${facts.code.testFiles} файлов тестов на ${facts.code.sourceFiles} файлов кода`
          : `Тестов не нашли среди ${facts.code.sourceFiles} файлов кода`,
    };
  }

  // Клон не прочитался — остаётся только галочка из дерева файлов.
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return {
      key: base.key,
      category: CATEGORY,
      weight: base.weight,
      value: null,
      unknown: true,
      hint: 'Ни клон, ни дерево файлов недоступны',
    };
  }
  const hasTestsDir = facts.tree.flags.hasTestsDir;
  return {
    ...base,
    // Запасной признак двоичный, поэтому и цель здесь — «тесты просто есть».
    target: 100,
    value: boolScore(hasTestsDir),
    hint: hasTestsDir
      ? 'Код прочитать не удалось; в дереве есть каталог тестов'
      : 'Код прочитать не удалось; каталога тестов в дереве нет',
  };
}

function fileSizeMetric(facts: RepoFacts): MetricScore {
  const share = facts.code.longFileSharePercent;
  if (!facts.code.available || share === null) return unknownCodeMetric('code.file_size', CODE_WEIGHTS.fileSize);

  const median = facts.code.medianFileLines;
  return {
    key: 'code.file_size',
    category: CATEGORY,
    weight: CODE_WEIGHTS.fileSize,
    value: invertedLinearScore(share, { best: LONG_FILE_SHARE_BEST, worst: LONG_FILE_SHARE_WORST }),
    hint: `${share}% файлов длиннее 500 строк, медиана — ${median ?? '?'} строк`,
    target: 70,
    effort: 'large',
    recommendationKind: 'split_long_files',
  };
}

function commentsMetric(facts: RepoFacts): MetricScore {
  const share = facts.code.commentSharePercent;
  if (!facts.code.available || share === null) return unknownCodeMetric('code.comments', CODE_WEIGHTS.comments);

  return {
    key: 'code.comments',
    category: CATEGORY,
    weight: CODE_WEIGHTS.comments,
    value: linearScore(share, { min: 0, max: COMMENT_SHARE_TARGET }),
    hint: `${share}% строк — комментарии`,
    target: 60,
    effort: 'small',
    recommendationKind: 'explain_code',
  };
}

function todoDebtMetric(facts: RepoFacts): MetricScore {
  const perKilo = facts.code.todoPerKiloLines;
  if (!facts.code.available || perKilo === null) return unknownCodeMetric('code.todo_debt', CODE_WEIGHTS.todoDebt);

  return {
    key: 'code.todo_debt',
    category: CATEGORY,
    weight: CODE_WEIGHTS.todoDebt,
    value: invertedLinearScore(perKilo, { best: TODO_PER_KLOC_BEST, worst: TODO_PER_KLOC_WORST }),
    hint: `${perKilo} пометок TODO/FIXME на 1000 строк`,
    target: 70,
    effort: 'small',
    recommendationKind: 'close_todo',
  };
}

function hasLinterMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return unknownTreeMetric('code.has_linter', CODE_WEIGHTS.hasLinter);
  }
  const hasLinter = facts.tree.flags.hasLinterConfig;
  return {
    key: 'code.has_linter',
    category: CATEGORY,
    weight: CODE_WEIGHTS.hasLinter,
    value: boolScore(hasLinter),
    hint: hasLinter ? 'Обнаружен конфиг линтера' : 'Конфиг линтера не найден',
    target: 100,
    effort: 'small',
    recommendationKind: 'add_linter',
  };
}

/**
 * Lock-файл: версии зависимостей зафиксированы, сборка воспроизводима.
 * Считаем любой известный lock-файл, в том числе те, что мы не разбираем.
 */
function lockfileMetric(facts: RepoFacts): MetricScore {
  if (isUnknown(facts, 'tree_fetch_failed')) {
    return unknownTreeMetric('code.lockfile', CODE_WEIGHTS.lockfile);
  }
  const has =
    facts.tree.flags.supportedLockfiles.length > 0 ||
    facts.tree.flags.unsupportedLockfilesPresent.length > 0;
  return {
    key: 'code.lockfile',
    category: CATEGORY,
    weight: CODE_WEIGHTS.lockfile,
    value: boolScore(has),
    hint: has ? 'Версии зависимостей зафиксированы lock-файлом' : 'Lock-файла нет',
    target: 100,
    effort: 'trivial',
    recommendationKind: 'add_lockfile',
  };
}

/**
 * Бот обновления зависимостей. Разовое обновление стареет через месяц, а
 * dependabot или renovate держат версии свежими без участия человека.
 */
function dependencyBotMetric(facts: RepoFacts): MetricScore {
  return treeFlagMetric(facts, {
    key: 'code.dependency_bot',
    weight: CODE_WEIGHTS.dependencyBot,
    flag: facts.tree.flags.hasDependencyBot,
    yes: 'Автообновление зависимостей настроено',
    no: 'Автообновления зависимостей нет',
    effort: 'small',
    recommendationKind: 'add_dependency_bot',
  });
}

// ---------- helpers ----------

function unknownCodeMetric(key: string, weight: number): MetricScore {
  return {
    key,
    category: CATEGORY,
    weight,
    value: null,
    unknown: true,
    hint: 'Исходники прочитать не удалось',
  };
}

function unknownTreeMetric(key: string, weight: number): MetricScore {
  return {
    key,
    category: CATEGORY,
    weight,
    value: null,
    unknown: true,
    hint: 'Дерево файлов недоступно',
  };
}
