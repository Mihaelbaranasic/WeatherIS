using Microsoft.ML.Data;

namespace WeatherISML.Models
{
    public class MeasurementInput
    {
        [LoadColumn(0)]
        public float Temperature { get; set; }

        [LoadColumn(1)]
        public float Humidity { get; set; }

        [LoadColumn(2)]
        public float Pressure { get; set; }

        [LoadColumn(3)]
        public float WindSpeed { get; set; }
    }
}