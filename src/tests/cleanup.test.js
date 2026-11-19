import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRESETS} from '../presets/registry.js';
import {CONTROL_FALLBACKS} from '../presets/control-policy.js';

test('editor removes the discarded decorative landing-page copy', () => {
  const ui=readFileSync('src/main.js','utf8');
  for(const copy of [
    '82 ways to see the same thing differently.',
    'DROP AN IMAGE. PICK A TREATMENT.',
    'DRAG BETWEEN TWO REALITIES.',
    'EXPERIMENT NO. 001 / IMAGE RECONSTRUCTION',
    'CHOOSE YOUR<br/>DISTORTION',
    'V.01 — INDEPENDENT IMAGE STUDIO'
  ]) assert.equal(ui.includes(copy),false,`Unwanted copy remains: ${copy}`);
  for(const essential of ['BEFORE','AFTER','UPLOAD IMAGE','EXPORT ARTWORK','styleSearch']) assert.ok(ui.includes(essential));
});

test('each fallback adjustment has a truthful label in the preset catalog', () => {
 const titles={detail:'Edge detail',texture:'Surface grain',variation:'Tone balance'};
 const index={detail:0,texture:1,variation:2};
 for(const preset of PRESETS){
  for(const [name,set] of Object.entries(CONTROL_FALLBACKS)){
   if(set.has(preset.number)) assert.equal(preset.labels[index[name]],titles[name]);
  }
 }
});
