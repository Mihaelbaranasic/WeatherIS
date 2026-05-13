namespace WeatherISCore.DTOs
{
    public class WeatherDataDto
    {
        public int SensorId { get; set; }
        public DateTime Timestamp { get; set; }
        public double Temperature { get; set; }
        public double Humidity { get; set; }
        public double Pressure { get; set; }
        public double WindSpeed { get; set; }
        public double WindDirection { get; set; }
        public double Precipitation { get; set; }
        public string Source { get; set; } = string.Empty;
    }
}