import { useState, useEffect, type FormEvent } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudLightning,
  Search,
  MapPin,
  Droplets,
  CloudFog,
  Loader2,
  Locate,
  Thermometer,
} from 'lucide-react';
import { getWeatherDescription } from '../../lib/weather';
import { useWeather } from '../../hooks/useWeather';

export default function WeatherWidget() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    weatherData,
    loading,
    error,
    fetchByCity,
    fetchByCoords,
    tempUnit,
    setTempUnit,
    lastLocation,
  } = useWeather();

  useEffect(() => {
    // Auto-load last location or try geolocation (only on mount)
    if (lastLocation && lastLocation.lat && lastLocation.lon) {
      fetchByCoords(lastLocation.lat, lastLocation.lon);
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchByCoords(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.error('Location access denied or error:', err);
          fetchByCity('New York');
        },
      );
    } else {
      fetchByCity('New York');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      fetchByCity(searchQuery);
    }
  };

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchByCoords(position.coords.latitude, position.coords.longitude);
          setSearchQuery('');
        },
        (err) => {
          console.error('Location access denied or error:', err);
        },
      );
    }
  };

  const handleToggleTempUnit = () => {
    setTempUnit(tempUnit === 'C' ? 'F' : 'C');
  };

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    if (code === 0) return <Sun className='w-8 h-8 text-yellow-500' />;
    if (code >= 1 && code <= 3)
      return <Cloud className='w-8 h-8 text-gray-500' />;
    if (code >= 45 && code <= 48)
      return <CloudFog className='w-8 h-8 text-gray-500' />;
    if (code >= 51 && code <= 67)
      return <CloudRain className='w-8 h-8 text-blue-400' />;
    if (code >= 71 && code <= 77)
      return <CloudSnow className='w-8 h-8 text-blue-200' />;
    if (code >= 80 && code <= 82)
      return <CloudRain className='w-8 h-8 text-blue-500' />;
    if (code >= 95 && code <= 99)
      return <CloudLightning className='w-8 h-8 text-yellow-600' />;
    return <Sun className='w-8 h-8 text-yellow-500' />;
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6'>
      <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>
        Weather
      </h3>

      <form onSubmit={handleSearch} className='flex gap-2 mb-4'>
        <div className='relative flex-1'>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search city...'
            aria-label='Search city'
            className='w-full h-10 pl-3 pr-28 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all'
          />
          <div className='absolute right-3 top-1/2 -translate-y-1/2 flex gap-2'>
            <button
              type='button'
              onClick={handleToggleTempUnit}
              disabled={loading}
              className={`p-2.5 rounded-md transition-all
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                disabled:opacity-50 disabled:cursor-not-allowed
                ${tempUnit === 'C'
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-800'
                  : 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 focus-visible:ring-orange-500 dark:focus-visible:ring-offset-gray-800'
                }`}
              title={`Switch to °${tempUnit === 'C' ? 'F' : 'C'}`}
              aria-label={`Temperature unit: ${tempUnit === 'C' ? 'Celsius' : 'Fahrenheit'}. Click to switch to ${tempUnit === 'C' ? 'Fahrenheit' : 'Celsius'}.`}
              aria-pressed={tempUnit === 'C' ? 'true' : 'false'}
            >
              <Thermometer size={20} />
            </button>
            <button
              type='button'
              onClick={handleCurrentLocation}
              disabled={loading}
              className='p-2.5 text-gray-500 bg-transparent hover:text-blue-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-800 rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
              title='Use Current Location'
              aria-label='Use Current Location'
            >
              <Locate size={20} />
            </button>
          </div>
        </div>
        <button
          type='submit'
          disabled={loading}
          className='h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
          aria-label='Search weather'
        >
          {loading ? (
            <Loader2 size={18} className='animate-spin' />
          ) : (
            <Search size={18} />
          )}
        </button>
      </form>

      {error && (
        <div className='text-red-500 text-sm text-center mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded'>
          {error}
        </div>
      )}

      {!loading && weatherData ? (
        <div className='text-center'>
          <div className='flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300 text-sm mb-2'>
            <MapPin size={14} />
            <span className='truncate max-w-50'>{weatherData.city}</span>
          </div>

          <div className='flex flex-col items-center gap-2 mb-2'>
            {getWeatherIcon(weatherData.code)}
            <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
              {getWeatherDescription(weatherData.code)}
            </span>
            <div className='flex items-baseline justify-center gap-0.5'>
              <span className='text-4xl font-bold text-gray-900 dark:text-white transition-all duration-300'>
                {weatherData.temp}
              </span>
              <span className='text-2xl font-medium text-gray-600 dark:text-gray-400'>
                °{weatherData.unit || tempUnit}
              </span>
            </div>
          </div>

          <div className='flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 py-1.5 px-3 rounded-full mx-auto'>
            <Droplets size={14} className='text-blue-500' />
            <span>{weatherData.precipChance}% chance of rain</span>
          </div>
        </div>
      ) : (
        !loading &&
        !weatherData && (
          <div className='text-center text-gray-500 text-sm py-4'>
            No weather data available.
          </div>
        )
      )}
    </div>
  );
}
