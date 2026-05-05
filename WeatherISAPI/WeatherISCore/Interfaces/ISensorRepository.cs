using WeatherISCore.Entities;

namespace WeatherISCore.Interfaces
{
    public interface ISensorRepository : IRepository<Sensor>
    {
        Task<IEnumerable<Sensor>> GetActiveSensorsAsync();
    }
}