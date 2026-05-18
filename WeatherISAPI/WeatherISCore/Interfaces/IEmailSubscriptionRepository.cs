using WeatherISCore.Entities;

namespace WeatherISCore.Interfaces
{
    public interface IEmailSubscriptionRepository : IRepository<EmailSubscription>
    {
        Task<EmailSubscription?> GetByEmailAndSensorAsync(string email, int? sensorId);
        Task<IEnumerable<EmailSubscription>> GetActiveByEmailAsync(string email);
        Task<IEnumerable<EmailSubscription>> GetAllActiveAsync();
        Task<IEnumerable<EmailSubscription>> GetActiveBySensorIdAsync(int sensorId);
    }
}