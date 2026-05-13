using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;
using WeatherISCore.Entities;

namespace WeatherISDB
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Sensor> Sensors { get; set; }
        public DbSet<Prediction> Predictions { get; set; }
        public DbSet<Alert> Alerts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Name).IsRequired().HasMaxLength(100);
                entity.Property(s => s.Location).IsRequired().HasMaxLength(200);
                entity.Property(s => s.Latitude).IsRequired();
                entity.Property(s => s.Longitude).IsRequired();
            });

            modelBuilder.Entity<Prediction>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.HasOne(p => p.Sensor)
                      .WithMany()
                      .HasForeignKey(p => p.SensorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Alert>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.Property(a => a.Parameter).IsRequired().HasMaxLength(50);
                entity.HasOne(a => a.Sensor)
                      .WithMany()
                      .HasForeignKey(a => a.SensorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}