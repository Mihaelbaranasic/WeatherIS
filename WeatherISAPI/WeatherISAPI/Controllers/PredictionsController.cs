using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;
using WeatherISML.Services;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PredictionsController : ControllerBase
    {
        private readonly IMeasurementRepository _measurementRepository;
        private readonly IPredictionRepository _predictionRepository;
        private readonly WeatherPredictionService _predictionService;

        public PredictionsController(
            IMeasurementRepository measurementRepository,
            IPredictionRepository predictionRepository,
            WeatherPredictionService predictionService)
        {
            _measurementRepository = measurementRepository;
            _predictionRepository = predictionRepository;
            _predictionService = predictionService;
        }

        [HttpPost("sensor/{sensorId}")]
        public async Task<IActionResult> GeneratePrediction(int sensorId, [FromQuery] int horizon = 24)
        {
            var measurements = await _measurementRepository.GetBySensorIdAsync(sensorId);
            var measurementList = measurements.ToList();

            if (measurementList.Count < 12)
                return BadRequest($"Nedovoljno podataka. Ima: {measurementList.Count}, treba: 12");

            var result = _predictionService.PredictTemperature(measurementList, horizon);

            if (result.ForecastedTemperature.Length == 0)
                return BadRequest("Model nije mogao generirati predviđanje.");

            var predictions = new List<Prediction>();
            for (int i = 0; i < result.ForecastedTemperature.Length; i++)
            {
                var prediction = new Prediction
                {
                    SensorId = sensorId,
                    GeneratedAt = DateTime.UtcNow,
                    PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                    PredictedTemperature = Math.Round(result.ForecastedTemperature[i], 2),
                    PredictedHumidity = 0,
                    PredictedPressure = 0,
                    ModelVersion = "SSA-v1"
                };
                predictions.Add(prediction);
                await _predictionRepository.AddAsync(prediction);
            }

            return Ok(new
            {
                SensorId = sensorId,
                GeneratedAt = DateTime.UtcNow,
                Horizon = horizon,
                Predictions = predictions
            });
        }

        [HttpGet("sensor/{sensorId}/evaluate")]
        public async Task<IActionResult> EvaluateModel(int sensorId)
        {
            var measurements = await _measurementRepository.GetBySensorIdAsync(sensorId);
            var evaluation = _predictionService.EvaluateModel(measurements);

            if (!evaluation.IsValid)
                return BadRequest("Nedovoljno podataka za evaluaciju modela.");

            return Ok(evaluation);
        }

        [HttpGet("sensor/{sensorId}")]
        public async Task<IActionResult> GetPredictions(int sensorId)
        {
            var predictions = await _predictionRepository.GetBySensorIdAsync(sensorId);
            return Ok(predictions);
        }
    }
}