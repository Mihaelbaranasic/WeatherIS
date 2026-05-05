using WeatherISCore.Entities;

namespace WeatherISCore.Interfaces
{
    public interface IAlertRepository : IRepository<Alert>
    {
        Task<IEnumerable<Alert>> GetActiveBySensorIdAsync(int sensorId);
        Task<IEnumerable<Alert>> GetAllActiveAsync();
    }
}