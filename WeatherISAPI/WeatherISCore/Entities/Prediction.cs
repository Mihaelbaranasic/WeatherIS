using WeatherISCore.Entities;
namespace WeatherISCore.Entities;
public class Prediction
{
    public int Id { get; set; }
    public int SensorId { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime PredictedFor { get; set; }
    public double PredictedTemperature { get; set; }
    public double PredictedHumidity { get; set; }
    public double PredictedPressure { get; set; }
    public string ModelVersion { get; set; } = string.Empty;
    public string Source { get; set; } = "MLModel";

    public Sensor Sensor { get; set; } = null!;
}