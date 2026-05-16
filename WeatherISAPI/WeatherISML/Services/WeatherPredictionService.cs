using Microsoft.ML;
using Microsoft.ML.Transforms.TimeSeries;
using WeatherISCore.DTOs;
using WeatherISML.Models;

namespace WeatherISML.Services
{
    public class WeatherPredictionService
    {
        private readonly MLContext _mlContext;

        public WeatherPredictionService()
        {
            _mlContext = new MLContext(seed: 42);
        }

        public PredictionOutput PredictWithSSA(
            IEnumerable<WeatherDataDto> weatherData,
            int horizon = 24)
        {
            var data = weatherData
                .OrderBy(m => m.Timestamp)
                .Select(m => new MeasurementInput
                {
                    Temperature = (float)m.Temperature,
                    Humidity = (float)m.Humidity,
                    Pressure = (float)m.Pressure,
                    WindSpeed = (float)m.WindSpeed
                }).ToList();

            if (data.Count < 48)
                return new PredictionOutput
                {
                    ForecastedTemperature = Array.Empty<float>(),
                    LowerBound = Array.Empty<float>(),
                    UpperBound = Array.Empty<float>()
                };

            var dataView = _mlContext.Data.LoadFromEnumerable(data);

            var pipeline = _mlContext.Forecasting.ForecastBySsa(
                outputColumnName: "Score",
                inputColumnName: nameof(MeasurementInput.Temperature),
                windowSize: 24,
                seriesLength: 168,
                trainSize: data.Count,
                horizon: horizon,
                confidenceLevel: 0.95f,
                confidenceLowerBoundColumn: "LowerBound",
                confidenceUpperBoundColumn: "UpperBound"
            );

            var model = pipeline.Fit(dataView);
            var forecastEngine = model.CreateTimeSeriesEngine<MeasurementInput, PredictionOutput>(_mlContext);
            return forecastEngine.Predict();
        }

        public float[] PredictWithLinearRegression(
            IEnumerable<WeatherDataDto> weatherData,
            int horizon = 24)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();
            if (data.Count < 48) return Array.Empty<float>();

            int lagCount = 24;
            var trainData = new List<LagRegressionInput>();

            for (int i = lagCount; i < data.Count; i++)
            {
                trainData.Add(new LagRegressionInput
                {
                    Temperature = (float)data[i].Temperature,
                    Lag1 = (float)data[i - 1].Temperature,
                    Lag6 = (float)data[i - 6].Temperature,
                    Lag12 = (float)data[i - 12].Temperature,
                    Lag24 = (float)data[i - 24].Temperature,
                    Hour = (float)data[i].Timestamp.Hour,
                    DayOfYear = (float)data[i].Timestamp.DayOfYear,
                    Humidity = (float)data[i].Humidity,
                    Pressure = (float)data[i].Pressure,
                    WindSpeed = (float)data[i].WindSpeed
                });
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);

            var pipeline = _mlContext.Transforms
                .Concatenate("Features",
                    nameof(LagRegressionInput.Lag1),
                    nameof(LagRegressionInput.Lag6),
                    nameof(LagRegressionInput.Lag12),
                    nameof(LagRegressionInput.Lag24),
                    nameof(LagRegressionInput.Hour),
                    nameof(LagRegressionInput.DayOfYear),
                    nameof(LagRegressionInput.Humidity),
                    nameof(LagRegressionInput.Pressure),
                    nameof(LagRegressionInput.WindSpeed))
                .Append(_mlContext.Regression.Trainers.Sdca(
                    labelColumnName: nameof(LagRegressionInput.Temperature),
                    featureColumnName: "Features"));

            var model = pipeline.Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);

            var recentData = data.TakeLast(lagCount).ToList();
            var recentTemps = recentData.Select(d => (float)d.Temperature).ToList();
            var results = new float[horizon];

            for (int i = 0; i < horizon; i++)
            {
                var futureTime = data.Last().Timestamp.AddHours(i + 1);
                var lastData = recentData.Last();
                var input = new LagRegressionInput
                {
                    Lag1 = recentTemps[recentTemps.Count - 1],
                    Lag6 = recentTemps.Count >= 6 ? recentTemps[recentTemps.Count - 6] : recentTemps[0],
                    Lag12 = recentTemps.Count >= 12 ? recentTemps[recentTemps.Count - 12] : recentTemps[0],
                    Lag24 = recentTemps.Count >= 24 ? recentTemps[recentTemps.Count - 24] : recentTemps[0],
                    Hour = futureTime.Hour,
                    DayOfYear = futureTime.DayOfYear,
                    Humidity = (float)lastData.Humidity,
                    Pressure = (float)lastData.Pressure,
                    WindSpeed = (float)lastData.WindSpeed
                };
                var prediction = predEngine.Predict(input);
                results[i] = prediction.Score;
                recentTemps.Add(prediction.Score);
                recentData.Add(new WeatherDataDto
                {
                    Humidity = lastData.Humidity,
                    Pressure = lastData.Pressure,
                    WindSpeed = lastData.WindSpeed
                });
            }

            return results;
        }

        public float[] PredictWithFastTree(
            IEnumerable<WeatherDataDto> weatherData,
            int horizon = 24)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();
            if (data.Count < 48) return Array.Empty<float>();

            int lagCount = 24;
            var trainData = new List<LagRegressionInput>();

            for (int i = lagCount; i < data.Count; i++)
            {
                trainData.Add(new LagRegressionInput
                {
                    Temperature = (float)data[i].Temperature,
                    Lag1 = (float)data[i - 1].Temperature,
                    Lag6 = (float)data[i - 6].Temperature,
                    Lag12 = (float)data[i - 12].Temperature,
                    Lag24 = (float)data[i - 24].Temperature,
                    Hour = (float)data[i].Timestamp.Hour,
                    DayOfYear = (float)data[i].Timestamp.DayOfYear,
                    Humidity = (float)data[i].Humidity,
                    Pressure = (float)data[i].Pressure,
                    WindSpeed = (float)data[i].WindSpeed
                });
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);

            var pipeline = _mlContext.Transforms
                .Concatenate("Features",
                    nameof(LagRegressionInput.Lag1),
                    nameof(LagRegressionInput.Lag6),
                    nameof(LagRegressionInput.Lag12),
                    nameof(LagRegressionInput.Lag24),
                    nameof(LagRegressionInput.Hour),
                    nameof(LagRegressionInput.DayOfYear),
                    nameof(LagRegressionInput.Humidity),
                    nameof(LagRegressionInput.Pressure),
                    nameof(LagRegressionInput.WindSpeed))
                .Append(_mlContext.Regression.Trainers.FastTree(
                    labelColumnName: nameof(LagRegressionInput.Temperature),
                    featureColumnName: "Features",
                    numberOfTrees: 100,
                    numberOfLeaves: 20,
                    learningRate: 0.1));

            var model = pipeline.Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);

            var recentData = data.TakeLast(lagCount).ToList();
            var recentTemps = recentData.Select(d => (float)d.Temperature).ToList();
            var results = new float[horizon];

            for (int i = 0; i < horizon; i++)
            {
                var futureTime = data.Last().Timestamp.AddHours(i + 1);
                var lastData = recentData.Last();
                var input = new LagRegressionInput
                {
                    Lag1 = recentTemps[recentTemps.Count - 1],
                    Lag6 = recentTemps.Count >= 6 ? recentTemps[recentTemps.Count - 6] : recentTemps[0],
                    Lag12 = recentTemps.Count >= 12 ? recentTemps[recentTemps.Count - 12] : recentTemps[0],
                    Lag24 = recentTemps.Count >= 24 ? recentTemps[recentTemps.Count - 24] : recentTemps[0],
                    Hour = futureTime.Hour,
                    DayOfYear = futureTime.DayOfYear,
                    Humidity = (float)lastData.Humidity,
                    Pressure = (float)lastData.Pressure,
                    WindSpeed = (float)lastData.WindSpeed
                };
                var prediction = predEngine.Predict(input);
                results[i] = prediction.Score;
                recentTemps.Add(prediction.Score);
                recentData.Add(new WeatherDataDto
                {
                    Humidity = lastData.Humidity,
                    Pressure = lastData.Pressure,
                    WindSpeed = lastData.WindSpeed
                });
            }

            return results;
        }

        public float[] PredictWithPhysicalFastTree(
            IEnumerable<WeatherDataDto> historicalData,
            IEnumerable<WeatherDataDto> forecastFeatures,
            int horizon = 24)
        {
            var data = historicalData.OrderBy(m => m.Timestamp).ToList();
            var features = forecastFeatures.OrderBy(m => m.Timestamp).ToList();

            if (data.Count < 48) return Array.Empty<float>();

            int lagCount = 24;
            var trainData = new List<PhysicalRegressionInput>();

            for (int i = lagCount; i < data.Count; i++)
            {
                trainData.Add(new PhysicalRegressionInput
                {
                    Temperature = (float)data[i].Temperature,
                    Lag1 = (float)data[i - 1].Temperature,
                    Lag6 = (float)data[i - 6].Temperature,
                    Lag12 = (float)data[i - 12].Temperature,
                    Lag24 = (float)data[i - 24].Temperature,
                    Hour = (float)data[i].Timestamp.Hour,
                    DayOfYear = (float)data[i].Timestamp.DayOfYear,
                    Humidity = (float)data[i].Humidity,
                    Pressure = (float)data[i].Pressure,
                    WindSpeed = (float)data[i].WindSpeed,
                    CloudCover = (float)data[i].CloudCover,
                    PrecipitationProbability = (float)data[i].PrecipitationProbability
                });
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);

            var pipeline = _mlContext.Transforms
                .Concatenate("Features",
                    nameof(PhysicalRegressionInput.Lag1),
                    nameof(PhysicalRegressionInput.Lag6),
                    nameof(PhysicalRegressionInput.Lag12),
                    nameof(PhysicalRegressionInput.Lag24),
                    nameof(PhysicalRegressionInput.Hour),
                    nameof(PhysicalRegressionInput.DayOfYear),
                    nameof(PhysicalRegressionInput.Humidity),
                    nameof(PhysicalRegressionInput.Pressure),
                    nameof(PhysicalRegressionInput.WindSpeed),
                    nameof(PhysicalRegressionInput.CloudCover),
                    nameof(PhysicalRegressionInput.PrecipitationProbability))
                .Append(_mlContext.Regression.Trainers.FastTree(
                    labelColumnName: nameof(PhysicalRegressionInput.Temperature),
                    featureColumnName: "Features",
                    numberOfTrees: 200,
                    numberOfLeaves: 31,
                    learningRate: 0.05));

            var model = pipeline.Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<PhysicalRegressionInput, RegressionOutput>(model);

            var recentTemps = data.TakeLast(lagCount).Select(d => (float)d.Temperature).ToList();
            var results = new float[Math.Min(horizon, features.Count)];

            for (int i = 0; i < results.Length; i++)
            {
                var feature = features[i];
                var input = new PhysicalRegressionInput
                {
                    Lag1 = recentTemps[recentTemps.Count - 1],
                    Lag6 = recentTemps.Count >= 6 ? recentTemps[recentTemps.Count - 6] : recentTemps[0],
                    Lag12 = recentTemps.Count >= 12 ? recentTemps[recentTemps.Count - 12] : recentTemps[0],
                    Lag24 = recentTemps.Count >= 24 ? recentTemps[recentTemps.Count - 24] : recentTemps[0],
                    Hour = (float)feature.Timestamp.Hour,
                    DayOfYear = (float)feature.Timestamp.DayOfYear,
                    Humidity = (float)feature.Humidity,
                    Pressure = (float)feature.Pressure,
                    WindSpeed = (float)feature.WindSpeed,
                    CloudCover = (float)feature.CloudCover,
                    PrecipitationProbability = (float)feature.PrecipitationProbability
                };
                var prediction = predEngine.Predict(input);
                results[i] = (float)Math.Round((decimal)prediction.Score, 2);
                recentTemps.Add(prediction.Score);
            }

            return results;
        }

        public MultiModelEvaluation EvaluateAllModels(IEnumerable<WeatherDataDto> weatherData)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();

            if (data.Count < 100)
                return new MultiModelEvaluation { IsValid = false };

            int splitIndex = (int)(data.Count * 0.8);
            var trainData = data.Take(splitIndex).ToList();
            var testData = data.Skip(splitIndex).ToList();
            int testCount = testData.Count;

            var actual = testData.Select(m => (float)m.Temperature).ToArray();

            var ssaPrediction = PredictWithSSA(trainData, testCount);
            var ssaEval = CalculateMetrics(actual, ssaPrediction.ForecastedTemperature);

            var lrPredicted = PredictWithLinearRegression(trainData, testCount);
            var lrEval = CalculateMetrics(actual, lrPredicted);

            var ftPredicted = PredictWithFastTree(trainData, testCount);
            var ftEval = CalculateMetrics(actual, ftPredicted);

            // PFT evaluacija koristi iste historijske podatke kao forecast features
            // jer nemamo stvarni OpenMeteo forecast za prošlost
            var pftPredicted = PredictWithPhysicalFastTree(trainData, testData, testCount);
            var pftEval = CalculateMetrics(actual, pftPredicted);

            return new MultiModelEvaluation
            {
                IsValid = true,
                SSA = ssaEval,
                LinearRegression = lrEval,
                FastTree = ftEval,
                PhysicalFastTree = pftEval,
                TrainSize = trainData.Count,
                TestSize = testData.Count,
                ActualValues = actual.Take(200).ToArray(),
                SSAPredicted = ssaPrediction.ForecastedTemperature.Take(200).ToArray(),
                LRPredicted = lrPredicted.Take(200).ToArray(),
                FTPredicted = ftPredicted.Take(200).ToArray(),
                PFTPredicted = pftPredicted.Take(200).ToArray()
            };
        }

        private ModelMetrics CalculateMetrics(float[] actual, float[] predicted)
        {
            if (predicted == null || predicted.Length == 0)
                return new ModelMetrics { IsValid = false };

            int count = Math.Min(actual.Length, predicted.Length);
            double mae = 0, rmse = 0;

            for (int i = 0; i < count; i++)
            {
                double diff = actual[i] - predicted[i];
                mae += Math.Abs(diff);
                rmse += diff * diff;
            }

            mae /= count;
            rmse = Math.Sqrt(rmse / count);

            double meanActual = actual.Take(count).Average();
            double ssTot = actual.Take(count).Sum(a => Math.Pow(a - meanActual, 2));
            double ssRes = 0;
            for (int i = 0; i < count; i++)
                ssRes += Math.Pow(actual[i] - predicted[i], 2);

            double r2 = ssTot == 0 ? 0 : 1 - (ssRes / ssTot);

            return new ModelMetrics
            {
                IsValid = true,
                MAE = Math.Round(mae, 4),
                RMSE = Math.Round(rmse, 4),
                R2 = Math.Round(r2, 4)
            };
        }
    }

    public class ModelMetrics
    {
        public bool IsValid { get; set; }
        public double MAE { get; set; }
        public double RMSE { get; set; }
        public double R2 { get; set; }
    }

    public class MultiModelEvaluation
    {
        public bool IsValid { get; set; }
        public ModelMetrics SSA { get; set; } = new();
        public ModelMetrics LinearRegression { get; set; } = new();
        public ModelMetrics FastTree { get; set; } = new();
        public ModelMetrics PhysicalFastTree { get; set; } = new();
        public int TrainSize { get; set; }
        public int TestSize { get; set; }
        public float[] ActualValues { get; set; } = Array.Empty<float>();
        public float[] SSAPredicted { get; set; } = Array.Empty<float>();
        public float[] LRPredicted { get; set; } = Array.Empty<float>();
        public float[] FTPredicted { get; set; } = Array.Empty<float>();
        public float[] PFTPredicted { get; set; } = Array.Empty<float>();
    }

    public class ModelEvaluation
    {
        public bool IsValid { get; set; }
        public double MAE { get; set; }
        public double RMSE { get; set; }
        public double R2 { get; set; }
        public int TrainSize { get; set; }
        public int TestSize { get; set; }
    }
}