import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

const LocationContext = createContext(null);

const STORAGE_KEY_CITY = 'cb_city';
const STORAGE_KEY_STATE = 'cb_state';
const STORAGE_KEY_COUNTRY = 'cb_country';
const STORAGE_KEY_LAT = 'cb_lat';
const STORAGE_KEY_LNG = 'cb_lng';
const STORAGE_KEY_PROMPTED = 'cb_location_prompted';

export function LocationProvider({ children }) {
  const [userLocation, setUserLocation] = useState(() => {
    const lat = localStorage.getItem(STORAGE_KEY_LAT);
    const lng = localStorage.getItem(STORAGE_KEY_LNG);
    return lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
  });
  const [selectedCity, setSelectedCityState] = useState(
    () => localStorage.getItem(STORAGE_KEY_CITY) || ''
  );
  const [selectedState, setSelectedStateState] = useState(
    () => localStorage.getItem(STORAGE_KEY_STATE) || ''
  );
  const [selectedCountry, setSelectedCountryState] = useState(
    () => localStorage.getItem(STORAGE_KEY_COUNTRY) || ''
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const setSelectedCity = useCallback((city) => {
    setSelectedCityState(city);
    localStorage.setItem(STORAGE_KEY_CITY, city);
  }, []);

  const setSelectedState = useCallback((state) => {
    setSelectedStateState(state);
    localStorage.setItem(STORAGE_KEY_STATE, state);
  }, []);

  const setSelectedCountry = useCallback((country) => {
    setSelectedCountryState(country);
    localStorage.setItem(STORAGE_KEY_COUNTRY, country);
  }, []);

  /** Reverse geocode lat/lng using free Nominatim API */
  const reverseGeocode = useCallback(
    async (lat, lng) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const city =
          addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const country = addr.country || '';
        if (city) setSelectedCity(city);
        if (state) setSelectedState(state);
        if (country) setSelectedCountry(country);
      } catch (err) {
        console.warn('Reverse geocode failed', err);
      }
    },
    [setSelectedCity, setSelectedState, setSelectedCountry]
  );

  /** Detect location via browser GPS */
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setShowLocationModal(true);
      return;
    }
    setLocationLoading(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const loc = { lat: latitude, lng: longitude };
          setUserLocation(loc);
          localStorage.setItem(STORAGE_KEY_LAT, String(latitude));
          localStorage.setItem(STORAGE_KEY_LNG, String(longitude));
          localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
          await reverseGeocode(latitude, longitude);
          setLocationLoading(false);
          setShowLocationModal(false);
          resolve();
        },
        () => {
          setLocationDenied(true);
          setLocationLoading(false);
          // Show manual city picker
          setShowLocationModal(true);
          localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
          resolve();
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    });
  }, [reverseGeocode]);

  /** On first load — if no city saved, prompt location detection */
  useEffect(() => {
    const hasPrompted = localStorage.getItem(STORAGE_KEY_PROMPTED);
    const hasCity = localStorage.getItem(STORAGE_KEY_CITY);
    if (!hasPrompted && !hasCity) {
      detectLocation();
    }
  }, [detectLocation]);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        selectedCity,
        selectedState,
        selectedCountry,
        setSelectedCity,
        setSelectedState,
        setSelectedCountry,
        detectLocation,
        locationLoading,
        locationDenied,
        showLocationModal,
        setShowLocationModal,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider');
  return ctx;
}
