import { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Globe } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
export default function LocationModal() {
  const {
    showLocationModal,
    setShowLocationModal,
    detectLocation,
    locationLoading,
    setSelectedCity,
    setSelectedState,
    setSelectedCountry,
  } = useLocation();
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN'); // Default India
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [manualMode, setManualMode] = useState(false);

  // Dynamic import state for country-state-city
  const [csc, setCsc] = useState(null);

  // Load the massive JSON payload only when manual mode is engaged
  useEffect(() => {
    if (manualMode && !csc) {
      import('country-state-city').then((module) => {
        setCsc(module);
      });
    }
  }, [manualMode, csc]);

  if (!showLocationModal) return null;

  const countries = csc ? csc.Country.getAllCountries() : [];
  const states = (csc && selectedCountryCode)
    ? csc.State.getStatesOfCountry(selectedCountryCode)
    : [];
  const cities = (csc && selectedStateCode)
    ? csc.City.getCitiesOfState(selectedCountryCode, selectedStateCode)
    : [];

  const handleCountryChange = (e) => {
    setSelectedCountryCode(e.target.value);
    setSelectedStateCode('');
    setSelectedCityName('');
  };

  const handleStateChange = (e) => {
    setSelectedStateCode(e.target.value);
    setSelectedCityName('');
  };

  const handleConfirm = () => {
    if (!selectedCityName || !csc) return;
    const country = csc.Country.getCountryByCode(selectedCountryCode);
    const state = csc.State.getStateByCodeAndCountry(
      selectedStateCode,
      selectedCountryCode
    );
    setSelectedCity(selectedCityName);
    if (state) setSelectedState(state.name);
    if (country) setSelectedCountry(country.name);
    setShowLocationModal(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="glass-strong rounded-3xl max-w-md w-full p-8 border border-white/15 animate-scale-in shadow-2xl relative">
        {/* Close button — only if user already has a city set */}
        <button
          onClick={() => setShowLocationModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#e63946] to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Location</h2>
          <p className="text-gray-400 text-sm">
            Detect your location to see movies and theatres near you
          </p>
        </div>

        {/* GPS Button */}
        {!manualMode && (
          <div className="space-y-4">
            <button
              onClick={detectLocation}
              disabled={locationLoading}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Detecting
                  location...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" /> Use My Current Location
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative text-center">
                <span className="bg-[#12121a] px-4 text-xs text-gray-500 uppercase tracking-widest">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={() => setManualMode(true)}
              className="btn-ghost w-full flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Select City Manually
            </button>
          </div>
        )}

        {/* Manual City Picker */}
        {manualMode && (
          <div className="space-y-4">
            <button
              onClick={() => setManualMode(false)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mb-2"
            >
              <Navigation className="w-3 h-3" /> Use GPS instead
            </button>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={selectedCountryCode}
                  onChange={handleCountryChange}
                  className="input-field pl-10 appearance-none"
                >
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {states.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                  State / Province
                </label>
                <select
                  value={selectedStateCode}
                  onChange={handleStateChange}
                  className="input-field"
                >
                  <option value="">Select state...</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {cities.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                  City
                </label>
                <select
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select city...</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!selectedCityName}
              className="btn-primary w-full disabled:opacity-40 mt-2"
            >
              Confirm Location
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
