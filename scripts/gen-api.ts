// Конвертирует свагер SourceCraft (2.0) в OpenAPI 3.0 и генерирует
// TypeScript-типы через openapi-typescript. Оба выходных артефакта коммитятся,
// чтобы CI/сборка не зависела от внешней сети.
//
// Запуск: pnpm gen:api
//
// Файлы:
//   src/lib/sourcecraft/openapi/sourcecraft.swagger.json    — исходник (2.0)
//   src/lib/sourcecraft/openapi/sourcecraft.openapi3.json   — сконвертированный (3.0)
//   src/lib/sourcecraft/types.gen.ts                        — TypeScript-типы

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertObj } from 'swagger2openapi';
import openapiTS, { astToString } from 'openapi-typescript';

const ROOT = resolve(process.cwd());
const SWAGGER_PATH = resolve(ROOT, 'src/lib/sourcecraft/openapi/sourcecraft.swagger.json');
const OPENAPI3_PATH = resolve(ROOT, 'src/lib/sourcecraft/openapi/sourcecraft.openapi3.json');
const TYPES_PATH = resolve(ROOT, 'src/lib/sourcecraft/types.gen.ts');

type OpenApi3 = Record<string, unknown>;

async function main(): Promise<void> {
  // Типы @types/swagger2openapi требуют Document<{}> с обязательными полями info/paths/swagger,
  // но по факту функция принимает произвольный JSON-объект — приводим через unknown.
  const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf8')) as unknown;

  console.log('Конвертирую Swagger 2.0 → OpenAPI 3.0 ...');
  const converted: { openapi: OpenApi3 } = await new Promise((resolvePromise, rejectPromise) => {
    convertObj(
      swagger as Parameters<typeof convertObj>[0],
      { patch: true, warnOnly: true },
      (err, result) => {
        if (err) rejectPromise(err);
        else resolvePromise(result as unknown as { openapi: OpenApi3 });
      },
    );
  });

  writeFileSync(OPENAPI3_PATH, JSON.stringify(converted.openapi, null, 2), 'utf8');
  console.log(`  → ${OPENAPI3_PATH}`);

  console.log('Генерирую TypeScript-типы ...');
  const ast = await openapiTS(converted.openapi as never, {
    alphabetize: true,
    exportType: true,
  });
  const source = `// Автогенерировано: pnpm gen:api\n// Не редактируйте вручную.\n\n${astToString(ast)}`;
  writeFileSync(TYPES_PATH, source, 'utf8');
  console.log(`  → ${TYPES_PATH}`);
}

main().catch((error: unknown) => {
  console.error('Ошибка генерации API-типов:', error);
  process.exit(1);
});
