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

test('Uzbek summary prompt enforces journalistic rewrite and typography rules', () => {
  const pack = getLanguagePack('uz');
  const prompt = pack.summarySystemPrompt('yangilik maqolasi', 'media_report');

  assert.match(prompt, /tajribali o‘zbek muharriri va tahlilchisan/);
  assert.match(prompt, /tarjima ekani sezilmasin/);
  assert.match(prompt, /Kamida 50 ta soʻzdan iborat bo‘lsin/);
  assert.match(prompt, /Kamida 20 ta soʻzdan iborat bo‘lsin/);
  assert.match(prompt, /Mazmunni paraphrase qil/);
  assert.match(prompt, /O‘zbek tilidagi Oʻ\/oʻ va Gʻ\/gʻ uchun aynan shu belgi ishlatilsin: ʻ/);
  assert.match(prompt, /Maʼlumot, taʼlim, eʼlon, sanʼat kabi/);
  assert.match(prompt, /faqat mana bular ishlatilsin: “ va ”/);
});
