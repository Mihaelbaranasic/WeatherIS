using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorsController : ControllerBase
    {
        private readonly ISensorRepository _sensorRepository;

        public SensorsController(ISensorRepository sensorRepository)
        {
            _sensorRepository = sensorRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var sensors = await _sensorRepository.GetAllAsync();
            return Ok(sensors);
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            var sensors = await _sensorRepository.GetActiveSensorsAsync();
            return Ok(sensors);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sensor = await _sensorRepository.GetByIdAsync(id);
            if (sensor == null) return NotFound();
            return Ok(sensor);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Sensor sensor)
        {
            await _sensorRepository.AddAsync(sensor);
            return CreatedAtAction(nameof(GetById), new { id = sensor.Id }, sensor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Sensor sensor)
        {
            if (id != sensor.Id) return BadRequest();
            await _sensorRepository.UpdateAsync(sensor);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _sensorRepository.DeleteAsync(id);
            return NoContent();
        }

        [HttpPatch("{id}/toggle")]
        public async Task<IActionResult> Toggle(int id)
        {
            var sensor = await _sensorRepository.GetByIdAsync(id);
            if (sensor == null) return NotFound();
            sensor.IsActive = !sensor.IsActive;
            await _sensorRepository.UpdateAsync(sensor);
            return NoContent();
        }
    }
}