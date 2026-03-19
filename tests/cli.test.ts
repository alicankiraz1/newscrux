import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArgs } from '../src/cli.js';

test('parseArgs accepts --lang=uz', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'newscrux', '--lang=uz'];

  try {
    assert.deepEqual(parseArgs(), { lang: 'uz' });
  } finally {
    process.argv = originalArgv;
  }
});
