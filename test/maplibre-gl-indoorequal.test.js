const mockSprite = { 'test': { data: null, pixelRatio: 1 }};
jest.mock('../src/sprite', () => {
  return {
    __esModule: true,
    default: () => Promise.resolve(mockSprite)
  };
});

import IndoorEqual from '../src/index';

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
    addSource = jest.fn();
    addLayer = jest.fn();
    getLayer = jest.fn();
    setFilter = jest.fn();
    setLayoutProperty = jest.fn();
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
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal', { type: 'vector', url: 'https://tiles.indoorequal.org/?key=myapikey' }]);
    expect(addLayer.mock.calls.length).toEqual(10);
    expect(setFilter.mock.calls.length).toEqual(9);
  });

  it('customize the tiles url', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { url: 'https://example.com' });
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal', { type: 'vector', url: 'https://example.com' }]);
  });

  it('raise an error when the apiKey is not provided', () => {
    expect(() => {
      const indoorEqual = new IndoorEqual(map);
    }).toThrow('You must register your apiKey at https://indoorequal.com before and set it as apiKey param.');
  });

  it('allows to set geojson data', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { geojson: { area: { id: 1 }, area_name: { id: 2} } });
    expect(addSource.mock.calls.length).toEqual(2);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal_area', { type: 'geojson', data: { id: 1 } }]);
    expect(addSource.mock.calls[1]).toEqual(['indoorequal_area_name', { type: 'geojson', data: { id: 2 } }]);
    expect(addLayer.mock.calls.length).toEqual(5);
    expect(setFilter.mock.calls.length).toEqual(5);
  });

  it('load the source and the layers once the map style is loaded', () => {
    map.isStyleLoaded = () => false;
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(addSource.mock.calls.length).toEqual(0);
    expect(addLayer.mock.calls.length).toEqual(0);
    expect(setFilter.mock.calls.length).toEqual(0);
    once.load();
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addLayer.mock.calls.length).toEqual(10);
    expect(setFilter.mock.calls.length).toEqual(9);
  });

  it('allow to customize the layers', () => {
    map.isStyleLoaded = () => true;
    const layer = { id: 'test2', type: 'line', 'source-layer': 'area' };
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey', layers: [layer] });
    expect(addLayer.mock.calls.length).toEqual(1);
    expect(setFilter.mock.calls.length).toEqual(1);
  });

  it('returns the level control container when calling onAdd', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(indoorEqual.onAdd().tagName).toBe('DIV');
  });

  it('remove the level control container when calling onRemove', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.onAdd();
    indoorEqual.onRemove();
  });

  it('dont query the layer when the layer is not loaded', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(indoorEqual.levels).toEqual([]);
    map.isSourceLoaded = (source) => {
      expect(source).toEqual('indoorequal');
      return false;
    };
    indoorEqual._updateLevels();
    expect(indoorEqual.levels).toEqual([]);
  });

  it('query the layer when the layer is loaded', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(indoorEqual.levels).toEqual([]);
    map.isSourceLoaded = (source) => {
      expect(source).toEqual('indoorequal');
      return true;
    };
    map.querySourceFeatures = (source, filter) => {
      expect(source).toEqual('indoorequal');
      expect(filter).toEqual({ sourceLayer: 'area' });
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
    expect(indoorEqual.levels).toEqual(['1', '0']);
  });

  it('emit an event when the levels change', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    map.isSourceLoaded = () => true;
    map.querySourceFeatures = (source, filter) => {
      expect(source).toEqual('indoorequal');
      expect(filter).toEqual({ sourceLayer: 'area' });
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
      expect(levels).toEqual(["1", "0"]);
      levelsChangeCalled++;
    });
    indoorEqual._updateLevels();
    expect(levelsChangeCalled).toEqual(1);
  });

  it('allow to set the current level', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.level).toEqual('0');
    indoorEqual.setLevel('1');
    expect(indoorEqual.level).toEqual('1');
  });

  it('emit an event when the level change', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    let levelChangeCalled = 0;
    indoorEqual.on('levelchange', (level) => {
      expect(level).toEqual('1');
      levelChangeCalled++;
    });
    indoorEqual.setLevel('1');
    expect(levelChangeCalled).toEqual(1);
  });

  it('reset the value to 0 if the current level doesnt exist', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual.setLevel('1');
    indoorEqual._refreshAfterLevelsUpdate();
    indoorEqual.levels = ['0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.level).toEqual('0');
  });

  it('changes heatmap visibility', () => {
    getLayer.mockReturnValue(true);
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(setLayoutProperty.mock.calls.length).toEqual(0);
    indoorEqual.setHeatmapVisible(false);
    expect(setLayoutProperty.mock.calls.length).toEqual(1);
    expect(setLayoutProperty.mock.calls[0]).toEqual(['indoor-heat', 'visibility', 'none']);
    indoorEqual.setHeatmapVisible(true);
    expect(setLayoutProperty.mock.calls.length).toEqual(2);
    expect(setLayoutProperty.mock.calls[1]).toEqual(['indoor-heat', 'visibility', 'visible']);
  });

  it('changes heatmap visibility at start', () => {
    map.isStyleLoaded = () => true;
    getLayer.mockReturnValue(true);
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey', heatmap: false });
    expect(setLayoutProperty.mock.calls.length).toEqual(1);
    expect(setLayoutProperty.mock.calls[0]).toEqual(['indoor-heat', 'visibility', 'none']);
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
    expect(levelChangeCalled).toEqual(1);
    indoorEqual.off('levelchange', cb)
    indoorEqual.setLevel('0');
    expect(levelChangeCalled).toEqual(1);
  });

  it('allows to fetch a sprite and add image', () => {
    map.hasImage = jest.fn();
    map.addImage = jest.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    return indoorEqual.loadSprite('/sprite')
      .then((sprites) => {
        expect(sprites).toBe(mockSprite);
        expect(map.hasImage.mock.calls.length).toEqual(1);
        expect(map.addImage.mock.calls.length).toEqual(1);
      });
  });

  it('allows to fetch a sprite and dont update image', () => {
    map.hasImage = () => true;
    map.updateImage = jest.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    return indoorEqual.loadSprite('/sprite')
      .then((sprites) => {
        expect(sprites).toBe(mockSprite);
        expect(map.updateImage.mock.calls.length).toEqual(0);
      });
  });

  it('allows to fetch a sprite and update existing image', () => {
    map.hasImage = () => true;
    map.updateImage = jest.fn();
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    return indoorEqual.loadSprite('/sprite', { update: true })
      .then((sprites) => {
        expect(sprites).toBe(mockSprite);
        expect(map.updateImage.mock.calls.length).toEqual(1);
      });
  });
});
