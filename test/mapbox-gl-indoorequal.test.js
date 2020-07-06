import IndoorEqual, { findAllLevels }  from '../src/index';

describe('IndoorEqual', () => {
  let map;
  let addSource;
  let addLayer;
  let setFilter;
  let on;

  beforeEach(() => {
    map = {};
    on = {};
    addSource = jest.fn();
    addLayer = jest.fn();
    setFilter = jest.fn();
    map.addSource = addSource;
    map.addLayer = addLayer;
    map.setFilter = setFilter;
    map.on = (name, fn) => { on[name] = fn};
    map.isStyleLoaded = () => false;
  });

  it('load the source and the layers when the map style is loaded', () => {
    map.isStyleLoaded = () => true;
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal', { type: 'vector', url: 'https://tiles.indoorequal.org/?key=myapikey' }]);
    expect(addLayer.mock.calls.length).toEqual(9);
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

  it('load the source and the layers once the map style is loaded', () => {
    map.isStyleLoaded = () => false;
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    expect(addSource.mock.calls.length).toEqual(0);
    expect(addLayer.mock.calls.length).toEqual(0);
    expect(setFilter.mock.calls.length).toEqual(0);
    on.load();
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addLayer.mock.calls.length).toEqual(9);
    expect(setFilter.mock.calls.length).toEqual(9);
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
    indoorEqual.updateLevel('1');
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
    indoorEqual.updateLevel('1');
    expect(levelChangeCalled).toEqual(1);
  });

  it('reset the value to 0 if the current level doesnt exist', () => {
    const indoorEqual = new IndoorEqual(map, { apiKey: 'myapikey' });
    indoorEqual.levels = ['1', '0'];
    indoorEqual.updateLevel('1');
    indoorEqual._refreshAfterLevelsUpdate();
    indoorEqual.levels = ['0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.level).toEqual('0');
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
    indoorEqual.updateLevel('1');
    expect(levelChangeCalled).toEqual(1);
    indoorEqual.off('levelchange', cb)
    indoorEqual.updateLevel('0');
    expect(levelChangeCalled).toEqual(1);
  });
});
