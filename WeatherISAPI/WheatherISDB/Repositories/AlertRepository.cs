using Microsoft.EntityFrameworkCore;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISDB.Repositories
{
    public class AlertRepository : GenericRepository<Alert>, IAlertRepository
    {
        public AlertRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Alert>> GetActiveBySensorIdAsync(int sensorId)
            => await _dbSet.Where(a => a.SensorId == sensorId && !a.IsResolved)
                           .OrderByDescending(a => a.TriggeredAt)
                           .ToListAsync();

        public async Task<IEnumerable<Alert>> GetAllActiveAsync()
            => await _dbSet.Where(a => !a.IsResolved)
                           .OrderByDescending(a => a.TriggeredAt)
                           .ToListAsync();
    }
}