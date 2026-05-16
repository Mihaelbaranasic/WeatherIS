using Microsoft.ML.Data;

namespace WeatherISML.Models
{
    public class RegressionInput
    {
        [LoadColumn(0)]
        public float Temperature { get; set; }

        [LoadColumn(1)]
        public float Hour { get; set; }

        [LoadColumn(2)]
        public float DayOfYear { get; set; }

        [LoadColumn(3)]
        public float DayOfWeek { get; set; }

        [LoadColumn(4)]
        public float Index { get; set; }

        [LoadColumn(5)]
        public float Humidity { get; set; }

        [LoadColumn(6)]
        public float Pressure { get; set; }

        [LoadColumn(7)]
        public float WindSpeed { get; set; }
    }

    public class RegressionOutput
    {
        [ColumnName("Score")]
        public float Score { get; set; }
    }

    public class PhysicalRegressionInput
    {
        public float Temperature { get; set; }
        public float Lag1 { get; set; }
        public float Lag6 { get; set; }
        public float Lag12 { get; set; }
        public float Lag24 { get; set; }
        public float Hour { get; set; }
        public float DayOfYear { get; set; }
        public float Humidity { get; set; }
        public float Pressure { get; set; }
        public float WindSpeed { get; set; }
        public float CloudCover { get; set; }
        public float PrecipitationProbability { get; set; }
    }
}