using WeatherISCore.Entities;

namespace WeatherISCore.Interfaces
{
    public interface IMeasurementRepository : IRepository<Measurement>
    {
        Task<IEnumerable<Measurement>> GetBySensorIdAsync(int sensorId);
        Task<IEnumerable<Measurement>> GetBySensorIdAndDateRangeAsync(int sensorId, DateTime from, DateTime to);
        Task<Measurement?> GetLatestBySensorIdAsync(int sensorId);
    }
}