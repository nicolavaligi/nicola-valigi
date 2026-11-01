const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rankSites } = require('../decision-lab.js');

test('changing the priority changes the leading eligible site', () => {
  assert.equal(rankSites(65, true)[0].id, 'A');
  assert.equal(rankSites(0, true)[0].id, 'F');
  assert.equal(rankSites(100, true)[0].id, 'E');
});

test('a constraint overrides an otherwise favourable score', () => {
  assert.equal(rankSites(65, false)[0].id, 'C');
  const filtered = rankSites(65, true);
  assert.equal(filtered.at(-1).id, 'C');
  assert.equal(filtered.at(-1).excluded, true);
  assert.equal(filtered[0].excluded, false);
});

test('all slider settings preserve six unique sites and descending eligible scores', () => {
  for (let weight = 0; weight <= 100; weight += 5) {
    for (const exclude of [true, false]) {
      const rows = rankSites(weight, exclude);
      assert.equal(new Set(rows.map(row => row.id)).size, 6);
      assert(rows.every(row => row.score >= 0 && row.score <= 100));
      assert.equal(rows.filter(row => row.excluded).length, exclude ? 1 : 0);
      const eligible = rows.filter(row => !row.excluded);
      assert(eligible.every((row, index) => !index || eligible[index - 1].score >= row.score));
    }
  }
});

test('filtering does not renormalize or change the other scores', () => {
  const unfiltered = rankSites(65, false);
  for (const site of rankSites(65, true)) {
    assert.equal(site.score, unfiltered.find(other => other.id === site.id).score);
  }
  const siteA = unfiltered.find(site => site.id === 'A');
  assert(Math.abs(siteA.score - 73.45833333333333) < 1e-8);
});

test('invalid priorities use a safe default or clamp to the slider bounds', () => {
  assert.deepEqual(rankSites(NaN, true), rankSites(65, true));
  assert.deepEqual(rankSites(-50, true), rankSites(0, true));
  assert.deepEqual(rankSites(150, true), rankSites(100, true));
});
