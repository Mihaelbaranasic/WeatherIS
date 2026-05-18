using WeatherISCore.Entities;
using WeatherISCore.Interfaces;
using WeatherISDB;
using WeatherISAPI.Services;

namespace WeatherISAPI.Services
{
    public class DataSyncService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DataSyncService> _logger;

        public DataSyncService(IServiceProvider serviceProvider, ILogger<DataSyncService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DataSyncService pokrenut.");

            _ = Task.Run(async () =>
            {
                await Task.Delay(5000, stoppingToken);
                await SyncForecastsAsync();
                await CheckAlertsAsync();
            }, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.Now;
                var nextRun = DateTime.Today.AddDays(1).AddHours(3);
                var delay = nextRun - now;

                _logger.LogInformation("Sljedeći sync: {NextRun}", nextRun);
                await Task.Delay(delay, stoppingToken);

                await CleanOldDataAsync();
                await SyncForecastsAsync();
                await CheckAlertsAsync();
            }
        }

        private async Task SyncForecastsAsync()
        {
            _logger.LogInformation("Sync forecasta...");

            using var scope = _serviceProvider.CreateScope();
            var sensorRepo = scope.ServiceProvider.GetRequiredService<ISensorRepository>();
            var predictionRepo = scope.ServiceProvider.GetRequiredService<IPredictionRepository>();
            var openMeteoService = scope.ServiceProvider.GetRequiredService<OpenMeteoService>();

            var sensors = (await sensorRepo.GetActiveSensorsAsync()).ToList();

            foreach (var sensor in sensors)
            {
                try
                {
                    var existing = await predictionRepo.GetBySensorIdAsync(sensor.Id);
                    var hasRecent = existing.Any(p =>
                        p.Source == "OpenMeteo" &&
                        p.GeneratedAt >= DateTime.UtcNow.AddHours(-12));

                    if (!hasRecent)
                    {
                        var forecasts = await openMeteoService.GetForecastAsync(
                            sensor.Id, sensor.Latitude, sensor.Longitude, 16);

                        if (forecasts.Any())
                        {
                            await predictionRepo.AddRangeAsync(forecasts);
                            _logger.LogInformation(
                                "Senzor {Id}: importirano {Count} forecast podataka",
                                sensor.Id, forecasts.Count);
                        }
                    }

                    await Task.Delay(500);
                } catch (Exception ex)
                {
                    _logger.LogError(ex, "Greška pri syncu senzora {Id}", sensor.Id);
                    await Task.Delay(1000);
                }
            }

            _logger.LogInformation("Sync forecasta završen.");
        }

        private async Task CheckAlertsAsync()
        {
            _logger.LogInformation("Provjera alarma...");

            using var scope = _serviceProvider.CreateScope();
            var sensorRepo = scope.ServiceProvider.GetRequiredService<ISensorRepository>();
            var alertRepo = scope.ServiceProvider.GetRequiredService<IAlertRepository>();
            var subscriptionRepo = scope.ServiceProvider.GetRequiredService<IEmailSubscriptionRepository>();
            var openMeteoService = scope.ServiceProvider.GetRequiredService<OpenMeteoService>();
            var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

            var sensors = (await sensorRepo.GetActiveSensorsAsync()).ToList();
            var weatherData = await openMeteoService.GetCurrentAllAsync(sensors);

            var thresholds = new List<(string param, double threshold, bool isUpperBound)>
            {
                ("Temperature", 30.0, true),
                ("Temperature", 0.0, false),
                ("WindSpeed", 50.0, true),
                ("Precipitation", 5.0, true),
                ("Pressure", 990.0, false),
                ("Humidity", 90.0, true),
            };

            foreach (var sensor in sensors)
            {
                var current = weatherData.FirstOrDefault(w => w.SensorId == sensor.Id);
                if (current == null) continue;

                foreach (var (param, threshold, isUpperBound) in thresholds)
                {
                    double value = param switch
                    {
                        "Temperature" => current.Temperature,
                        "WindSpeed" => current.WindSpeed,
                        "Precipitation" => current.Precipitation,
                        "Pressure" => current.Pressure,
                        "Humidity" => current.Humidity,
                        _ => 0
                    };

                    bool isTriggered = isUpperBound ? value > threshold : value < threshold;

                    if (isTriggered)
                    {
                        var existing = await alertRepo.GetActiveAlertAsync(sensor.Id, param);
                        if (existing == null)
                        {
                            await alertRepo.AddAsync(new Alert
                            {
                                SensorId = sensor.Id,
                                Parameter = param,
                                ThresholdValue = threshold,
                                MeasuredValue = value,
                                TriggeredAt = DateTime.UtcNow,
                                IsResolved = false
                            });

                            var subscribers = await subscriptionRepo.GetActiveBySensorIdAsync(sensor.Id);
                            if (subscribers.Any())
                            {
                                await emailService.SendAlertToSubscribersAsync(
                                    subscribers.Select(s => s.Email),
                                    sensor.Name,
                                    param,
                                    value,
                                    threshold);
                            }

                            _logger.LogInformation(
                                "Alert okidan: Senzor {Id}, param {Param}, vrijednost {Value}",
                                sensor.Id, param, value);
                        }
                    }
                }

                await Task.Delay(300);
            }

            _logger.LogInformation("Provjera alarma završena.");
        }

        private async Task CleanOldDataAsync()
        {
            _logger.LogInformation("Čišćenje starih podataka...");

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cutoffDate = DateTime.UtcNow.AddDays(-60);

            var oldPredictions = context.Predictions
                .Where(p => p.PredictedFor < DateTime.UtcNow.AddDays(-1));
            context.Predictions.RemoveRange(oldPredictions);

            var oldAlerts = context.Alerts
                .Where(a => a.IsResolved && a.TriggeredAt < cutoffDate);
            context.Alerts.RemoveRange(oldAlerts);

            var veryOldAlerts = context.Alerts
                .Where(a => a.TriggeredAt < DateTime.UtcNow.AddDays(-7));
            context.Alerts.RemoveRange(veryOldAlerts);

            await context.SaveChangesAsync();
            _logger.LogInformation("Čišćenje završeno.");
        }
    }
}