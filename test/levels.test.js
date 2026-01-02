import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import findAllLevels from '../src/levels.js';

describe('findAllLevels', () => {
  it('find one level', () => {
    assert.deepEqual(findAllLevels([
      {
        properties: {
          level: 0
        }
      },
      {
        properties: {
          level: 0
        }
      }
    ]), [0]);
  });

  it('find multiple levels', () => {
    assert.deepEqual(findAllLevels([
      {
        properties: {
          level: 0
        }
      },
      {
        properties: {
          level: 1
        }
      }
    ]), [1, 0]);
  });

  it('sort levels', () => {
    assert.deepEqual(findAllLevels([
      {
        properties: {
          level: 1
        }
      },
      {
        properties: {
          level: 0
        }
      }
    ]), [1, 0]);
  });

   it('sort levels with minus', () => {
    assert.deepEqual(findAllLevels([
      {
        properties: {
          level: 1
        }
      },
      {
        properties: {
          level: -1
        }
      },
      {
        properties: {
          level: -2
        }
      },
      {
        properties: {
          level: 0
        }
      }
    ]), [1, 0, -1, -2]);
  });

  it('ignore levels from indoor=level', () => {
    assert.deepEqual(findAllLevels([
      {
        properties: {
          level: 0
        }
      },
      {
        properties: {
          class: 'level',
          level: 1
        }
      }
    ]), [0]);
  });

  it('find zero levels', () => {
    assert.deepEqual(findAllLevels([]), []);
  });
});
