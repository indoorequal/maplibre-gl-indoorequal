import debounce from 'debounce';
import arrayEqual from 'array-equal';

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

class LevelControl {
  constructor(indoorequal) {
    this.indoorequal = indoorequal;
    this._cbRefresh = () => this._refresh();
    this.indoorequal.on('levelschange', this._cbRefresh);
    this.indoorequal.on('levelchange', this._cbRefresh);

    this.$el = document.createElement('div');
    this.$el.classList.add('mapboxgl-ctrl', 'mapboxgl-ctrl-group', 'mapboxgl-ctrl-indoorequal');
    this._refresh();
  }

  destroy() {
    this.$el.remove();
    this.indoorequal.off('levelschange', this._cbRefresh);
    this.indoorequal.off('levelchange', this._cbRefresh);
  }

  _refresh() {
    this.$el.innerHTML = '';
    if (this.indoorequal.levels.length === 1) {
      return;
    }
    const buttons = this.indoorequal.levels.map((level) => {
      const button = document.createElement('button');
      const strong = document.createElement('strong');
      strong.textContent = level;
      button.appendChild(strong);
      if (level == this.indoorequal.level) {
        button.classList.add('mapboxgl-ctrl-active');
      }
      button.addEventListener('click', () => {  this.indoorequal.setLevel(level); });
      this.$el.appendChild(button);
    });
  }
}

const commonPoi = {
  "type": "symbol",
  "source-layer": "poi",
  "layout": {
    "icon-image": "{class}_11",
    "text-anchor": "top",
    "text-field": "{name:latin}\n{name:nonlatin}",
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

function createImage(image, {width, height}, channels, data) {
    if (!data) {
        data = new Uint8Array(width * height * channels);
    } else if (data instanceof Uint8ClampedArray) {
        data = new Uint8Array(data.buffer);
    } else if (data.length !== width * height * channels) {
        throw new RangeError('mismatched image size');
    }
    image.width = width;
    image.height = height;
    image.data = data;
    return image;
}

function resizeImage(image, {width, height}, channels) {
    if (width === image.width && height === image.height) {
        return;
    }

    const newImage = createImage({}, {width, height}, channels);

    copyImage(image, newImage, {x: 0, y: 0}, {x: 0, y: 0}, {
        width: Math.min(image.width, width),
        height: Math.min(image.height, height)
    }, channels);

    image.width = width;
    image.height = height;
    image.data = newImage.data;
}

function copyImage(srcImg, dstImg, srcPt, dstPt, size, channels) {
    if (size.width === 0 || size.height === 0) {
        return dstImg;
    }

    if (size.width > srcImg.width ||
        size.height > srcImg.height ||
        srcPt.x > srcImg.width - size.width ||
        srcPt.y > srcImg.height - size.height) {
        throw new RangeError('out of range source coordinates for image copy');
    }

    if (size.width > dstImg.width ||
        size.height > dstImg.height ||
        dstPt.x > dstImg.width - size.width ||
        dstPt.y > dstImg.height - size.height) {
        throw new RangeError('out of range destination coordinates for image copy');
    }

    const srcData = srcImg.data;
    const dstData = dstImg.data;

    for (let y = 0; y < size.height; y++) {
        const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels;
        const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels;
        for (let i = 0; i < size.width * channels; i++) {
            dstData[dstOffset + i] = srcData[srcOffset + i];
        }
    }
    return dstImg;
}

// Not premultiplied, because ImageData is not premultiplied.
// UNPACK_PREMULTIPLY_ALPHA_WEBGL must be used when uploading to a texture.
class RGBAImage {
    constructor(size, data) {
        createImage(this, size, 4, data);
    }

    resize(size) {
        resizeImage(this, size, 4);
    }

    replace(data, copy) {
        if (copy) {
            this.data.set(data);
        } else if (data instanceof Uint8ClampedArray) {
            this.data = new Uint8Array(data.buffer);
        } else {
            this.data = data;
        }
    }

    clone() {
        return new RGBAImage({width: this.width, height: this.height}, new Uint8Array(this.data));
    }

    static copy(srcImg, dstImg, srcPt, dstPt, size) {
        copyImage(srcImg, dstImg, srcPt, dstPt, size, 4);
    }
}

function getImageData(img, padding) {
  const canvas = window.document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('failed to create canvas 2d context');
  }
  canvas.width = img.width;
  canvas.height = img.height;
  context.drawImage(img, 0, 0, img.width, img.height);
  return context.getImageData(0, 0, img.width, img.height);
}

function loadSprite(baseUrl) {
  const format = window.devicePixelRatio > 1 ? '@2x' : '';
  let json, image;

  const jsonRequest = fetch(`${baseUrl}${format}.json`)
        .then(r => r.json())
        .then(r => json = r);

  const imageRequest = fetch(`${baseUrl}${format}.png`)
        .then(r => r.blob())
        .then(r => {
          image = new Image();
          image.src = URL.createObjectURL(r);
          return new Promise((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject();
          });
        });

  return Promise.all([jsonRequest, imageRequest])
    .then(() => {
      const imageData = getImageData(image);
      const result = {};

      for (const id in json) {
        const {width, height, x, y, sdf, pixelRatio, stretchX, stretchY, content} = json[id];
        const data = new RGBAImage({width, height});
        RGBAImage.copy(imageData, data, {x, y}, {x: 0, y: 0}, {width, height});
        result[id] = {data, pixelRatio, sdf, stretchX, stretchY, content};
      }
      return result;
    });
}

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
class IndoorEqual {
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

  /**
   * Load a sprite and add all images to the map
   * @param {string} baseUrl the baseUrl where to load the sprite
   * @param {object} options
   * @param {url} [options.update] Update existing image (default false)
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
      });
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

export default IndoorEqual;
