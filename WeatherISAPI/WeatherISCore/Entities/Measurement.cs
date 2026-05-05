namespace WeatherISCore.Entities
{
    public class Measurement
    {
        public int Id { get; set; }
        public int SensorId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public double Temperature { get; set; }
        public double Humidity { get; set; }
        public double Pressure { get; set; }
        public double WindSpeed { get; set; }
        public double WindDirection { get; set; }
        public double Precipitation { get; set; }

        public Sensor Sensor { get; set; } = null!;
    }
}