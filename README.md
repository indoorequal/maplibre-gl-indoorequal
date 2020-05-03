# Mapbox-gl-indoorequal

mapbobx-gl-indoorequal is a mapbox-gl.js plugin to display indoor data from [indoor=][].

## Install

**With NPM**

    npm install --save mapbox-gl-indoorequal

**In the browser**

    <script src="https://unpkg.com/mapbox-gl-indoorequal@latest/dist/mapbox-gl-indoorequal.umd.min.js"></script>

## Example

    const mapboxgl = require('mapbox-gl');
    const IndoorEqual = require('mapbox-gl-indoorequal');

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/traffic-night-v2',
        center: [-77.0259, 38.9010],
        zoom: 9
    });
    const indoorEqual = new IndoorEqual(map);
    map.addControl(indoorEqual);

## License

GNU AGPL v3

[indoor=]: https://indoorequal.org/
