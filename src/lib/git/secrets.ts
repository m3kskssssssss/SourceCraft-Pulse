// Простой regex-детектор секретов в диффах.
// Не претендует на полноту: ловим наиболее очевидные форматы (AWS, GitHub, OpenAI,
// Slack, приватные ключи). Полный аудит — задача внешнего инструмента вроде trufflehog.

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'aws_access_key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'github_token', regex: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'openai_key', regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'slack_token', regex: /xox[baprs]-[0-9A-Za-z-]{20,}/ },
  { name: 'private_key_pem', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'jwt', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

export type SecretHit = {
  name: string;
  sample: string; // короткий фрагмент строки, где сработал паттерн
};

/**
 * Ищет секреты в тексте. Возвращает уникальные срабатывания (по имени и первым 8 символам).
 * `content` — обычно вывод git log -p или git show, где строки, начинающиеся с '+' или '-',
 * — добавленные/удалённые. Мы не отсеиваем контекст, потому что даже строка контекста
 * когда-то была добавлена; в MVP этой чувствительности достаточно.
 */
export function scanForSecrets(content: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const seen = new Set<string>();
  for (const line of content.split('\n')) {
    for (const { name, regex } of SECRET_PATTERNS) {
      const match = regex.exec(line);
      if (!match) continue;
      const sample = match[0].slice(0, 8);
      const key = `${name}:${sample}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ name, sample: sample + '…' });
    }
  }
  return hits;
}
