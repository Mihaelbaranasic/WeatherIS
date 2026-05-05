using Microsoft.EntityFrameworkCore;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISDB.Repositories
{
    public class MeasurementRepository : GenericRepository<Measurement>, IMeasurementRepository
    {
        public MeasurementRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Measurement>> GetBySensorIdAsync(int sensorId)
            => await _dbSet.Where(m => m.SensorId == sensorId)
                           .OrderByDescending(m => m.Timestamp)
                           .ToListAsync();

        public async Task<IEnumerable<Measurement>> GetBySensorIdAndDateRangeAsync(
            int sensorId, DateTime from, DateTime to)
            => await _dbSet.Where(m => m.SensorId == sensorId
                                    && m.Timestamp >= from
                                    && m.Timestamp <= to)
                           .OrderBy(m => m.Timestamp)
                           .ToListAsync();

        public async Task<Measurement?> GetLatestBySensorIdAsync(int sensorId)
            => await _dbSet.Where(m => m.SensorId == sensorId)
                           .OrderByDescending(m => m.Timestamp)
                           .FirstOrDefaultAsync();
    }
}