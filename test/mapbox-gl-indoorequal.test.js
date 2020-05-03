import IndoorEqual, { findAllLevels }  from '../mapbox-gl-indoorequal';

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
    map.loaded = () => false;
  });

  it('load the source and the layers when the map is loaded', () => {
    map.loaded = () => true;
    const indoorEqual = new IndoorEqual(map);
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal', { type: 'vector', url: 'https://tiles.indoorequal.org/' }]);
    expect(addLayer.mock.calls.length).toEqual(9);
    expect(setFilter.mock.calls.length).toEqual(9);
  });

  it('customize the tiles url', () => {
    map.loaded = () => true;
    const indoorEqual = new IndoorEqual(map, { url: 'https://example.com' });
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addSource.mock.calls[0]).toEqual(['indoorequal', { type: 'vector', url: 'https://example.com' }]);
  });

  it('load the source and the layers once the map is loaded', () => {
    map.loaded = () => false;
    const indoorEqual = new IndoorEqual(map);
    expect(addSource.mock.calls.length).toEqual(0);
    expect(addLayer.mock.calls.length).toEqual(0);
    expect(setFilter.mock.calls.length).toEqual(0);
    on.load();
    expect(addSource.mock.calls.length).toEqual(1);
    expect(addLayer.mock.calls.length).toEqual(9);
    expect(setFilter.mock.calls.length).toEqual(9);
  });

  it('create a container', () => {
    const indoorEqual = new IndoorEqual(map);
    expect(indoorEqual.$el).not.toBe(null);
    expect(indoorEqual.$el.classList.contains('mapboxgl-ctrl')).toBe(true);
    expect(indoorEqual.$el.classList.contains('mapboxgl-ctrl-group')).toBe(true);
  });

  it('returns the container when calling onAdd', () => {
    const indoorEqual = new IndoorEqual(map);
    expect(indoorEqual.$el).not.toBe(null);
    expect(indoorEqual.onAdd()).toEqual(indoorEqual.$el);
  });

  it('dont query the layer when the layer is not loaded', () => {
    const indoorEqual = new IndoorEqual(map);
    expect(indoorEqual.levels).toEqual([]);
    map.isSourceLoaded = (source) => {
      expect(source).toEqual('indoorequal');
      return false;
    };
    indoorEqual._updateLevels();
    expect(indoorEqual.levels).toEqual([]);
  });

  it('query the layer when the layer is loaded', () => {
    const indoorEqual = new IndoorEqual(map);
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

  it('render the levels as button', () => {
    const indoorEqual = new IndoorEqual(map);
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.$el.querySelectorAll('button').length).toEqual(2);
    expect(indoorEqual.$el.querySelectorAll('button.mapboxgl-ctrl-active').length).toEqual(1);
    expect(indoorEqual.$el.querySelector('button.mapboxgl-ctrl-active').textContent).toEqual('0');
  });

  it('render no levels if only one is available', () => {
    const indoorEqual = new IndoorEqual(map);
    indoorEqual.levels = ['0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.$el.querySelectorAll('button').length).toEqual(0);
  });

  it('allow to set the current level', () => {
    const indoorEqual = new IndoorEqual(map);
    indoorEqual.levels = ['1', '0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.level).toEqual('0');
    indoorEqual.updateLevel('1');
    expect(indoorEqual.level).toEqual('1');
    expect(indoorEqual.$el.querySelectorAll('button.mapboxgl-ctrl-active').length).toEqual(1);
    expect(indoorEqual.$el.querySelector('button.mapboxgl-ctrl-active').textContent).toEqual('1');
  });

  it('emit an event when the level change', () => {
    const indoorEqual = new IndoorEqual(map);
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
    const indoorEqual = new IndoorEqual(map);
    indoorEqual.levels = ['1', '0'];
    indoorEqual.updateLevel('1');
    indoorEqual._refreshAfterLevelsUpdate();
    indoorEqual.levels = ['0'];
    indoorEqual._refreshAfterLevelsUpdate();
    expect(indoorEqual.level).toEqual('0');
  });
});
