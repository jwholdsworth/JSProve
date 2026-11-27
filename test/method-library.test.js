import test from 'node:test';
import assert from 'node:assert/strict';
import { createMethodLibraryCache } from '../js/method-library.js';

const response = () => ({
  ok: true,
  text: async () => 'Header\nCambridge b &-3-4\n\n',
});

test('library requests share pending and cached results by filename', async () => {
  const requests = [];
  const load = createMethodLibraryCache(async (url) => {
    requests.push(url);
    return response();
  });
  const first = load('S8');
  assert.equal(load('S8'), first);
  const methods = await first;
  assert.deepEqual(methods, [{ name: 'Cambridge', notation: 'b &-3-4' }]);
  assert.equal(await load('S8'), methods);
  await load('S10');
  await load('P8');
  assert.deepEqual(requests, ['lib/S8', 'lib/S10', 'lib/P8']);
});

test('failed library requests can be retried', async () => {
  let attempts = 0;
  const load = createMethodLibraryCache(async () => {
    attempts++;
    if (attempts === 1) throw new Error('Network failure');
    if (attempts === 2) return { ok: false };
    return response();
  });
  await assert.rejects(load('S8'), /Network failure/);
  await assert.rejects(load('S8'), /Unable to load method library/);
  assert.equal((await load('S8')).length, 1);
  assert.equal(attempts, 3);
});
