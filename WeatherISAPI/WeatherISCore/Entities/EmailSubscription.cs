namespace WeatherISCore.Entities
{
    public class EmailSubscription
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public int? SensorId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Sensor? Sensor { get; set; }
    }
}