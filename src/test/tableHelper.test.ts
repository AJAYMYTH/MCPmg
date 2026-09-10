import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import pc from 'picocolors';
import {
  stripAnsi,
  visibleWidth,
  truncateToWidth,
  fitCell,
} from '../utils/tableHelper.js';

describe('Table Helper - ANSI & Width Utilities', () => {
  test('stripAnsi removes ANSI escape codes cleanly', () => {
    const plain = 'Hello world';
    const styled = pc.cyan(pc.bold('Hello world'));
    assert.equal(stripAnsi(styled), plain);

    const complex = pc.red(`Error: ${pc.yellow('warning')} ${pc.dim('info')}`);
    assert.equal(stripAnsi(complex), 'Error: warning info');
  });

  test('visibleWidth correctly measures string cell length', () => {
    assert.equal(visibleWidth('test'), 4);
    assert.equal(visibleWidth(pc.green('test')), 4);
    assert.equal(visibleWidth(pc.bold(pc.white('▶ server-one'))), 12);
  });

  test('truncateToWidth handles plain strings within limits', () => {
    const text = 'short';
    assert.equal(truncateToWidth(text, 10), 'short');
    assert.equal(truncateToWidth(text, 5), 'short');
  });

  test('truncateToWidth truncates plain strings that exceed width', () => {
    const text = 'codebase-memory-mcp';
    const truncated = truncateToWidth(text, 15);
    assert.equal(visibleWidth(truncated), 15);
    assert.ok(truncated.endsWith('…'));
    assert.equal(truncated, 'codebase-memor…');
  });

  test('truncateToWidth handles ANSI-styled strings while preserving reset', () => {
    const styled = pc.cyan(pc.bold('codebase-memory-mcp'));
    const truncated = truncateToWidth(styled, 15);
    assert.equal(visibleWidth(truncated), 15);
    assert.ok(truncated.includes('\x1b[0m'));
    assert.ok(stripAnsi(truncated).endsWith('…'));
  });

  test('fitCell enforces maximum cell content bounds (colWidth - 2)', () => {
    // For colWidth 20, max content width is 18
    const longName = 'very-long-mcp-server-name-here';
    const fitted = fitCell(longName, 20);
    assert.equal(visibleWidth(fitted), 18);
    assert.equal(fitted, 'very-long-mcp-ser…');

    // For short name, keeps as is
    const shortName = 'taskair';
    assert.equal(fitCell(shortName, 20), 'taskair');
  });
});
