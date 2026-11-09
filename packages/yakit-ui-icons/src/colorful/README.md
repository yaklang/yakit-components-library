# Colorful icon sources

This directory contains the public `colorful` icon family. Canonical SVGs are generated only from
reviewed Figma provenance rows. Their visible paints retain exact Figma values; an
`@yakit-libs/color@1.4.1` custom property is used only when its resolved value is byte-equal, with the
exact Figma hex retained as the CSS fallback.

Local SVG fragment owners and references use
`icon_<sourceNodeDigits>__<kind>_<ordinal>`. The shared SVG React transform adds a React `useId()`
suffix per rendered instance. Hosts rendering independent React roots must supply distinct
`identifierPrefix` values per root, and use the same prefix for the corresponding server render and
hydration root.
