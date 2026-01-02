import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import IndoorEqual from '../src/index.js';

describe('IndoorEqual', () => {
  let map;
  let addSource;
  let addLayer;
  let getLayer;
  let setFilter;
  let setLayoutProperty;
  let on;
  let once;

  beforeEach(() => {
    map = {};
    on = {};
    once = {};
    addSource = mock.fn();
    addLayer = mock.fn();
    getLayer = mock.fn();
    setFilter = mock.fn();
    setLayoutProperty = mock.fn();
    map.addSource = addSource;
    map.addLayer = addLayer;
    map.getLayer = getLayer;
    map.setFilter = setFilter;
    map.setLayoutProperty = setLayoutProperty;
    map.on = (name, fn) => { on[name] = fn};
    map.once = (name, fn) => { once[name] = fn};
    map.isStyleLoaded = () => false;
  });

  it('load the source and the layers when the map style is loaded', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.equal(addSource.mock.calls.length, 1);
    assert.deepEqual(addSource.mock.calls[0].arguments, ['indoorequal', { type: 'vector', url: 'https://tiles.indoorequal.org/?key=myapikey' }]);
    assert.equal(addLayer.mock.calls.length, 10);
    assert.equal(setFilter.mock.calls.length, 9);
  });

  it('customize the tiles url', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { url: 'https://example.com' });
    assert.equal(addSource.mock.calls.length, 1);
    assert.deepEqual(addSource.mock.calls[0].arguments, ['indoorequal', { type: 'vector', url: 'https://example.com' }]);
  });

  it('raise an error when the apiKey is not provided', () => {
    assert.throws(() => {
      const indoorEqual = new IndoorEqual(map);
    }, null, 'You must register your apiKey at https://indoorequal.com before and set it as apiKey param.');
  });

  it('allows to set geojson data', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { geojson: { area: { id: 1 }, area_name: { id: 2} } });
    assert.equal(addSource.mock.calls.length, 2);
    assert.deepEqual(addSource.mock.calls[0].arguments, ['indoorequal_area', { type: 'geojson', data: { id: 1 } }]);
    assert.deepEqual(addSource.mock.calls[1].arguments, ['indoorequal_area_name', { type: 'geojson', data: { id: 2 } }]);
    assert.equal(addLayer.mock.calls.length, 5);
    assert.equal(setFilter.mock.calls.length, 5);
  });

  it('load the source and the layers once the map style is loaded', () => {
    map.isStyleLoaded = () => false;
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.equal(addSource.mock.calls.length, 0);
    assert.equal(addLayer.mock.calls.length, 0);
    assert.equal(setFilter.mock.calls.length, 0)
    once.load();
    assert.equal(addSource.mock.calls.length, 1);
    assert.equal(addLayer.mock.calls.length, 10);
    assert.equal(setFilter.mock.calls.length, 9);
  });

  it('allow to customize the layers', () => {
    map.isStyleLoaded = () => true;
    const layer = { id: 'test2', type: 'line', 'source-layer': 'area' };
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey', layers: [layer] });
    assert.equal(addLayer.mock.calls.length, 1);
    assert.equal(setFilter.mock.calls.length, 1);
  });

  it('returns the level control container when calling onAdd', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.equal(indoorEqual.onAdd().tagName, 'DIV');
  });

  it('remove the level control container when calling onRemove', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.onAdd();
    indoorEqual.onRemove();
  });

  it('dont query the layer when the layer is not loaded', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.deepEqual(indoorEqual.levels, []);
    map.isSourceLoaded = (source) => {
      assert.equal(source, 'indoorequal');
      return false;
    };
    indoorEqual._updateLevels();
    assert.deepEqual(indoorEqual.levels, []);
  });

  it('query the layer when the layer is loaded', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.deepEqual(indoorEqual.levels, []);
    map.isSourceLoaded = (source) => {
      assert.equal(source, 'indoorequal');
      return true;
    };
    map.querySourceFeatures = (source, filter) => {
      assert.equal(source, 'indoorequal');
      assert.deepEqual(filter, { sourceLayer: 'area' });
      return [
        {
          properties: {
            level: "1"
          }
        },
        {
          properties: {
            level: "0"
          }
        }
      ];
    };
    indoorEqual._updateLevels();
    assert.deepEqual(indoorEqual.levels, ['1', '0']);
  });

  it('emit an event when the levels change', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    map.isSourceLoaded = () => true;
    map.querySourceFeatures = (source, filter) => {
      assert.equal(source, 'indoorequal');
      assert.deepEqual(filter, { sourceLayer: 'area' });
      return [
        {
          properties: {
            level: "1"
          }
        },
        {
          properties: {
            level: "0"
          }
        }
      ];
    };
    let levelsChangeCalled = 0;
    indoorEqual.on('levelschange', (levels) => {
      assert.deepEqual(levels, ["1", "0"]);
      levelsChangeCalled++;
    });
    indoorEqual._updateLevels();
    assert.equal(levelsChangeCalled, 1);
  });

  it('allow to set the current level', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    assert.equal(indoorEqual.level, '0');
    indoorEqual.setLevel('1');
    assert.equal(indoorEqual.level, '1');
  });

  it('emit an event when the level change', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    let levelChangeCalled = 0;
    indoorEqual.on('levelchange', (level) => {
      assert.equal(level, '1');
      levelChangeCalled++;
    });
    indoorEqual.setLevel('1');
    assert.equal(levelChangeCalled, 1);
  });

  it('reset the value to 0 if the current level doesnt exist', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual.setLevel('1');
    indoorEqual._refreshAfterLevelsUpdate();
    indoorEqual.levels = ['0'];
    indoorEqual._refreshAfterLevelsUpdate();
    assert.equal(indoorEqual.level, '0');
  });

  it('changes heatmap visibility', () => {
    map.getLayer = mock.fn(() => true);
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    assert.equal(setLayoutProperty.mock.calls.length, 0);
    indoorEqual.setHeatmapVisible(false);
    assert.equal(setLayoutProperty.mock.calls.length, 1);
    assert.deepEqual(setLayoutProperty.mock.calls[0].arguments, ['indoor-heat', 'visibility', 'none']);
    indoorEqual.setHeatmapVisible(true);
    assert.equal(setLayoutProperty.mock.calls.length, 2);
    assert.deepEqual(setLayoutProperty.mock.calls[1].arguments, ['indoor-heat', 'visibility', 'visible']);
  });

  it('changes heatmap visibility at start', () => {
    map.isStyleLoaded = () => true;
    map.getLayer = mock.fn(() => true);
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey', heatmap: false });
    assert.equal(setLayoutProperty.mock.calls.length, 1);
    assert.deepEqual(setLayoutProperty.mock.calls[0].arguments, ['indoor-heat', 'visibility', 'none']);
  });

  it('allows to remove an event listener', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    let levelChangeCalled = 0;
    const cb = (level) => {
      levelChangeCalled++;
    };
    indoorEqual.on('levelchange', cb);
    indoorEqual.setLevel('1');
    assert.equal(levelChangeCalled, 1);
    indoorEqual.off('levelchange', cb)
    indoorEqual.setLevel('0');
    assert.equal(levelChangeCalled, 1);
  });

  it('allows to fetch a sprite and add image', () => {
    map.hasImage = mock.fn();
    map.addImage = mock.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    const mockSprite = { 'test': { data: null, pixelRatio: 1 }};
    indoorEqual._loadSprite = () => Promise.resolve(mockSprite)
    return indoorEqual.loadSprite('/sprite')
      .then((sprites) => {
        assert.equal(sprites, mockSprite);
        assert.equal(map.hasImage.mock.calls.length, 1);
        assert.equal(map.addImage.mock.calls.length, 1);
      });
  });

  it('allows to fetch a sprite and dont update image', () => {
    map.hasImage = () => true;
    map.updateImage = mock.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    const mockSprite = { 'test': { data: null, pixelRatio: 1 }};
    indoorEqual._loadSprite = () => Promise.resolve(mockSprite)
    return indoorEqual.loadSprite('/sprite')
      .then((sprites) => {
        assert.equal(sprites, mockSprite);
        assert.equal(map.updateImage.mock.calls.length, 0);
      });
  });

  it('allows to fetch a sprite and update existing image', () => {
    map.hasImage = () => true;
    map.updateImage = mock.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    const mockSprite = { 'test': { data: null, pixelRatio: 1 }};
    indoorEqual._loadSprite = () => Promise.resolve(mockSprite)
    return indoorEqual.loadSprite('/sprite', { update: true })
      .then((sprites) => {
        assert.equal(sprites, mockSprite);
        assert.equal(map.updateImage.mock.calls.length, 1);
      });
  });
});
