import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStyleMin, featureFilter } from '@maplibre/maplibre-gl-style-spec';

import { layers } from '../src/layers.js';

function buildStyle(layerList) {
  return {
    version: 8,
    sources: {
      indoorequal: { type: 'vector', url: 'https://tiles.indoorequal.org/' },
    },
    layers: layerList.map(layer => ({ ...layer, source: 'indoorequal' })),
  };
}

function withLevelFilter(layer) {
  if (layer.type === 'heatmap') {
    return layer;
  }
  return { ...layer, filter: [...(layer.filter || ['all']), ['==', 'level', '0']] };
}

describe('layers', () => {
  it('are valid against the maplibre style specification', () => {
    const errors = validateStyleMin(buildStyle(layers));
    assert.deepEqual(errors.map(error => error.message), []);
  });

  it('are still valid once the runtime level filter is applied', () => {
    const errors = validateStyleMin(buildStyle(layers.map(withLevelFilter)));
    assert.deepEqual(errors.map(error => error.message), []);
  });

  it('have filters that compile', () => {
    layers.filter(layer => layer.filter).forEach((layer, index) => {
      assert.doesNotThrow(
        () => featureFilter(layer.filter, `layers[${index}].filter`),
        `${layer.id} filter does not compile`
      );
    });
  });

  it('have filters that still compile with the runtime level filter', () => {
    layers.filter(layer => layer.filter && layer.type !== 'heatmap').forEach((layer, index) => {
      const { filter } = withLevelFilter(layer);
      assert.doesNotThrow(
        () => featureFilter(filter, `layers[${index}].filter`),
        `${layer.id} filter does not compile with the level filter`
      );
    });
  });
});
