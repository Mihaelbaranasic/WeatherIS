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

        // ─────────────────────────────────────────────
        // PREDIKCIJA — SSA
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // PREDIKCIJA — LINEAR REGRESSION
        // ─────────────────────────────────────────────

        public float[] PredictWithLinearRegression(
            IEnumerable<WeatherDataDto> weatherData,
            int horizon = 24)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();
            if (data.Count < 48) return Array.Empty<float>();

            var trainData = BuildLagFeatures(data);
            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);
            var model = BuildLRPipeline().Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);

            return AutoregressivePredict(predEngine, data, horizon);
        }

        // ─────────────────────────────────────────────
        // PREDIKCIJA — FAST TREE
        // ─────────────────────────────────────────────

        public float[] PredictWithFastTree(
            IEnumerable<WeatherDataDto> weatherData,
            int horizon = 24)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();
            if (data.Count < 48) return Array.Empty<float>();

            var trainData = BuildLagFeatures(data);
            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);
            var model = BuildFTPipeline().Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);

            return AutoregressivePredict(predEngine, data, horizon);
        }

        // ─────────────────────────────────────────────
        // PREDIKCIJA — PHYSICAL FAST TREE
        // ─────────────────────────────────────────────

        public float[] PredictWithPhysicalFastTree(
            IEnumerable<WeatherDataDto> historicalData,
            IEnumerable<WeatherDataDto> forecastFeatures,
            int horizon = 24)
        {
            var data = historicalData.OrderBy(m => m.Timestamp).ToList();
            var features = forecastFeatures.OrderBy(m => m.Timestamp).ToList();

            if (data.Count < 48) return Array.Empty<float>();

            var trainData = BuildPhysicalFeatures(data);
            var dataView = _mlContext.Data.LoadFromEnumerable(trainData);
            var model = BuildPFTPipeline().Fit(dataView);
            var predEngine = _mlContext.Model
                .CreatePredictionEngine<PhysicalRegressionInput, RegressionOutput>(model);

            var recentTemps = data.TakeLast(24).Select(d => (float)d.Temperature).ToList();
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

        // ─────────────────────────────────────────────
        // EVALUACIJA — TEMPORALNA UNAKRSNA VALIDACIJA
        // Podaci se prosljeđuju izvana (iz kontrolera)
        // ─────────────────────────────────────────────

        public EvaluationResult EvaluateAllModels(List<WeatherDataDto> allData)
        {
            if (allData.Count < 200)
                throw new Exception("Nedovoljno podataka za evaluaciju.");

            int folds = 5;
            int foldSize = allData.Count / (folds + 1);

            var ssaMAEs = new List<double>();
            var lrMAEs = new List<double>();
            var ftMAEs = new List<double>();
            var pftMAEs = new List<double>();
            var ssaRMSEs = new List<double>();
            var lrRMSEs = new List<double>();
            var ftRMSEs = new List<double>();
            var pftRMSEs = new List<double>();
            var ssaR2s = new List<double>();
            var lrR2s = new List<double>();
            var ftR2s = new List<double>();
            var pftR2s = new List<double>();

            List<double> actualValues = new();
            List<double> ssaPredicted = new();
            List<double> lrPredicted = new();
            List<double> ftPredicted = new();
            List<double> pftPredicted = new();

            for (int fold = 0; fold < folds; fold++)
            {
                int trainEnd = foldSize * (fold + 1);
                int testStart = trainEnd;
                int testEnd = Math.Min(testStart + foldSize, allData.Count);

                var trainData = allData.Take(trainEnd).ToList();
                var testData = allData.Skip(testStart).Take(testEnd - testStart).ToList();

                if (trainData.Count < 100 || testData.Count < 48) continue;

                var ssaResult = EvaluateSSAFold(trainData, testData);
                ssaMAEs.Add(ssaResult.MAE);
                ssaRMSEs.Add(ssaResult.RMSE);
                ssaR2s.Add(ssaResult.R2);

                var lrResult = EvaluateLRFold(trainData, testData);
                lrMAEs.Add(lrResult.MAE);
                lrRMSEs.Add(lrResult.RMSE);
                lrR2s.Add(lrResult.R2);

                var ftResult = EvaluateFTFold(trainData, testData);
                ftMAEs.Add(ftResult.MAE);
                ftRMSEs.Add(ftResult.RMSE);
                ftR2s.Add(ftResult.R2);

                var pftResult = EvaluatePFTFold(trainData, testData);
                pftMAEs.Add(pftResult.MAE);
                pftRMSEs.Add(pftResult.RMSE);
                pftR2s.Add(pftResult.R2);

                if (fold == folds - 1)
                {
                    actualValues = ssaResult.Actual;
                    ssaPredicted = ssaResult.Predicted;
                    lrPredicted = lrResult.Predicted;
                    ftPredicted = ftResult.Predicted;
                    pftPredicted = pftResult.Predicted;
                }
            }

            return new EvaluationResult
            {
                TrainSize = foldSize * folds,
                TestSize = foldSize,
                Folds = folds,
                SSA = new ModelMetrics
                {
                    MAE = Math.Round(ssaMAEs.Average(), 4),
                    RMSE = Math.Round(ssaRMSEs.Average(), 4),
                    R2 = Math.Round(ssaR2s.Average(), 4)
                },
                LinearRegression = new ModelMetrics
                {
                    MAE = Math.Round(lrMAEs.Average(), 4),
                    RMSE = Math.Round(lrRMSEs.Average(), 4),
                    R2 = Math.Round(lrR2s.Average(), 4)
                },
                FastTree = new ModelMetrics
                {
                    MAE = Math.Round(ftMAEs.Average(), 4),
                    RMSE = Math.Round(ftRMSEs.Average(), 4),
                    R2 = Math.Round(ftR2s.Average(), 4)
                },
                PhysicalFastTree = new ModelMetrics
                {
                    MAE = Math.Round(pftMAEs.Average(), 4),
                    RMSE = Math.Round(pftRMSEs.Average(), 4),
                    R2 = Math.Round(pftR2s.Average(), 4)
                },
                ActualValues = actualValues.Take(200).ToList(),
                SSAPredicted = ssaPredicted.Take(200).ToList(),
                LRPredicted = lrPredicted.Take(200).ToList(),
                FTPredicted = ftPredicted.Take(200).ToList(),
                PFTPredicted = pftPredicted.Take(200).ToList()
            };
        }

        // ─────────────────────────────────────────────
        // FOLD EVALUACIJE
        // ─────────────────────────────────────────────

        private class SSAEvalOutput
        {
            [Microsoft.ML.Data.ColumnName("Score")]
            public float[] ForecastedTemperature { get; set; } = Array.Empty<float>();
        }

        private FoldEvalResult EvaluateSSAFold(
            List<WeatherDataDto> train, List<WeatherDataDto> test)
        {
            var trainInput = train
                .OrderBy(m => m.Timestamp)
                .Select(m => new MeasurementInput
                {
                    Temperature = (float)m.Temperature
                }).ToList();

            var dataView = _mlContext.Data.LoadFromEnumerable(trainInput);

            var pipeline = _mlContext.Forecasting.ForecastBySsa(
                outputColumnName: "Score",
                inputColumnName: nameof(MeasurementInput.Temperature),
                windowSize: 24,
                seriesLength: Math.Min(168, trainInput.Count / 2),
                trainSize: trainInput.Count,
                horizon: test.Count
            );

            var model = pipeline.Fit(dataView);
            var engine = model.CreateTimeSeriesEngine<MeasurementInput, SSAEvalOutput>(_mlContext);
            var output = engine.Predict();

            var actual = test.Select(d => d.Temperature).ToList();
            var predicted = output.ForecastedTemperature.Select(f => (double)f).ToList();

            var result = CalculateMetrics(actual, predicted);
            result.Actual = actual;
            result.Predicted = predicted;
            return result;
        }

        private FoldEvalResult EvaluateLRFold(
            List<WeatherDataDto> train, List<WeatherDataDto> test)
        {
            var trainFeatures = BuildLagFeatures(train);
            var testFeatures = BuildLagFeatures(test);
            if (testFeatures.Count == 0) return new FoldEvalResult { IsValid = false };

            var mlTrain = _mlContext.Data.LoadFromEnumerable(trainFeatures);
            var model = BuildLRPipeline().Fit(mlTrain);
            var mlTest = _mlContext.Data.LoadFromEnumerable(testFeatures);
            var predictions = model.Transform(mlTest);
            var metrics = _mlContext.Regression.Evaluate(
                predictions, labelColumnName: nameof(LagRegressionInput.Temperature));

            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);
            var actual = testFeatures.Select(f => (double)f.Temperature).ToList();
            var predicted = testFeatures.Select(f => (double)predEngine.Predict(f).Score).ToList();

            return new FoldEvalResult
            {
                IsValid = true,
                MAE = Math.Round(metrics.MeanAbsoluteError, 4),
                RMSE = Math.Round(metrics.RootMeanSquaredError, 4),
                R2 = Math.Round(metrics.RSquared, 4),
                Actual = actual,
                Predicted = predicted
            };
        }

        private FoldEvalResult EvaluateFTFold(
            List<WeatherDataDto> train, List<WeatherDataDto> test)
        {
            var trainFeatures = BuildLagFeatures(train);
            var testFeatures = BuildLagFeatures(test);
            if (testFeatures.Count == 0) return new FoldEvalResult { IsValid = false };

            var mlTrain = _mlContext.Data.LoadFromEnumerable(trainFeatures);
            var model = BuildFTPipeline().Fit(mlTrain);
            var mlTest = _mlContext.Data.LoadFromEnumerable(testFeatures);
            var predictions = model.Transform(mlTest);
            var metrics = _mlContext.Regression.Evaluate(
                predictions, labelColumnName: nameof(LagRegressionInput.Temperature));

            var predEngine = _mlContext.Model
                .CreatePredictionEngine<LagRegressionInput, RegressionOutput>(model);
            var actual = testFeatures.Select(f => (double)f.Temperature).ToList();
            var predicted = testFeatures.Select(f => (double)predEngine.Predict(f).Score).ToList();

            return new FoldEvalResult
            {
                IsValid = true,
                MAE = Math.Round(metrics.MeanAbsoluteError, 4),
                RMSE = Math.Round(metrics.RootMeanSquaredError, 4),
                R2 = Math.Round(metrics.RSquared, 4),
                Actual = actual,
                Predicted = predicted
            };
        }

        private FoldEvalResult EvaluatePFTFold(
            List<WeatherDataDto> train, List<WeatherDataDto> test)
        {
            var trainFeatures = BuildPhysicalFeatures(train);
            var testFeatures = BuildPhysicalFeatures(test);
            if (testFeatures.Count == 0) return new FoldEvalResult { IsValid = false };

            var mlTrain = _mlContext.Data.LoadFromEnumerable(trainFeatures);
            var model = BuildPFTPipeline().Fit(mlTrain);
            var mlTest = _mlContext.Data.LoadFromEnumerable(testFeatures);
            var predictions = model.Transform(mlTest);
            var metrics = _mlContext.Regression.Evaluate(
                predictions, labelColumnName: nameof(PhysicalRegressionInput.Temperature));

            var predEngine = _mlContext.Model
                .CreatePredictionEngine<PhysicalRegressionInput, RegressionOutput>(model);
            var actual = testFeatures.Select(f => (double)f.Temperature).ToList();
            var predicted = testFeatures.Select(f => (double)predEngine.Predict(f).Score).ToList();

            return new FoldEvalResult
            {
                IsValid = true,
                MAE = Math.Round(metrics.MeanAbsoluteError, 4),
                RMSE = Math.Round(metrics.RootMeanSquaredError, 4),
                R2 = Math.Round(metrics.RSquared, 4),
                Actual = actual,
                Predicted = predicted
            };
        }

        // ─────────────────────────────────────────────
        // PIPELINE BUILDERS
        // ─────────────────────────────────────────────

        private IEstimator<ITransformer> BuildLRPipeline()
            => _mlContext.Transforms.Concatenate("Features",
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
                    featureColumnName: "Features",
                    maximumNumberOfIterations: 100));

        private IEstimator<ITransformer> BuildFTPipeline()
            => _mlContext.Transforms.Concatenate("Features",
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

        private IEstimator<ITransformer> BuildPFTPipeline()
            => _mlContext.Transforms.Concatenate("Features",
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

        // ─────────────────────────────────────────────
        // FEATURE BUILDERS
        // ─────────────────────────────────────────────

        private static List<LagRegressionInput> BuildLagFeatures(List<WeatherDataDto> data)
        {
            var rows = new List<LagRegressionInput>();
            for (int i = 24; i < data.Count; i++)
            {
                rows.Add(new LagRegressionInput
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
            return rows;
        }

        private static List<PhysicalRegressionInput> BuildPhysicalFeatures(List<WeatherDataDto> data)
        {
            var rows = new List<PhysicalRegressionInput>();
            for (int i = 24; i < data.Count; i++)
            {
                rows.Add(new PhysicalRegressionInput
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
            return rows;
        }

        // ─────────────────────────────────────────────
        // AUTOREGRESIVNO PREDVIĐANJE
        // ─────────────────────────────────────────────

        private float[] AutoregressivePredict(
            Microsoft.ML.PredictionEngine<LagRegressionInput, RegressionOutput> predEngine,
            List<WeatherDataDto> data,
            int horizon)
        {
            var recentData = data.TakeLast(24).ToList();
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

        // ─────────────────────────────────────────────
        // METRIKE
        // ─────────────────────────────────────────────

        private static FoldEvalResult CalculateMetrics(
            List<double> actual, List<double> predicted)
        {
            int count = Math.Min(actual.Count, predicted.Count);
            if (count == 0) return new FoldEvalResult { IsValid = false };

            double mae = 0, ssRes = 0;
            for (int i = 0; i < count; i++)
            {
                double diff = actual[i] - predicted[i];
                mae += Math.Abs(diff);
                ssRes += diff * diff;
            }
            mae /= count;
            double rmse = Math.Sqrt(ssRes / count);
            double meanActual = actual.Take(count).Average();
            double ssTot = actual.Take(count).Sum(a => Math.Pow(a - meanActual, 2));
            double r2 = ssTot == 0 ? 0 : 1 - (ssRes / ssTot);

            return new FoldEvalResult
            {
                IsValid = true,
                MAE = Math.Round(mae, 4),
                RMSE = Math.Round(rmse, 4),
                R2 = Math.Round(r2, 4)
            };
        }
    }

    // ─────────────────────────────────────────────
    // DTO KLASE
    // ─────────────────────────────────────────────

    public class FoldEvalResult
    {
        public bool IsValid { get; set; } = true;
        public double MAE { get; set; }
        public double RMSE { get; set; }
        public double R2 { get; set; }
        public List<double> Actual { get; set; } = new();
        public List<double> Predicted { get; set; } = new();
    }

    public class ModelMetrics
    {
        public bool IsValid { get; set; } = true;
        public double MAE { get; set; }
        public double RMSE { get; set; }
        public double R2 { get; set; }
    }

    public class EvaluationResult
    {
        public int TrainSize { get; set; }
        public int TestSize { get; set; }
        public int Folds { get; set; }
        public ModelMetrics SSA { get; set; } = new();
        public ModelMetrics LinearRegression { get; set; } = new();
        public ModelMetrics FastTree { get; set; } = new();
        public ModelMetrics PhysicalFastTree { get; set; } = new();
        public List<double> ActualValues { get; set; } = new();
        public List<double> SSAPredicted { get; set; } = new();
        public List<double> LRPredicted { get; set; } = new();
        public List<double> FTPredicted { get; set; } = new();
        public List<double> PFTPredicted { get; set; } = new();
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
}