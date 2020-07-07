import debounce from 'debounce';
import arrayEqual from 'array-equal';
import findAllLevels from './levels';
import LevelControl from './level_control';
import { layers } from './layers';

const SOURCE_ID = 'indoorequal';

/**
 * Load the indoor= source and layers in your map.
 * @param {object} map the mapbox-gl instance of the map
 * @param {object} options
 * @param {url} [options.url] Override the default tiles URL (https://tiles.indoorequal.org/).
 * @param {string} [options.apiKey] The API key if you use the default tile URL (get your free key at [indoorequal.com](https://indoorequal.com)).
 * @param {array} [options.layers] The layers to be used to style indoor= tiles.
 * @property {string} level The current level displayed
 * @property {array} levels  The levels that can be displayed in the current view
 * @fires IndoorEqual#levelschange
 * @fires IndoorEqual#levelchange
 * @return {IndoorEqual} `this`
 */
export default class IndoorEqual {
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
    this.levels = [];
    this.level = "0";
    this.events = {};

    if (this.map.isStyleLoaded()) {
      this._addSource();
    } else {
      this.map.on('load', this._addSource.bind(this));
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
   * @deprecated
   * @param {string} level the level to be displayed
   * @fires IndoorEqual#levelchange
   */
  updateLevel(level) {
    this.setLevel(level);
  }

  _addSource() {
    const queryParams = this.apiKey ? `?key=${this.apiKey}` : '';
    this.map.addSource(SOURCE_ID, {
      type: 'vector',
      url: `${this.url}${queryParams}`
    });
    this.layers.forEach((layer) => {
      this.map.addLayer({
        source: SOURCE_ID,
        ...layer
      })
    });
    this._updateFilters();
    const updateLevels = debounce(this._updateLevels.bind(this), 1000);

    this.map.on('load', updateLevels);
    this.map.on('data', updateLevels);
    this.map.on('move', updateLevels);
  }

  _updateFilters() {
    this.layers.forEach((layer) => {
      this.map.setFilter(layer.id, [ ...layer.filter || ['all'], ['==', 'level', this.level]]);
    });
  }

  _refreshAfterLevelsUpdate() {
    if (!this.levels.includes(this.level)) {
      this.setLevel('0');
    }
  }

  _updateLevels() {
    if (this.map.isSourceLoaded(SOURCE_ID)) {
      const features = this.map.querySourceFeatures(SOURCE_ID, { sourceLayer: 'area' });
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
 * Emitted when the list of available levels has been updated
 *
 * @event IndoorEqual#levelchange
 * @type {string} always emitted when the level displayed has changed
 */
