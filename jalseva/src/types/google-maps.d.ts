// Minimal ambient declarations for the Google Maps JavaScript API.
// Avoids pulling in the full `@types/google.maps` package while still letting
// existing usages (e.g. `google.maps.Map`, `google.maps.marker.AdvancedMarkerElement`)
// type-check successfully. All members are typed as `any` because we only
// interact with them through the runtime-loaded global.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-namespace */
declare namespace google {
  namespace maps {
    type Map = any;
    type Marker = any;
    type Polyline = any;
    type DirectionsRenderer = any;
    type LatLngBounds = any;
    type LatLngLiteral = { lat: number; lng: number };
    namespace marker {
      type AdvancedMarkerElement = any;
    }
    const SymbolPath: any;
    const Map: any;
    const Marker: any;
    const Polyline: any;
    const DirectionsRenderer: any;
    const LatLngBounds: any;
  }
}

declare interface Window {
  google?: typeof google;
}
