using Microsoft.AspNetCore.Mvc;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;
using WeatherISAPI.Services;
using WeatherISML.Services;

namespace WeatherISAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PredictionsController : ControllerBase
    {
        private readonly ISensorRepository _sensorRepository;
        private readonly IPredictionRepository _predictionRepository;
        private readonly WeatherPredictionService _predictionService;
        private readonly OpenMeteoService _openMeteoService;

        public PredictionsController(
            ISensorRepository sensorRepository,
            IPredictionRepository predictionRepository,
            WeatherPredictionService predictionService,
            OpenMeteoService openMeteoService)
        {
            _sensorRepository = sensorRepository;
            _predictionRepository = predictionRepository;
            _predictionService = predictionService;
            _openMeteoService = openMeteoService;
        }

        [HttpPost("sensor/{sensorId}")]
        public async Task<IActionResult> GeneratePrediction(
            int sensorId, [FromQuery] int horizon = 384)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            // Dohvati 90 dana historical podataka za treniranje
            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-90);

            var historicalData = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            if (historicalData.Count < 12)
                return BadRequest("Nedovoljno podataka za treniranje modela.");

            var result = _predictionService.PredictTemperature(historicalData, horizon);

            if (result.ForecastedTemperature.Length == 0)
                return BadRequest("Model nije mogao generirati predviđanje.");

            var predictions = new List<Prediction>();
            for (int i = 0; i < result.ForecastedTemperature.Length; i++)
            {
                predictions.Add(new Prediction
                {
                    SensorId = sensorId,
                    GeneratedAt = DateTime.UtcNow,
                    PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                    PredictedTemperature = Math.Round(result.ForecastedTemperature[i], 2),
                    PredictedHumidity = 0,
                    PredictedPressure = 0,
                    ModelVersion = "SSA-v1",
                    Source = "MLModel"
                });
            }

            await _predictionRepository.AddRangeAsync(predictions);

            return Ok(new
            {
                SensorId = sensorId,
                GeneratedAt = DateTime.UtcNow,
                Horizon = horizon,
                TrainSize = historicalData.Count,
                Predictions = predictions
            });
        }

        [HttpGet("sensor/{sensorId}/evaluate")]
        public async Task<IActionResult> EvaluateModel(int sensorId)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-90);

            var historicalData = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            var evaluation = _predictionService.EvaluateModel(historicalData);

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

        [HttpGet("compare/{sensorId}")]
        public async Task<IActionResult> GetComparison(int sensorId)
        {
            var allPredictions = await _predictionRepository.GetBySensorIdAsync(sensorId);
            var now = DateTime.UtcNow;
            var toDate = now.AddDays(16);

            var mlPredictions = allPredictions
                .Where(p => p.Source == "MLModel" && p.PredictedFor >= now && p.PredictedFor <= toDate)
                .GroupBy(p => p.PredictedFor.Date)
                .Select(g => new
                {
                    time = g.Key,
                    temperature = Math.Round(g.Average(p => p.PredictedTemperature), 2)
                })
                .OrderBy(x => x.time);

            var openMeteoPredictions = allPredictions
                .Where(p => p.Source == "OpenMeteo" && p.PredictedFor >= now && p.PredictedFor <= toDate)
                .GroupBy(p => p.PredictedFor.Date)
                .Select(g => new
                {
                    time = g.Key,
                    temperature = Math.Round(g.Average(p => p.PredictedTemperature), 2)
                })
                .OrderBy(x => x.time);

            return Ok(new
            {
                MLModel = mlPredictions,
                OpenMeteo = openMeteoPredictions
            });
        }
    }
}