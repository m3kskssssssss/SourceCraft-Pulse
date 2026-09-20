import { describe, expect, it } from 'vitest';
import { InMemoryAiCache, hashKey } from '../cache';

describe('hashKey', () => {
  it('одинаковый вход — одинаковый хеш', () => {
    const a = hashKey({ task: 'x', input: { foo: 1, bar: 2 } });
    const b = hashKey({ task: 'x', input: { bar: 2, foo: 1 } }); // порядок ключей не важен
    expect(a).toBe(b);
  });

  it('разный task — разный хеш', () => {
    const a = hashKey({ task: 'x', input: { foo: 1 } });
    const b = hashKey({ task: 'y', input: { foo: 1 } });
    expect(a).not.toBe(b);
  });

  it('разный вход — разный хеш', () => {
    const a = hashKey({ task: 'x', input: { foo: 1 } });
    const b = hashKey({ task: 'x', input: { foo: 2 } });
    expect(a).not.toBe(b);
  });
});

describe('InMemoryAiCache', () => {
  it('put/get возвращает значение', async () => {
    const cache = new InMemoryAiCache();
    await cache.put({ task: 't', input: { a: 1 } }, { hello: 'world' });
    const value = await cache.get<{ hello: string }>({ task: 't', input: { a: 1 } });
    expect(value).toEqual({ hello: 'world' });
  });

  it('get несуществующего — null', async () => {
    const cache = new InMemoryAiCache();
    expect(await cache.get({ task: 't', input: { a: 1 } })).toBeNull();
  });

  it('clear чистит', async () => {
    const cache = new InMemoryAiCache();
    await cache.put({ task: 't', input: 1 }, 'x');
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
