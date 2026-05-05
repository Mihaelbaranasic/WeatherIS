using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Interfaces;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MeasurementsController : ControllerBase
    {
        private readonly IMeasurementRepository _measurementRepository;

        public MeasurementsController(IMeasurementRepository measurementRepository)
        {
            _measurementRepository = measurementRepository;
        }

        [HttpGet("sensor/{sensorId}")]
        public async Task<IActionResult> GetBySensor(int sensorId)
        {
            var measurements = await _measurementRepository.GetBySensorIdAsync(sensorId);
            return Ok(measurements);
        }

        [HttpGet("sensor/{sensorId}/latest")]
        public async Task<IActionResult> GetLatest(int sensorId)
        {
            var measurement = await _measurementRepository.GetLatestBySensorIdAsync(sensorId);
            if (measurement == null) return NotFound();
            return Ok(measurement);
        }

        [HttpGet("sensor/{sensorId}/range")]
        public async Task<IActionResult> GetByRange(
            int sensorId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            var measurements = await _measurementRepository
                .GetBySensorIdAndDateRangeAsync(sensorId, from, to);
            return Ok(measurements);
        }
    }
}