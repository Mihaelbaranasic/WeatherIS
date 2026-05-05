using Microsoft.EntityFrameworkCore;
using WeatherISCore.Entities;
using WeatherISCore.Interfaces;

namespace WeatherISDB.Repositories
{
    public class SensorRepository : GenericRepository<Sensor>, ISensorRepository
    {
        public SensorRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Sensor>> GetActiveSensorsAsync()
            => await _dbSet.Where(s => s.IsActive).ToListAsync();
    }
}