export const fetchWeatherByCoords = async (lat, lon) => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto`,
  );

  if (!response.ok) throw new Error('Weather data fetch failed');

  const data = await response.json();

  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    precipChance: data.daily.precipitation_probability_max[0],
  };
};

export const fetchWeatherByCity = async (city) => {
  // 1. Geocode
  const geoResp = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city,
    )}&count=1&language=en&format=json`,
  );
  const geoData = await geoResp.json();

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error('City not found');
  }

  const { latitude, longitude, name, country } = geoData.results[0];
  const displayName = `${name}, ${country}`;

  // 2. Fetch Weather
  const weather = await fetchWeatherByCoords(latitude, longitude);

  return {
    ...weather,
    city: displayName,
  };
};

export const getWeatherDescription = (code) => {
  // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3)
    return 'Mainly clear, partly cloudy, and overcast';
  if (code >= 45 && code <= 48) return 'Fog and depositing rime fog';
  if (code >= 51 && code <= 55)
    return 'Drizzle: Light, moderate, and dense intensity';
  if (code >= 56 && code <= 57)
    return 'Freezing Drizzle: Light and dense intensity';
  if (code >= 61 && code <= 65)
    return 'Rain: Light, moderate, and heavy intensity';
  if (code >= 66 && code <= 67)
    return 'Freezing Rain: Light and heavy intensity';
  if (code >= 71 && code <= 75)
    return 'Snow fall: Slight, moderate, and heavy intensity';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82)
    return 'Rain showers: Slight, moderate, and violent';
  if (code >= 85 && code <= 86) return 'Snow showers slight and heavy';
  if (code === 95) return 'Thunderstorm: Slight or moderate';
  if (code >= 96 && code <= 99)
    return 'Thunderstorm with slight and heavy hail';
  return 'Unknown weather';
};
