using Microsoft.AspNetCore.Mvc;
using WeatherISAPI.Services;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

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
                temperature = GetStats(temps, "Temperatura (°C)"),
                humidity = GetStats(humidity, "Vlažnost (%)"),
                pressure = GetStats(pressure, "Tlak (hPa)"),
                windSpeed = GetStats(windSpeed, "Brzina vjetra (km/h)"),
                precipitation = GetStats(precipitation, "Oborine (mm)")
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
                name,
                count = n,
                mean = Math.Round(values.Average(), 2),
                median = Math.Round(sorted[n / 2], 2),
                std = Math.Round(Math.Sqrt(values.Average(v => Math.Pow(v - values.Average(), 2))), 2),
                min = Math.Round(sorted.First(), 2),
                max = Math.Round(sorted.Last(), 2),
                q1 = Math.Round(sorted[n / 4], 2),
                q3 = Math.Round(sorted[3 * n / 4], 2)
            };
        }
        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentAll()
        {
            var sensors = (await _sensorRepository.GetActiveSensorsAsync()).ToList();
            var weatherData = await _openMeteoService.GetCurrentAllAsync(sensors);

            var results = sensors.Select(sensor =>
            {
                var data = weatherData.FirstOrDefault(w => w.SensorId == sensor.Id);
                return new
                {
                    sensorId = sensor.Id,
                    sensorName = sensor.Name,
                    location = sensor.Location,
                    latitude = sensor.Latitude,
                    longitude = sensor.Longitude,
                    weather = data
                };
            }).Where(r => r.weather != null).ToList();

            return Ok(results);
        }

        [HttpPost("check-alerts")]
        public async Task<IActionResult> CheckAlerts()
        {
            var sensors = (await _sensorRepository.GetActiveSensorsAsync()).ToList();
            var alertRepo = HttpContext.RequestServices.GetRequiredService<IAlertRepository>();
            var weatherData = await _openMeteoService.GetCurrentAllAsync(sensors);
            int triggered = 0;

            var thresholds = new List<(string param, double threshold, bool isUpperBound)>
    {
        ("Temperature", 15.0, true),
        ("Temperature", 5.0, false),
        ("WindSpeed", 10.0, true),
        ("Precipitation", 0.1, true),
        ("Pressure", 1015.0, false),
        ("Humidity", 50.0, true),
    };

            foreach (var sensor in sensors)
            {
                var current = weatherData.FirstOrDefault(w => w.SensorId == sensor.Id);
                if (current == null) continue;

                foreach (var (param, threshold, isUpperBound) in thresholds)
                {
                    double value = param switch
                    {
                        "Temperature" => current.Temperature,
                        "WindSpeed" => current.WindSpeed,
                        "Precipitation" => current.Precipitation,
                        "Pressure" => current.Pressure,
                        "Humidity" => current.Humidity,
                        _ => 0
                    };

                    bool isTriggered = isUpperBound ? value > threshold : value < threshold;

                    if (isTriggered)
                    {
                        var existing = await alertRepo.GetActiveAlertAsync(sensor.Id, param);
                        if (existing == null)
                        {
                            await alertRepo.AddAsync(new Alert
                            {
                                SensorId = sensor.Id,
                                Parameter = param,
                                ThresholdValue = threshold,
                                MeasuredValue = value,
                                TriggeredAt = DateTime.UtcNow,
                                IsResolved = false
                            });
                            triggered++;
                        }
                    }
                }
            }

            int sensorCount = sensors.Count;
            return Ok(new { Triggered = triggered, Sensors = sensorCount });
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