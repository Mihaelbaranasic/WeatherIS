using Microsoft.ML.Data;

namespace WeatherISML.Models
{
    public class PredictionOutput
    {
        [ColumnName("Score")]
        public float[] ForecastedTemperature { get; set; } = Array.Empty<float>();

        public float[] LowerBound { get; set; } = Array.Empty<float>();

        public float[] UpperBound { get; set; } = Array.Empty<float>();
    }
}