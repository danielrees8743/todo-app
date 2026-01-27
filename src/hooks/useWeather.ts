import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchWeatherByCity as getCityWeather,
  fetchWeatherByCoords as getCoordsWeather,
  type WeatherData,
} from '../lib/weather';

interface UseWeatherReturn {
  weatherData: WeatherData | null;
  loading: boolean;
  error: string | null;
  fetchByCity: (city: string) => Promise<void>;
  fetchByCoords: (lat: number, lon: number) => Promise<void>;
  tempUnit: 'C' | 'F';
  setTempUnit: (unit: 'C' | 'F') => void;
  lastLocation: { city: string; lat: number; lon: number } | null;
}

interface LocationState {
  city?: string;
  lat?: number;
  lon?: number;
}

export function useWeather(): UseWeatherReturn {
  const queryClient = useQueryClient();

  // Temperature unit preference from localStorage (lazy initializer)
  const [tempUnit, setTempUnitState] = useState<'C' | 'F'>(() => {
    const saved = localStorage.getItem('weatherUnit');
    return (saved === 'C' || saved === 'F') ? saved : 'C';
  });

  // Last location from localStorage (lazy initializer)
  const [lastLocation, setLastLocation] = useState<{
    city: string;
    lat: number;
    lon: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('lastWeatherLocation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Current location state for query
  const [location, setLocation] = useState<LocationState | null>(lastLocation);
  const [error, setError] = useState<string | null>(null);

  // Sync tempUnit to localStorage
  useEffect(() => {
    localStorage.setItem('weatherUnit', tempUnit);
  }, [tempUnit]);

  // Fetch weather with TanStack Query
  const { data: weatherData, isLoading: loading } = useQuery({
    queryKey: ['weather', location, tempUnit],
    queryFn: async (): Promise<WeatherData | null> => {
      if (!location) return null;

      try {
        setError(null);
        let weather: WeatherData;

        if (location.city && location.lat && location.lon) {
          // Fetch by city (already has coordinates)
          weather = await getCoordsWeather(location.lat, location.lon, tempUnit);
          weather.city = location.city;
        } else if (location.lat && location.lon) {
          // Fetch by coordinates only
          weather = await getCoordsWeather(location.lat, location.lon, tempUnit);
        } else if (location.city) {
          // Fetch by city name
          weather = await getCityWeather(location.city, tempUnit);
        } else {
          return null;
        }

        // Add unit to weather data
        return { ...weather, unit: tempUnit };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load weather';
        setError(errorMessage);
        throw err;
      }
    },
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch weather by city
  const fetchByCity = useCallback(
    async (city: string) => {
      try {
        setError(null);
        const weather = await getCityWeather(city, tempUnit);

        // Save location with coordinates for future use
        const newLocation = {
          city: weather.city || city,
          lat: 0, // Will be replaced by actual coords in next query
          lon: 0,
        };

        setLocation({ city: weather.city || city });
        setLastLocation(newLocation);
        localStorage.setItem('lastWeatherLocation', JSON.stringify(newLocation));

        // Invalidate query to fetch fresh data
        queryClient.invalidateQueries({ queryKey: ['weather'] });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load weather';
        setError(errorMessage);
        throw err;
      }
    },
    [tempUnit, queryClient],
  );

  // Fetch weather by coordinates
  const fetchByCoords = useCallback(
    async (lat: number, lon: number) => {
      try {
        setError(null);
        const newLocation = {
          city: 'Current Location',
          lat,
          lon,
        };

        setLocation(newLocation);
        setLastLocation(newLocation);
        localStorage.setItem('lastWeatherLocation', JSON.stringify(newLocation));

        // Invalidate query to fetch fresh data
        queryClient.invalidateQueries({ queryKey: ['weather'] });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load weather';
        setError(errorMessage);
        throw err;
      }
    },
    [queryClient],
  );

  // Wrapper to update temp unit and invalidate cache
  const setTempUnit = useCallback(
    (unit: 'C' | 'F') => {
      setTempUnitState(unit);
      // Invalidate queries to refetch with new unit
      queryClient.invalidateQueries({ queryKey: ['weather'] });
    },
    [queryClient],
  );

  return {
    weatherData: weatherData || null,
    loading,
    error,
    fetchByCity,
    fetchByCoords,
    tempUnit,
    setTempUnit,
    lastLocation,
  };
}
