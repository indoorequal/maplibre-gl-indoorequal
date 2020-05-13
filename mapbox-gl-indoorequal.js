import debounce from 'debounce';
import arrayEqual from 'array-equal';
import findAllLevels from './levels';
import LevelControl from './level_control';

const SOURCE_ID = 'indoorequal';
const commonPoi = {
  "type": "symbol",
  "source-layer": "poi",
  "layout": {
    "icon-image": "{class}_11",
    "text-anchor": "top",
    "text-field": "{name:latin}\n{name:nonlatin}",
    "text-font": [
      "Noto Sans Regular"
    ],
    "text-max-width": 9,
    "text-offset": [
      0,
      0.6
    ],
    "text-padding": 2,
    "text-size": 12
  },
  "paint": {
    "text-color": "#666",
    "text-halo-blur": 0.5,
    "text-halo-color": "#ffffff",
    "text-halo-width": 1
  }
};

const rank2Class = ["waste_basket", "information"];

const layers = [
  {
    id: "indoor-polygon",
    type: "fill",
    "source-layer": "area",
    filter: [
      "all",
      [
        "==",
        "$type",
        "Polygon"
      ],
      [
        "!=",
        "class",
        "level"
      ]
    ],
    layout: {
      visibility: "visible"
    },
    paint: {
      "fill-color": "white"
    }
  },
  {
    id: "indoor-area",
    "type": "line",
    "source-layer": "area",
    "filter": [
      "all",
      [
        "in",
        "class",
        "area",
        "corridor",
        "platform"
      ]
    ],
    "layout": {
      "visibility": "visible"
    },
    "paint": {
      "line-color": "#bfbfbf",
      "line-width": 1
    }
  },
  {
    id: "indoor-column",
    "type": "fill",
    "source-layer": "area",
    "filter": [
      "all",
      [
        "==",
        "class",
        "column"
      ]
    ],
    "layout": {
      "visibility": "visible"
    },
    "paint": {
      "fill-color": "#bfbfbf"
    }
  },
  {
    id: "indoor-lines",
    "type": "line",
    "source-layer": "area",
    "filter": [
      "all",
      [
        "in",
        "class",
        "room",
        "wall"
      ]
    ],
    "layout": {
      "visibility": "visible"
    },
    "paint": {
      "line-color": "gray",
      "line-width": 2
    }
  },
  {
    id: "indoor-transportation",
    "type": "line",
    "source-layer": "transportation",
    "filter": [
      "all"
    ],
    "layout": {
      "visibility": "visible",
    },
    "paint": {
      "line-color": "gray",
      "line-dasharray": [
        0.4,
        0.75
      ],
      "line-width": {
        "base": 1.4,
        "stops": [
          [
            17,
            2
          ],
          [
            20,
            10
          ]
        ]
      }
    }
  },
  {
    id: "indoor-poi-rank1",
    ...commonPoi,
    "filter": [
      "all",
      [
        "==",
        "$type",
        "Point"
      ],
      [
        "!in",
        "class",
        ...rank2Class
      ]
    ]
  },
  {
    id: "indoor-poi-rank2",
    ...commonPoi,
    minzoom: 19,
    "filter": [
      "all",
      [
        "==",
        "$type",
        "Point"
      ],
      [
        "in",
        "class",
        ...rank2Class
      ]
    ]
  },
  {
    id: "indoor-poi-vending",
    ...commonPoi,
    minzoom: 19,
    "filter": [
      "all",
      [
        "==",
        "$type",
        "Point"
      ],
      [
        "==",
        "class",
        "vending_machine"
      ]
    ],
    "layout": {
      ...commonPoi.layout,
      "icon-image": "{subclass}_11"
    }
  },
  {
    id: "indoor-name",
    "type": "symbol",
    "source-layer": "area_name",
    "filter": [
      "all"
    ],
    "layout": {
      "text-field": ["get", "name"],
      "text-font": [
        "Noto Sans Regular"
      ],
      "text-max-width": 5,
      "text-size": 14
    },
    "paint": {
      "text-color": "#666",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1
    }
  }
];

/**
 * Load the indoor= source and layers in your map.
 * @param {object} map the mapbox-gl instance of the map
 * @param {object} options
 * @param {url} [options.url] Override the default tiles URL (https://tiles.indoorequal.org/).
 * @param {url} [options.apiKey] The API key if you use the default tile URL (get your free key at [indoorequal.com](https://indoorequal.com)).
 * @property {string} level The current level displayed
 * @property {array} levels  The levels that can be displayed in the current view
 * @fires IndoorEqual#levelschange
 * @fires IndoorEqual#levelchange
 * @return {IndoorEqual} `this`
 */
export default class IndoorEqual {
  constructor(map, options = {}) {
    const defaultOpts = { url: 'https://tiles.indoorequal.org/' };
    const opts = { ...defaultOpts, ...options };
    if (opts.url === defaultOpts.url && !opts.apiKey) {
      throw 'You must register your apiKey at https://indoorequal.com before and set it as apiKey param.';
    }
    this.map = map;
    this.url = opts.url;
    this.apiKey = opts.apiKey;
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
   * Update the displayed level.
   * @param {string} level the level to be displayed
   * @fires IndoorEqual#levelchange
   */
  updateLevel(level) {
    this.level = level;
    this._updateFilters();
    this._emitLevelChange();
  }

  _addSource() {
    const queryParams = this.apiKey ? `?key=${this.apiKey}` : '';
    this.map.addSource(SOURCE_ID, {
      type: 'vector',
      url: `${this.url}${queryParams}`
    });
    layers.forEach((layer) => {
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
    layers.forEach((layer) => {
      this.map.setFilter(layer.id, [ ...layer.filter, ['==', 'level', this.level]]);
    });
  }

  _refreshAfterLevelsUpdate() {
    if (!this.levels.includes(this.level)) {
      this.updateLevel('0');
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
