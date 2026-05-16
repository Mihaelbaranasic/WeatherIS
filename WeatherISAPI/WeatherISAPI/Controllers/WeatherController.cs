using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Interfaces;
using WeatherISAPI.Services;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly ISensorRepository _sensorRepository;
        private readonly OpenMeteoService _openMeteoService;

        public WeatherController(
            ISensorRepository sensorRepository,
            OpenMeteoService openMeteoService)
        {
            _sensorRepository = sensorRepository;
            _openMeteoService = openMeteoService;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentAll()
        {
            var sensors = await _sensorRepository.GetActiveSensorsAsync();
            var results = new List<object>();

            foreach (var sensor in sensors)
            {
                var data = await _openMeteoService.GetCurrentAsync(
                    sensor.Id, sensor.Latitude, sensor.Longitude);

                if (data != null)
                {
                    results.Add(new
                    {
                        sensorId = sensor.Id,
                        sensorName = sensor.Name,
                        location = sensor.Location,
                        latitude = sensor.Latitude,
                        longitude = sensor.Longitude,
                        weather = data
                    });
                }

                await Task.Delay(200);
            }

            return Ok(results);
        }

        [HttpGet("current/{sensorId}")]
        public async Task<IActionResult> GetCurrent(int sensorId)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            var data = await _openMeteoService.GetCurrentAsync(
                sensorId, sensor.Latitude, sensor.Longitude);

            if (data == null) return StatusCode(503, "Nije moguće dohvatiti podatke.");

            return Ok(new
            {
                sensorId = sensor.Id,
                sensorName = sensor.Name,
                location = sensor.Location,
                latitude = sensor.Latitude,
                longitude = sensor.Longitude,
                weather = data
            });
        }

        [HttpGet("history/{sensorId}")]
        public async Task<IActionResult> GetHistory(
            int sensorId,
            [FromQuery] int days = 30)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-days);

            var data = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            return Ok(data);
        }
        [HttpGet("statistics/{sensorId}")]
        public async Task<IActionResult> GetStatistics(
    int sensorId, [FromQuery] int days = 90)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-days);

            var data = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            if (!data.Any())
                return BadRequest("Nema podataka.");

            var temps = data.Select(d => d.Temperature).ToList();
            var humidity = data.Select(d => d.Humidity).ToList();
            var pressure = data.Select(d => d.Pressure).ToList();
            var windSpeed = data.Select(d => d.WindSpeed).ToList();
            var precipitation = data.Select(d => d.Precipitation).ToList();

            // Deskriptivne statistike
            var stats = new
            {
                Temperature = GetStats(temps, "Temperatura (°C)"),
                Humidity = GetStats(humidity, "Vlažnost (%)"),
                Pressure = GetStats(pressure, "Tlak (hPa)"),
                WindSpeed = GetStats(windSpeed, "Brzina vjetra (km/h)"),
                Precipitation = GetStats(precipitation, "Oborine (mm)")
            };

            // Korelacije
            var correlations = new
            {
                TempHumidity = Correlation(temps, humidity),
                TempPressure = Correlation(temps, pressure),
                TempWind = Correlation(temps, windSpeed),
                TempPrecip = Correlation(temps, precipitation),
                HumidityPressure = Correlation(humidity, pressure),
                HumidityWind = Correlation(humidity, windSpeed),
                HumidityPrecip = Correlation(humidity, precipitation),
                PressureWind = Correlation(pressure, windSpeed),
                PressurePrecip = Correlation(pressure, precipitation),
                WindPrecip = Correlation(windSpeed, precipitation)
            };

            // Scatter data — uzorkovano na 500 točaka za performanse
            var step = Math.Max(1, data.Count / 500);
            var scatterData = data
                .Where((_, i) => i % step == 0)
                .Select(d => new
                {
                    temperature = d.Temperature,
                    humidity = d.Humidity,
                    pressure = d.Pressure,
                    windSpeed = d.WindSpeed,
                    precipitation = d.Precipitation,
                    time = d.Timestamp
                }).ToList();

            // Distribucija temperature — histogram s 20 binova
            var tempMin = temps.Min();
            var tempMax = temps.Max();
            var binSize = (tempMax - tempMin) / 20;
            var histogram = Enumerable.Range(0, 20).Select(i =>
            {
                var binStart = tempMin + i * binSize;
                var binEnd = binStart + binSize;
                return new
                {
                    bin = Math.Round(binStart, 1),
                    count = temps.Count(t => t >= binStart && t < binEnd)
                };
            }).ToList();

            return Ok(new
            {
                SensorId = sensorId,
                SensorName = sensor.Name,
                DataPoints = data.Count,
                Period = new { From = startDate, To = endDate },
                Statistics = stats,
                Correlations = correlations,
                ScatterData = scatterData,
                TemperatureHistogram = histogram
            });
        }

        private static object GetStats(List<double> values, string name)
        {
            var sorted = values.OrderBy(v => v).ToList();
            int n = sorted.Count;
            return new
            {
                Name = name,
                Count = n,
                Mean = Math.Round(values.Average(), 2),
                Median = Math.Round(sorted[n / 2], 2),
                Std = Math.Round(Math.Sqrt(values.Average(v => Math.Pow(v - values.Average(), 2))), 2),
                Min = Math.Round(sorted.First(), 2),
                Max = Math.Round(sorted.Last(), 2),
                Q1 = Math.Round(sorted[n / 4], 2),
                Q3 = Math.Round(sorted[3 * n / 4], 2)
            };
        }

        private static double Correlation(List<double> x, List<double> y)
        {
            int n = Math.Min(x.Count, y.Count);
            double meanX = x.Take(n).Average();
            double meanY = y.Take(n).Average();
            double num = x.Take(n).Zip(y.Take(n), (xi, yi) => (xi - meanX) * (yi - meanY)).Sum();
            double denX = Math.Sqrt(x.Take(n).Sum(xi => Math.Pow(xi - meanX, 2)));
            double denY = Math.Sqrt(y.Take(n).Sum(yi => Math.Pow(yi - meanY, 2)));
            return denX == 0 || denY == 0 ? 0 : Math.Round(num / (denX * denY), 3);
        }
    }
}