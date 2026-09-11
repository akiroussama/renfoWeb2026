import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(here, '../.github/workflows/ci.yml');
function readWorkflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

describe('ci - job unique cp0-tests minimal', () => {
  it('garde un seul job cp0-tests', () => {
    const y = readWorkflow();
    assert.ok(y.includes('cp0-tests'));
    assert.ok(!y.includes('cp1-tests'));
    assert.ok(!y.match(/\bcp[1-7]-tests\b/));
    const jobsSection = y.split(/jobs\s*:/)[1] || '';
    const jobDefs = [...jobsSection.matchAll(/^\s{2}([A-Za-z0-9_-]+)\s*:/gm)].map((m) => m[1]);
    assert.deepEqual(jobDefs, ['cp0-tests']);
  });

  it('permissions minimales et checkout sans credentials', () => {
    const y = readWorkflow();
    assert.ok(y.includes('permissions:'));
    assert.ok(y.includes('contents: read'));
    assert.ok(!y.includes('contents: write'));
    assert.ok(y.includes('actions/checkout'));
    assert.ok(y.includes('persist-credentials: false'));
  });

  it('utilise Node 24', () => {
    const y = readWorkflow();
    assert.ok(y.includes('setup-node'));
    assert.match(y, /node-version\s*:\s*['"]?24['"]?/);
  });

  it('PR externe passe head_ref et auteur via env sans interpolation dans run', () => {
    const y = readWorkflow();
    assert.ok(y.includes('github.head_ref'));
    assert.ok(y.includes('github.event.pull_request'));
    const lines = y.split('\n');
    let inRun = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^run\s*:/.test(trimmed)) inRun = true;
      else if (/^[a-z-]+\s*:/i.test(trimmed) && !line.startsWith(' ') && !line.startsWith('\t')) inRun = false;
      if (trimmed.startsWith('run:') || trimmed.startsWith('- run:') || (inRun && trimmed.startsWith('|'))) {
        // bloc run ne doit pas interpoler directement
      }
    }
    const runLines = [];
    let capture = false;
    for (const line of lines) {
      if (/\brun\s*:\s*\|?/.test(line)) { capture = true; runLines.push(line); continue; }
      if (capture) {
        if (/^\s{6,}\S/.test(line) || /^\s+\|/.test(line) || /^\s{8,}/.test(line)) runLines.push(line);
        else if (line.trim() === '') runLines.push(line);
        else capture = false;
      }
    }
    assert.ok(!runLines.join('\n').includes('${{'));
    assert.ok(y.match(/env\s*:/) && y.includes('${{ github.head_ref }}'));
  });

  it('PR proprietaire execute seulement les tests du kit', () => {
    const y = readWorkflow();
    assert.ok(y.toLowerCase().includes('fork') || y.includes('head.repo'));
    assert.ok(y.includes('node --test') || y.includes('npm test') || y.includes('npm run test'));
  });

  it('ajout futur checkpoint sans modification workflow', () => {
    const y = readWorkflow();
    assert.ok(!y.match(/\bcp[1-7]\b.*tests/) || !y.includes('checkpoints/cp1'));
    assert.ok(!y.includes('checkpoints/cp1'));
    assert.ok(!y.includes('checkpoints/cp2'));
    assert.ok(y.includes('scripts/run-checkpoint.js'));
  });
});
