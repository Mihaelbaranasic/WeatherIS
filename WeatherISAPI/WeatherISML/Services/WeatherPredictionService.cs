using Microsoft.ML;
using Microsoft.ML.Transforms.TimeSeries;
using WeatherISCore.DTOs;
using WeatherISML.Models;

namespace WeatherISML.Services
{
    public class WeatherPredictionService
    {
        private readonly MLContext _mlContext;
        private readonly string _modelPath;

        public WeatherPredictionService()
        {
            _mlContext = new MLContext(seed: 42);
            _modelPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "weather_model.zip");
        }

        public PredictionOutput PredictTemperature(
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

            if (data.Count < 12)
            {
                return new PredictionOutput
                {
                    ForecastedTemperature = Array.Empty<float>(),
                    LowerBound = Array.Empty<float>(),
                    UpperBound = Array.Empty<float>()
                };
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(data);

            var pipeline = _mlContext.Forecasting.ForecastBySsa(
                outputColumnName: "Score",
                inputColumnName: nameof(MeasurementInput.Temperature),
                windowSize: 3,
                seriesLength: 10,
                trainSize: data.Count,
                horizon: horizon,
                confidenceLevel: 0.95f,
                confidenceLowerBoundColumn: "LowerBound",
                confidenceUpperBoundColumn: "UpperBound"
            );

            var model = pipeline.Fit(dataView);
            SaveModel(model);

            var forecastEngine = model.CreateTimeSeriesEngine<MeasurementInput, PredictionOutput>(_mlContext);
            return forecastEngine.Predict();
        }

        public ModelEvaluation EvaluateModel(IEnumerable<WeatherDataDto> weatherData)
        {
            var data = weatherData.OrderBy(m => m.Timestamp).ToList();

            if (data.Count < 20)
                return new ModelEvaluation { IsValid = false };

            int splitIndex = (int)(data.Count * 0.8);
            var trainData = data.Take(splitIndex).ToList();
            var testData = data.Skip(splitIndex).ToList();

            var prediction = PredictTemperature(trainData, testData.Count);

            if (prediction.ForecastedTemperature.Length == 0)
                return new ModelEvaluation { IsValid = false };

            var actual = testData.Select(m => (float)m.Temperature).ToArray();
            var predicted = prediction.ForecastedTemperature;
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

            return new ModelEvaluation
            {
                IsValid = true,
                MAE = Math.Round(mae, 4),
                RMSE = Math.Round(rmse, 4),
                R2 = Math.Round(r2, 4),
                TrainSize = trainData.Count,
                TestSize = testData.Count
            };
        }

        private void SaveModel(ITransformer model)
        {
            _mlContext.Model.Save(model, null, _modelPath);
        }
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