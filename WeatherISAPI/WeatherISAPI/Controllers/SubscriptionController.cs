using Microsoft.AspNetCore.Mvc;
using WeatherISCore.DTOs;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController : ControllerBase
    {
        private readonly IEmailSubscriptionRepository _subscriptionRepository;

        public SubscriptionController(IEmailSubscriptionRepository subscriptionRepository)
        {
            _subscriptionRepository = subscriptionRepository;
        }

        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Email je obavezan.");

            var existing = await _subscriptionRepository.GetByEmailAndSensorAsync(request.Email, request.SensorId);

            if (existing != null)
            {
                if (existing.IsActive)
                    return Ok(new { message = "Već ste pretplaćeni.", isActive = true });

                existing.IsActive = true;
                await _subscriptionRepository.UpdateAsync(existing);
                return Ok(new { message = "Pretplata je ponovo aktivirana.", isActive = true });
            }

            await _subscriptionRepository.AddAsync(new EmailSubscription
            {
                Email = request.Email,
                SensorId = request.SensorId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { message = "Uspješno ste se pretplatili na alarme.", isActive = true });
        }

        [HttpPost("unsubscribe")]
        public async Task<IActionResult> Unsubscribe([FromBody] SubscribeRequest request)
        {
            var existing = await _subscriptionRepository.GetByEmailAndSensorAsync(request.Email, request.SensorId);

            if (existing == null || !existing.IsActive)
                return Ok(new { message = "Niste pretplaćeni.", isActive = false });

            existing.IsActive = false;
            await _subscriptionRepository.UpdateAsync(existing);
            return Ok(new { message = "Uspješno ste se odjavili.", isActive = false });
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus([FromQuery] string email, [FromQuery] int? sensorId = null)
        {
            var existing = await _subscriptionRepository.GetByEmailAndSensorAsync(email, sensorId);
            return Ok(new { isActive = existing?.IsActive ?? false });
        }

        [HttpGet("list/{email}")]
        public async Task<IActionResult> GetSubscriptions(string email)
        {
            var subs = await _subscriptionRepository.GetActiveByEmailAsync(email);
            return Ok(subs.Select(s => new
            {
                id = s.Id,
                email = s.Email,
                sensorId = s.SensorId,
                sensorName = s.Sensor?.Name ?? "Svi senzori"
            }));
        }
    }
}