import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PRESETS,CATEGORIES,FEATURED_IDS,getByNumber,getPreset} from '../presets/registry.js';

test('82 numbered, unique presets, seven categories',()=>{
  assert.equal(PRESETS.length,82);
  assert.equal(new Set(PRESETS.map(x=>x.id)).size,82);
  assert.equal(new Set(PRESETS.map(x=>x.number)).size,82);
  for(let i=0;i<PRESETS.length;i++)assert.equal(PRESETS[i].number,i+1);
  assert.equal(new Set(PRESETS.map(x=>x.category)).size,7);
  assert.equal(CATEGORIES.length,10);
  assert.equal(FEATURED_IDS.length,16);
});
test('every preset has editable controls and a declared technique',()=>{
  for(const p of PRESETS){assert.ok(p.name);assert.equal(p.labels.length,3);assert.ok(p.technique);assert.equal(getByNumber(p.number),p);assert.equal(getPreset(p.id),p);}
});
test('all 82 presets have non-placeholder effect recipes',()=>{
  const code=readFileSync(new URL('../engine/effects.js',import.meta.url),'utf8');
  for(let n=1;n<=82;n++)assert.match(code,new RegExp(`case ${n}:`),`Missing real renderer for preset ${n}`);
  assert.ok(!code.includes('TODO placeholder'));
});
test('offline deployment resources exist',()=>{
  for(const path of ['index.html','src/main.js','src/engine/worker.js','src/styles/main.css','public/demo/atmosphere.jpg','public/favicon.svg'])assert.ok(existsSync(path),`${path} is missing`);
  const html=readFileSync('index.html','utf8');assert.ok(!html.includes('https://cdn.'));assert.match(html,/\.\/src\/main\.js/);
});
