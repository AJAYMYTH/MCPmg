import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { POPULAR_PRESETS } from '../presets/popular.js';

describe('Popular Presets Catalog', () => {
  test('contains essential MCP presets', () => {
    assert.ok(POPULAR_PRESETS.length >= 8);
    const ids = POPULAR_PRESETS.map((p) => p.id);
    assert.ok(ids.includes('memory'));
    assert.ok(ids.includes('filesystem'));
    assert.ok(ids.includes('github'));
    assert.ok(ids.includes('supabase'));
    assert.ok(ids.includes('postgres'));
    assert.ok(ids.includes('sqlite'));
  });

  test('all presets have valid structure and required fields', () => {
    for (const preset of POPULAR_PRESETS) {
      assert.ok(preset.id && typeof preset.id === 'string');
      assert.ok(preset.name && typeof preset.name === 'string');
      assert.ok(preset.description && typeof preset.description === 'string');
      assert.ok(preset.transport === 'stdio' || preset.transport === 'sse');

      if (preset.transport === 'stdio') {
        assert.ok(preset.command && typeof preset.command === 'string');
        assert.ok(Array.isArray(preset.args));
      } else {
        assert.ok(preset.urlTemplate && typeof preset.urlTemplate === 'string');
      }

      if (preset.envRequirements) {
        for (const envReq of preset.envRequirements) {
          assert.ok(envReq.key && typeof envReq.key === 'string');
          assert.ok(envReq.description && typeof envReq.description === 'string');
        }
      }
    }
  });
});
