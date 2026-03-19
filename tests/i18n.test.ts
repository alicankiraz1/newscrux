import assert from 'node:assert/strict';
import test from 'node:test';
import { getLanguagePack } from '../src/i18n.js';

test('getLanguagePack returns Uzbek labels', () => {
  const pack = getLanguagePack('uz');

  assert.equal(pack.name, 'Uzbek');
  assert.equal(pack.labels.whatHappened, 'Yangilik:');
  assert.equal(pack.labels.whyItMatters, 'Nega muhim:');
  assert.equal(pack.labels.readArticle, "Maqolani ochish");
  assert.equal(
    pack.labels.startupMessage,
    'Newscrux ishga tushdi! AI yangilik bildirishnomalari faol.'
  );
});
