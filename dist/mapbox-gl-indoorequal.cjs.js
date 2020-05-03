'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var debounce = _interopDefault(require('debounce'));
var arrayEqual = _interopDefault(require('array-equal'));

function findAllLevels(features) {
  const levels = [];
  for (let i = 0; i < features.length; i++) {
    const level = features[i].properties.level;
    if (!levels.includes(level)) {
      levels.push(level);
    }
  }
  return levels.sort((a, b) => a - b).reverse();
}

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

class IndoorEqual {
  constructor(map, options = {}) {
    const opts = { url: 'https://tiles.indoorequal.org/',  ...options };
    this.map = map;
    this.url = opts.url;
    this.levels = [];
    this.level = "0";
    this.events = {};

    if (this.map.loaded()) {
      this._addSource();
    } else {
      this.map.on('load', this._addSource.bind(this));
    }

    this.$el = document.createElement('div');
    this.$el.classList.add('mapboxgl-ctrl', 'mapboxgl-ctrl-group', 'mapboxgl-ctrl-indoorequal');
  }

  on(name, fn) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name].push(fn);
  }

  off(name, fn) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name] = this.events[name].filter(cb => cb !== fn);
  }

  onAdd() {
    return this.$el;
  }

  onRemove() {
    this.$el.remove();
  }

  updateLevel(level) {
    this.level = level;
    this._updateFilters();
    this._refreshControl();
    this._emitLevelChange();
  }

  _addSource() {
    this.map.addSource(SOURCE_ID, {
      type: 'vector',
      url: this.url
    });
    layers.forEach((layer) => {
      this.map.addLayer({
        source: SOURCE_ID,
        ...layer
      });
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
      this.level = '0';
      this._emitLevelChange();
    }
    this._refreshControl();
  }

  _refreshControl() {
    this.$el.innerHTML = '';
    if (this.levels.length === 1) {
      return;
    }
    const buttons = this.levels.map((level) => {
      const button = document.createElement('button');
      const strong = document.createElement('strong');
      strong.textContent = level;
      button.appendChild(strong);
      if (level == this.level) {
        button.classList.add('mapboxgl-ctrl-active');
      }
      button.addEventListener('click', () => {  this.updateLevel(level); });
      this.$el.appendChild(button);
    });
  }

  _updateLevels() {
    if (this.map.isSourceLoaded(SOURCE_ID)) {
      const features = this.map.querySourceFeatures(SOURCE_ID, { sourceLayer: 'area' });
      const levels = findAllLevels(features);
      if (!arrayEqual(levels, this.levels)) {
        this.levels = levels;
        this._refreshAfterLevelsUpdate();
      }
    }
  }

  _emitLevelChange() {
    (this.events['levelchange'] || []).forEach(fn => fn(this.level));
  }
}

module.exports = IndoorEqual;
