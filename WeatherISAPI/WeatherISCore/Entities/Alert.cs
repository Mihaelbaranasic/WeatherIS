namespace WeatherISCore.Entities
{
    public class Alert
    {
        public int Id { get; set; }
        public int SensorId { get; set; }
        public string Parameter { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double ThresholdValue { get; set; }
        public double MeasuredValue { get; set; }
        public DateTime TriggeredAt { get; set; }
        public bool IsResolved { get; set; }

        public Sensor Sensor { get; set; } = null!;
    }
}