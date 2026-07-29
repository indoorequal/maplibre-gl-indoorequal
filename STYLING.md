# Styling keys

The default style lives in [`src/layers.js`](src/layers.js) and can be replaced entirely with
the `layers` option. To write your own you need to know which source layers the indoor= tiles
contain, which fields are on each, and which values those fields can take. That is what this
page documents.

See also the [vector tile schema](https://indoorequal.com/doc/schema).

## Two different data surfaces

Only the first of these is usable for styling:

|                   | What it is                                        | Use it for                                        |
| ----------------- | ------------------------------------------------- | ------------------------------------------------- |
| **Vector tiles**  | The five source layers below                      | Styling: filters, expressions, `source-layer`     |
| **POI endpoint**  | A single feature fetched by id, returned as GeoJSON | Popups and sidebars                             |

The POI endpoint returns the feature's full OSM `tags`, `opening_hours`, `website`,
`contact:website`, `facebook`, `contact:facebook`, `phone`, `contact:phone`, `wheelchair`,
`vending`, `male`, `female`, `changing_table`, `panoramax`. **None of these are in the vector
tiles**, so they cannot be used in a filter or an expression. Fetch the feature by id when
the user interacts with it.

## `level`, on every layer

`level` is a **string** in the tiles, not a number, so filter with
`["==", ["get", "level"], "0"]`. Wrap it in `["to-number", ...]` if you need to compare
or do arithmetic on it, for example to place a floor at a height.

A single OSM object becomes **one feature per level**. Both `level=*` and `repeat_on=*` are
expanded and concatenated, so:

| OSM tag                    | Features emitted at level |
| -------------------------- | ------------------------- |
| `level=1`                  | 1                         |
| `level=0;2`                | 0, 2                      |
| `level=0-3`                | 0, 1, 2, 3                |
| `level=0` + `repeat_on=1-2`| 0, 1, 2                   |
| `level=0.5`                | 0.5                       |

Ranges (`0-3`) must be whole numbers. A single value may carry one decimal place (`0.5`),
which is how mezzanines appear. Anything else is dropped, the object gets no features at
all, since a parsable `level` is required for import.

## `area`

Indoor areas. Polygons, plus lines for walls.

| Field      | Values                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class`    | `area`, `column`, `corridor`, `level`, `platform`, `room`, `wall`, from `indoor=*`, except `platform` (from `public_transport=*`) and `wall` (a line) |
| `subclass` | The raw `room=*` value: `class`, `laboratory`, `office`, `auditorium`, `amphitheatre`, `reception`, ...                                                      |
| `is_poi`   | Boolean. True when the area carries any of `amenity`, `shop`, `craft`, `leisure`, `office`, `sport`, `tourism`, `exhibit`, `door`                          |
| `level`    | See above                                                                                                                                                 |
| `access`   | Raw `access=*` value. The default style greys out `no` and `private`                                                                                      |

Two behaviours worth knowing before styling this layer:

Areas of class `area`, `corridor` and `platform` that are *not* POIs are **merged into a
single feature per (level, access)**: one union geometry, `class=area`, `subclass` null.
Such a corridor cannot be styled individually and carries no name. Only areas where `is_poi`
is true survive as separate features, which also means `corridor` and `platform` only ever
appear as `class` values on areas carrying a POI tag. Everything else lands under `area`.

There is **no `id` field**, so features in this layer cannot be identified for click
handling.

## `area_name`

Label points for named areas. Areas carrying a POI tag are excluded, they are labelled from
the `poi` layer instead.

| Field                | Values                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| `name`               | Raw `name=*`                                                                  |
| `name_en`, `name_de` | Falls back to `name` when absent                                              |
| `name:xx`            | Per-language names, for the 67 languages configured in the backend            |
| `ref`                | Raw `ref=*`, room numbers live here                                          |
| `level`              | See above                                                                     |

No `class`, no `subclass`, no `id`.

## `transportation`

Lines only.

| Field        | Values                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| `class`      | **`steps` is the only possible value.** Only `highway=steps` is imported   |
| `conveying`  | Raw `conveying=*`, with `no` and empty normalised to null                  |
| `level`      | See above                                                                 |

Escalators are not a separate class, they are `class=steps` with `conveying` set, which is
why the default style keys its escalator icon off `["has", "conveying"]`. Elevators are not
here at all, `highway=elevator` is not imported into this layer, but they do show up in the
`poi` layer as `class=elevator`. There is no `id`.

## `poi`

Points of interest, from both nodes and polygon centroids.

| Field                                    | Values                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                     | `node:123`, `way:456` or `relation:789`. Pass this to the POI endpoint                                                                                                                                     |
| `class`                                  | Coarse grouping: `shop`, `office`, `bank`, `school`, `lodging`, `grocery`, ... Style this to catch a whole family at once. Falls back to the `subclass` value when no grouping applies                       |
| `subclass`                               | The raw tag value, from `amenity`, `shop`, `tourism`, `office`, `entrance`, `door`, `emergency` and ~20 other keys. For `information`, `place_of_worship`, `pitch` and `vending_machine` it is replaced by the more specific `information`, `religion`, `sport` and `vending` value |
| `name`, `name_en`, `name_de`, `name:xx`  | As `area_name`                                                                                                                                                                                             |
| `ref`                                    | Raw `ref=*`                                                                                                                                                                                                |
| `level`                                  | See above                                                                                                                                                                                                  |
| `layer`                                  | Raw `layer=*`, null when 0                                                                                                                                                                                 |
| `indoor`                                 | `1` when the POI is indoor, otherwise null                                                                                                                                                                 |
| `rank`                                   | Relative importance within a grid cell, use it to thin labels at low zoom                                                                                                                                 |
| `agg_stop`                               | Experimental; `1` marks the main platform of a public transport stop                                                                                                                                       |

`class` is usually the field to style against; reach for `subclass` when a specific icon is
needed.

## `heat`

Density of indoor mapping, for low zooms. Fields: `id` only. Available z0-16, while the other
layers start at z17.

## Not available in the tiles

*   `id` on `area`, `area_name` and `transportation`. Only `poi` and `heat` carry one
*   Any OSM tag not listed above, including everything in the POI endpoint's `tags`
*   `level:ref`. Level names such as "G" or "M" are not imported, so levels can only be
    presented numerically
