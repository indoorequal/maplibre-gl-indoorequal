import debounce from 'debounce';
import arrayEqual from 'array-equal';
import findAllLevels from './levels';
import LevelControl from './level_control';
import { layers } from './layers';
import loadSprite from './sprite';

class GeoJSONSource {
  constructor(map, options = {}) {
    const defaultOpts = { layers, geojson: {} };
    const opts = { ...defaultOpts, ...options };
    this.map = map;
    this.geojson = opts.geojson;
    this.layers = opts.layers;
    this.baseSourceId = 'indoorequal';
    this.sourceId = `${this.baseSourceId}_area`;
  }

  addSource() {
    Object.keys(this.geojson).forEach((layerName) => {
      this.map.addSource(`${this.baseSourceId}_${layerName}`, {
        type: 'geojson',
        data: this.geojson[layerName]
      });
    });
  }

  addLayers() {
    const sourceLayers = Object.keys(this.geojson);
    const layers = this.layers;
    this.layers = layers.filter((layer) => {
      return sourceLayers.includes(layer['source-layer']);
    });
    this.layers.forEach((layer) => {
      this.map.addLayer({
        source: `${this.baseSourceId}_${layer['source-layer']}`,
        ...layer,
        'source-layer': ''
      });
    });
  }

  remove() {
    this.layers.forEach((layer) => {
      this.map.removeLayer(layer.id);
    });
    Object.keys(this.geojson).forEach((layerName) => {
      this.map.removeSource(`${this.baseSourceId}_${layerName}`);
    });
  }
}

class VectorTileSource {
  constructor(map, options = {}) {
    const defaultOpts = { url: 'https://tiles.indoorequal.org/', layers };
    const opts = { ...defaultOpts, ...options };
    if (opts.url === defaultOpts.url && !opts.apiKey) {
      throw 'You must register your apiKey at https://indoorequal.com before and set it as apiKey param.';
    }
    this.map = map;
    this.url = opts.url;
    this.apiKey = opts.apiKey;
    this.layers = opts.layers;
    this.sourceId = 'indoorequal';
  }

  addSource() {
    const queryParams = this.apiKey ? `?key=${this.apiKey}` : '';
    this.map.addSource(this.sourceId, {
      type: 'vector',
      url: `${this.url}${queryParams}`
    });
  }

  addLayers() {
    this.layers.forEach((layer) => {
      this.map.addLayer({
        source: this.sourceId,
        ...layer
      });
    });
  }

  remove() {
    this.layers.forEach((layer) => {
      this.map.removeLayer(layer.id);
    });
    this.map.removeSource(this.sourceId);
  }
}

/**
 * Load the indoor= source and layers in your map.
 * @param {object} map the mapbox-gl/maplibre-gl instance of the map
 * @param {object} options
 * @param {string} [options.url] Override the default tiles URL (https://tiles.indoorequal.org/).
 * @param {object} [options.geojson] GeoJSON data with with key as layer name and value with geojson features
 * @param {string} [options.apiKey] The API key if you use the default tile URL (get your free key at [indoorequal.com](https://indoorequal.com)).
 * @param {array} [options.layers] The layers to be used to style indoor= tiles. Take a look a the [layers.js file](https://github.com/indoorequal/mapbox-gl-indoorequal/blob/master/src/layers.js) file and the [vector schema](https://indoorequal.com/schema)
 * @param {boolean} [options.heatmap] Should the heatmap layer be visible at start (true : visible, false : hidden). Defaults to true/visible.
 * @property {string} level The current level displayed
 * @property {array} levels  The levels that can be displayed in the current view
 * @fires IndoorEqual#levelschange
 * @fires IndoorEqual#levelchange
 * @return {IndoorEqual} `this`
 */
export default class IndoorEqual {
  constructor(map, options = {}) {
    const SourceKlass = options.geojson ? GeoJSONSource : VectorTileSource;
    const defaultOpts = { heatmap: true };
    const opts = { ...defaultOpts, ...options };
    this.source = new SourceKlass(map, options);
    this.map = map;
    this.levels = [];
    this.level = '0';
    this.events = {};

    if (this.map.isStyleLoaded()) {
      this._init();
      this.setHeatmapVisible(opts.heatmap);
    } else {
      this.map.once('load', () => {
        this._init();
        this.setHeatmapVisible(opts.heatmap);
      });
    }
  }

  /**
   * Remove any layers, source and listeners and controls
   */
  remove() {
    this.source.remove();
    this._updateLevelsDebounce.clear();
    this.map.off('load', this._updateLevelsDebounce);
    this.map.off('data', this._updateLevelsDebounce);
    this.map.off('move', this._updateLevelsDebounce);
    if (this._control) {
      this.onRemove();
    }
  }

  /**
   * Add an event listener
   * @param {string} name the name of the event
   * @param {function} fn the function to be called when the event is emitted
   */
  on(name, fn) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name].push(fn);
  }

  /**
   * Remove an event listener.
   * @param {string} name the name of the event
   * @param {function} fn the same function when on() was called
   */
  off(name, fn) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name] = this.events[name].filter(cb => cb !== fn);
  }

  /**
   * Add the level control to the map
   * Used when adding the control via the map instance: map.addControl(indoorEqual)
   */
  onAdd() {
    this._control = new LevelControl(this);
    return this._control.$el;
  }

  /**
   * Remove the level control
   * Used when removing the control via the map instance: map.removeControl(indoorEqual)
   */
  onRemove() {
    this._control.destroy();
    this._control = null;
  }

  /**
   * Set the displayed level.
   * @param {string} level the level to be displayed
   * @fires IndoorEqual#levelchange
   */
  setLevel(level) {
    this.level = level;
    this._updateFilters();
    this._emitLevelChange();
  }

  /**
   * Set the displayed level.
   * @deprecated Use setLevel instead
   * @param {string} level the level to be displayed
   * @fires IndoorEqual#levelchange
   */
  updateLevel(level) {
    console.log('The updateLevel method is deprecated. Please use setLevel instead.');
    this.setLevel(level);
  }

  /**
   * Load a sprite and add all images to the map
   * @param {string} baseUrl the baseUrl where to load the sprite
   * @param {object} options
   * @param {boolean} [options.update] Update existing image (default false)
   * @return {Promise} It resolves an hash of images.
   */
  loadSprite(baseUrl, options = {}) {
    const opts = { update: false, ...options };
    return loadSprite(baseUrl)
      .then((sprite) => {
        for (const id in sprite) {
          const { data, ...options } = sprite[id];
          if (!this.map.hasImage(id)) {
            this.map.addImage(id, data, options);
          } else if (opts.update) {
            this.map.updateImage(id, data);
          }
        }
        return sprite;
      });
  }

  /**
   * Change the heatmap layer visibility
   * @param {boolean} visible True to make it visible, false to hide it
   */
  setHeatmapVisible(visible) {
    if (this.map.getLayer('indoor-heat')) {
      this.map.setLayoutProperty('indoor-heat', 'visibility', visible ? 'visible' : 'none');
    }
  }

  _init() {
    this.source.addSource();
    this.source.addLayers();
    this._updateFilters();
    this._updateLevelsDebounce = debounce(this._updateLevels.bind(this), 1000);

    this.map.on('load', this._updateLevelsDebounce);
    this.map.on('data', this._updateLevelsDebounce);
    this.map.on('move', this._updateLevelsDebounce);
    this.map.on('remove', () => {
      this.remove();
    });
  }

  _updateFilters() {
    this.source.layers
    .filter(layer => layer.type !== 'heatmap')
    .forEach((layer) => {
      this.map.setFilter(layer.id, [ ...layer.filter || ['all'], ['==', 'level', this.level]]);
    });
  }

  _refreshAfterLevelsUpdate() {
    if (!this.levels.includes(this.level)) {
      this.setLevel('0');
    }
  }

  _updateLevels() {
    if (this.map.isSourceLoaded(this.source.sourceId)) {
      const features = this.map.querySourceFeatures(this.source.sourceId, { sourceLayer: 'area' });
      const levels = findAllLevels(features);
      if (!arrayEqual(levels, this.levels)) {
        this.levels = levels;
        this._emitLevelsChange();
        this._refreshAfterLevelsUpdate();
      }
    }
  }

  _emitLevelsChange() {
    this._emitEvent('levelschange', this.levels);
  }

  _emitLevelChange() {
    this._emitEvent('levelchange', this.level);
  }

  _emitEvent(eventName, ...args) {
    (this.events[eventName] || []).forEach(fn => fn(...args));
  }
}

/**
 * Emitted when the list of available levels has been updated
 *
 * @event IndoorEqual#levelschange
 * @type {array}
 */

/**
 * Emitted when the current level has been updated
 *
 * @event IndoorEqual#levelchange
 * @type {string} always emitted when the level displayed has changed
 */
