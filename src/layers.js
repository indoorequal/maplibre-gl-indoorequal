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

export const layers = [
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
    id: "indoor-transportation-poi",
    "type": "symbol",
    "source-layer": "transportation",
    "filter": [
      "all",
      [
        "in",
        "$type",
        "Point",
        "LineString"
      ],
      [
        "in",
        "class",
        "steps",
        "elevator",
        "escalator"
      ]
    ],
    "layout": {
      "icon-image": [
        "case",
        [
          "has",
          "conveying"
        ],
        "indoorequal-escalator",
        [
          "concat",
          [
            "literal",
            "indoorequal-"
          ],
          [
            "get",
            "class"
          ]]
      ],
      "symbol-placement": "line-center",
      "icon-rotation-alignment": "viewport"
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
