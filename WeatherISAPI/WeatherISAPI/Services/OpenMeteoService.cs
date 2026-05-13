using System.Text.Json;
using WeatherISCore.DTOs;
using WeatherISCore.Entities;

namespace WeatherISAPI.Services
{
    public class OpenMeteoService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<OpenMeteoService> _logger;

        public OpenMeteoService(HttpClient httpClient, ILogger<OpenMeteoService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<List<WeatherDataDto>> GetHistoricalDataAsync(
            int sensorId, double latitude, double longitude,
            DateTime startDate, DateTime endDate)
        {
            var start = startDate.ToString("yyyy-MM-dd");
            var end = endDate.ToString("yyyy-MM-dd");

            var url = $"https://archive-api.open-meteo.com/v1/archive" +
                      $"?latitude={latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&longitude={longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&start_date={start}&end_date={end}" +
                      $"&hourly=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,precipitation" +
                      $"&timezone=Europe%2FBerlin";

            try
            {
                var response = await _httpClient.GetStringAsync(url);
                var json = JsonDocument.Parse(response);
                var hourly = json.RootElement.GetProperty("hourly");

                var times = hourly.GetProperty("time").EnumerateArray().ToList();
                var temps = hourly.GetProperty("temperature_2m").EnumerateArray().ToList();
                var humidity = hourly.GetProperty("relative_humidity_2m").EnumerateArray().ToList();
                var pressure = hourly.GetProperty("pressure_msl").EnumerateArray().ToList();
                var windSpeed = hourly.GetProperty("wind_speed_10m").EnumerateArray().ToList();
                var precipitation = hourly.GetProperty("precipitation").EnumerateArray().ToList();

                var result = new List<WeatherDataDto>();
                for (int i = 0; i < times.Count; i++)
                {
                    if (DateTime.TryParse(times[i].GetString(), out var timestamp))
                    {
                        result.Add(new WeatherDataDto
                        {
                            SensorId = sensorId,
                            Timestamp = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc),
                            Temperature = temps[i].ValueKind != JsonValueKind.Null ? temps[i].GetDouble() : 0,
                            Humidity = humidity[i].ValueKind != JsonValueKind.Null ? humidity[i].GetDouble() : 0,
                            Pressure = pressure[i].ValueKind != JsonValueKind.Null ? pressure[i].GetDouble() : 0,
                            WindSpeed = windSpeed[i].ValueKind != JsonValueKind.Null ? windSpeed[i].GetDouble() : 0,
                            WindDirection = 0,
                            Precipitation = precipitation[i].ValueKind != JsonValueKind.Null ? precipitation[i].GetDouble() : 0,
                            Source = "OpenMeteo"
                        });
                    }
                }

                return result;
            } catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri dohvatu Open-Meteo historical podataka");
                return new List<WeatherDataDto>();
            }
        }

        public async Task<WeatherDataDto?> GetCurrentAsync(
            int sensorId, double latitude, double longitude)
        {
            var url = $"https://api.open-meteo.com/v1/forecast" +
                      $"?latitude={latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&longitude={longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,precipitation" +
                      $"&timezone=Europe%2FBerlin";

            try
            {
                var response = await _httpClient.GetStringAsync(url);
                var json = JsonDocument.Parse(response);
                var current = json.RootElement.GetProperty("current");

                return new WeatherDataDto
                {
                    SensorId = sensorId,
                    Timestamp = DateTime.UtcNow,
                    Temperature = current.GetProperty("temperature_2m").GetDouble(),
                    Humidity = current.GetProperty("relative_humidity_2m").GetDouble(),
                    Pressure = current.GetProperty("pressure_msl").GetDouble(),
                    WindSpeed = current.GetProperty("wind_speed_10m").GetDouble(),
                    Precipitation = current.GetProperty("precipitation").GetDouble(),
                    Source = "OpenMeteo"
                };
            } catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri dohvatu trenutnih podataka");
                return null;
            }
        }

        public async Task<List<Prediction>> GetForecastAsync(
            int sensorId, double latitude, double longitude, int days = 16)
        {
            var url = $"https://api.open-meteo.com/v1/forecast" +
                      $"?latitude={latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&longitude={longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                      $"&hourly=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m" +
                      $"&forecast_days={days}" +
                      $"&timezone=Europe%2FBerlin";

            try
            {
                var response = await _httpClient.GetStringAsync(url);
                var json = JsonDocument.Parse(response);
                var hourly = json.RootElement.GetProperty("hourly");

                var times = hourly.GetProperty("time").EnumerateArray().ToList();
                var temps = hourly.GetProperty("temperature_2m").EnumerateArray().ToList();
                var humidity = hourly.GetProperty("relative_humidity_2m").EnumerateArray().ToList();
                var pressure = hourly.GetProperty("pressure_msl").EnumerateArray().ToList();

                var predictions = new List<Prediction>();
                var generatedAt = DateTime.UtcNow;

                for (int i = 0; i < times.Count; i++)
                {
                    if (DateTime.TryParse(times[i].GetString(), out var timestamp))
                    {
                        predictions.Add(new Prediction
                        {
                            SensorId = sensorId,
                            GeneratedAt = generatedAt,
                            PredictedFor = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc),
                            PredictedTemperature = temps[i].ValueKind != JsonValueKind.Null ? Math.Round(temps[i].GetDouble(), 2) : 0,
                            PredictedHumidity = humidity[i].ValueKind != JsonValueKind.Null ? Math.Round(humidity[i].GetDouble(), 2) : 0,
                            PredictedPressure = pressure[i].ValueKind != JsonValueKind.Null ? Math.Round(pressure[i].GetDouble(), 2) : 0,
                            ModelVersion = "OpenMeteo-Forecast",
                            Source = "OpenMeteo"
                        });
                    }
                }

                return predictions;
            } catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri dohvatu Open-Meteo forecast podataka");
                return new List<Prediction>();
            }
        }
    }
}