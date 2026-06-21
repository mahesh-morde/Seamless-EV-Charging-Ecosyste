export const APP_CONSTANTS = {
  ROLES: {
    DRIVER: 'driver' as const,
    OPERATOR: 'operator' as const
  },
  THEMES: {
    DARK: 'dark' as const,
    LIGHT: 'light' as const
  },
  STORAGE_KEYS: {
    SESSION: 'voltstream_session',
    PRESENTATION_THEME: 'presentation-theme'
  },
  MAP: {
    DEFAULT_CENTER: { lat: 12.9839, lng: 77.7523 }, // Sheraton Grand Bengaluru Whitefield
    DEFAULT_CAR_LOCATION: { lat: 12.9839, lng: 77.7523 },
    DEFAULT_ZOOM: 14
  },
  API_ENDPOINTS: {
    OVERPASS_INTERPRETER: 'https://overpass-api.de/api/interpreter',
    NOMINATIM_SEARCH: 'https://nominatim.openstreetmap.org/search',
    OSRM_ROUTING: 'https://router.project-osrm.org/route/v1/driving/',
    IP_GEOLOCATION: 'https://ipapi.co/json/'
  },
  DEFAULTS: {
    WALLET_BALANCE: 1250.00,
    CO2_SAVED: 184.5,
    VEHICLE_SOC: 71,
    ESTIMATED_RANGE: 245,
    GRID_LOAD: 72,
    GRID_LOAD_WARNING: 92,
    TRANSACTION_LIMIT_KW: 70
  }
};
