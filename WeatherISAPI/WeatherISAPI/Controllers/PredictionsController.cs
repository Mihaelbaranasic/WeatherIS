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
        public async Task<IActionResult> GeneratePrediction(int sensorId, [FromQuery] int horizon = 384, [FromQuery] string model = "all")
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-365);

            var historicalData = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            if (historicalData.Count < 48)
                return BadRequest("Nedovoljno podataka za treniranje modela.");

            var predictions = new List<Prediction>();
            var generatedAt = DateTime.UtcNow;

            // SSA
            if (model == "all" || model == "ssa")
            {
                var ssaResult = _predictionService.PredictWithSSA(historicalData, horizon);
                for (int i = 0; i < ssaResult.ForecastedTemperature.Length; i++)
                {
                    predictions.Add(new Prediction
                    {
                        SensorId = sensorId,
                        GeneratedAt = generatedAt,
                        PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                        PredictedTemperature = Math.Round(ssaResult.ForecastedTemperature[i], 2),
                        PredictedHumidity = 0,
                        PredictedPressure = 0,
                        ModelVersion = "SSA-v1",
                        Source = "MLModel-SSA"
                    });
                }
            }

            // Linear Regression
            if (model == "all" || model == "lr")
            {
                var lrResult = _predictionService.PredictWithLinearRegression(historicalData, horizon);
                for (int i = 0; i < lrResult.Length; i++)
                {
                    predictions.Add(new Prediction
                    {
                        SensorId = sensorId,
                        GeneratedAt = generatedAt,
                        PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                        PredictedTemperature = Math.Round(lrResult[i], 2),
                        PredictedHumidity = 0,
                        PredictedPressure = 0,
                        ModelVersion = "LR-v1",
                        Source = "MLModel-LR"
                    });
                }
            }

            // FastTree
            if (model == "all" || model == "ft")
            {
                var ftResult = _predictionService.PredictWithFastTree(historicalData, horizon);
                for (int i = 0; i < ftResult.Length; i++)
                {
                    predictions.Add(new Prediction
                    {
                        SensorId = sensorId,
                        GeneratedAt = generatedAt,
                        PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                        PredictedTemperature = Math.Round(ftResult[i], 2),
                        PredictedHumidity = 0,
                        PredictedPressure = 0,
                        ModelVersion = "FastTree-v1",
                        Source = "MLModel-FT"
                    });
                }
            }

            // Physical FastTree — hibridni model
            if (model == "all" || model == "pft")
            {
                var forecastFeatures = await _openMeteoService.GetForecastFeaturesAsync(
                    sensorId, sensor.Latitude, sensor.Longitude, 16);

                var pftResult = _predictionService.PredictWithPhysicalFastTree(
                    historicalData, forecastFeatures, horizon);

                for (int i = 0; i < pftResult.Length; i++)
                {
                    predictions.Add(new Prediction
                    {
                        SensorId = sensorId,
                        GeneratedAt = generatedAt,
                        PredictedFor = DateTime.UtcNow.AddHours(i + 1),
                        PredictedTemperature = Math.Round(pftResult[i], 2),
                        PredictedHumidity = 0,
                        PredictedPressure = 0,
                        ModelVersion = "PhysicalFastTree-v1",
                        Source = "MLModel-PFT"
                    });
                }
            }

            await _predictionRepository.AddRangeAsync(predictions);

            return Ok(new
            {
                SensorId = sensorId,
                GeneratedAt = generatedAt,
                Horizon = horizon,
                TrainSize = historicalData.Count,
                Models = new[] { "SSA", "LinearRegression", "FastTree" },
                TotalPredictions = predictions.Count
            });
        }

        [HttpGet("sensor/{sensorId}/evaluate")]
        public async Task<IActionResult> EvaluateModel(int sensorId)
        {
            var sensor = await _sensorRepository.GetByIdAsync(sensorId);
            if (sensor == null) return NotFound();

            // Zadnjih 90 dana — ista sezona, nema distribucijskog pomaka
            var endDate = DateTime.UtcNow.Date.AddDays(-1);
            var startDate = endDate.AddDays(-90);

            var historicalData = await _openMeteoService.GetHistoricalDataAsync(
                sensorId, sensor.Latitude, sensor.Longitude, startDate, endDate);

            if (historicalData.Count < 200)
                return BadRequest("Nedovoljno podataka za evaluaciju.");

            var evaluation = _predictionService.EvaluateAllModels(historicalData);

            return Ok(evaluation);
        }

        [HttpGet("sensor/{sensorId}")]
        public async Task<IActionResult> GetPredictions(int sensorId)
        {
            var predictions = await _predictionRepository.GetBySensorIdAsync(sensorId);
            return Ok(predictions);
        }

        [HttpGet("compare/{sensorId}")]
        public async Task<IActionResult> GetComparison(int sensorId, [FromQuery] int horizon = 384)
        {
            var allPredictions = await _predictionRepository.GetBySensorIdAsync(sensorId);
            var now = DateTime.UtcNow;
            var toDate = now.AddHours(horizon);

            var getLatest = (string source) => allPredictions
                .Where(p => p.Source == source)
                .Select(p => p.GeneratedAt)
                .OrderByDescending(d => d)
                .FirstOrDefault();

            bool groupByDay = horizon > 72;

            var getFiltered = (string source, DateTime latest) =>
            {
                var filtered = allPredictions
                    .Where(p => p.Source == source
                             && p.GeneratedAt == latest
                             && p.PredictedFor >= now
                             && p.PredictedFor <= toDate)
                    .OrderBy(p => p.PredictedFor)
                    .ToList();

                if (groupByDay)
                {
                    return filtered
                        .GroupBy(p => p.PredictedFor.Date)
                        .Select(g => new
                        {
                            time = (object)g.Key,
                            temperature = Math.Round(g.Average(p => p.PredictedTemperature), 2)
                        })
                        .OrderBy(x => x.time)
                        .ToList();
                } else
                {
                    return filtered
                        .Select(p => new
                        {
                            time = (object)p.PredictedFor,
                            temperature = Math.Round(p.PredictedTemperature, 2)
                        })
                        .ToList();
                }
            };

            var latestSSA = getLatest("MLModel-SSA");
            var latestLR = getLatest("MLModel-LR");
            var latestFT = getLatest("MLModel-FT");
            var latestOM = getLatest("OpenMeteo");
            var latestPFT = getLatest("MLModel-PFT");

            return Ok(new
            {
                SSA = getFiltered("MLModel-SSA", latestSSA),
                LinearRegression = getFiltered("MLModel-LR", latestLR),
                FastTree = getFiltered("MLModel-FT", latestFT),
                PhysicalFastTree = getFiltered("MLModel-PFT", latestPFT),
                OpenMeteo = getFiltered("OpenMeteo", latestOM),
                GroupedByDay = groupByDay
            });
        }
    }
}