using Microsoft.EntityFrameworkCore;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISDB.Repositories
{
    public class EmailSubscriptionRepository : GenericRepository<EmailSubscription>, IEmailSubscriptionRepository
    {
        public EmailSubscriptionRepository(AppDbContext context) : base(context) { }

        public async Task<EmailSubscription?> GetByEmailAndSensorAsync(string email, int? sensorId)
            => await _dbSet.FirstOrDefaultAsync(s => s.Email == email && s.SensorId == sensorId);

        public async Task<IEnumerable<EmailSubscription>> GetActiveByEmailAsync(string email)
            => await _dbSet.Where(s => s.Email == email && s.IsActive)
                           .Include(s => s.Sensor)
                           .ToListAsync();

        public async Task<IEnumerable<EmailSubscription>> GetAllActiveAsync()
            => await _dbSet.Where(s => s.IsActive).ToListAsync();

        public async Task<IEnumerable<EmailSubscription>> GetActiveBySensorIdAsync(int sensorId)
            => await _dbSet.Where(s => s.IsActive && (s.SensorId == sensorId || s.SensorId == null))
                           .ToListAsync();
    }
}