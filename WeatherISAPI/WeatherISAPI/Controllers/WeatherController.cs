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
    }
}