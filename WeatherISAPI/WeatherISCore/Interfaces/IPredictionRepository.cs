using WeatherISCore.Entities;

namespace WeatherISCore.Interfaces
{
    public interface IPredictionRepository : IRepository<Prediction>
    {
        Task<IEnumerable<Prediction>> GetBySensorIdAsync(int sensorId);
        Task<IEnumerable<Prediction>> GetLatestBySensorIdAsync(int sensorId, int count);
    }
}