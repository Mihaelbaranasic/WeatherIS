using Microsoft.EntityFrameworkCore;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISDB.Repositories
{
    public class PredictionRepository : GenericRepository<Prediction>, IPredictionRepository
    {
        public PredictionRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Prediction>> GetBySensorIdAsync(int sensorId)
            => await _dbSet.Where(p => p.SensorId == sensorId)
                           .OrderByDescending(p => p.GeneratedAt)
                           .ToListAsync();

        public async Task<IEnumerable<Prediction>> GetLatestBySensorIdAsync(int sensorId, int count)
            => await _dbSet.Where(p => p.SensorId == sensorId)
                           .OrderByDescending(p => p.GeneratedAt)
                           .Take(count)
                           .ToListAsync();
    }
}