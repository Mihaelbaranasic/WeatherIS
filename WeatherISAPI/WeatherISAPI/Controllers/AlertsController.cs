using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Interfaces;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlertsController : ControllerBase
    {
        private readonly IAlertRepository _alertRepository;

        public AlertsController(IAlertRepository alertRepository)
        {
            _alertRepository = alertRepository;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetAllActive()
        {
            var alerts = await _alertRepository.GetAllActiveAsync();
            return Ok(alerts);
        }

        [HttpGet("sensor/{sensorId}")]
        public async Task<IActionResult> GetBySensor(int sensorId)
        {
            var alerts = await _alertRepository.GetActiveBySensorIdAsync(sensorId);
            return Ok(alerts);
        }

        [HttpPatch("{id}/resolve")]
        public async Task<IActionResult> Resolve(int id)
        {
            var alert = await _alertRepository.GetByIdAsync(id);
            if (alert == null) return NotFound();
            alert.IsResolved = true;
            await _alertRepository.UpdateAsync(alert);
            return NoContent();
        }
    }
}