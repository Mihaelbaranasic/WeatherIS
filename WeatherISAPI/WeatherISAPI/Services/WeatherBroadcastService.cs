using Microsoft.AspNetCore.SignalR;
using WeatherISAPI.Hubs;
using WeatherISCore.Interfaces;

namespace WeatherISAPI.Services
{
    public class WeatherBroadcastService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHubContext<WeatherHub> _hubContext;
        private readonly ILogger<WeatherBroadcastService> _logger;

        public WeatherBroadcastService(
            IServiceProvider serviceProvider,
            IHubContext<WeatherHub> hubContext,
            ILogger<WeatherBroadcastService> logger)
        {
            _serviceProvider = serviceProvider;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WeatherBroadcastService pokrenut.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await BroadcastWeatherAsync();
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task BroadcastWeatherAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var sensorRepo = scope.ServiceProvider.GetRequiredService<ISensorRepository>();
                var openMeteoService = scope.ServiceProvider.GetRequiredService<OpenMeteoService>();

                var sensors = (await sensorRepo.GetActiveSensorsAsync()).ToList();
                var weatherData = await openMeteoService.GetCurrentAllAsync(sensors);

                var payload = sensors.Select(sensor =>
                {
                    var data = weatherData.FirstOrDefault(w => w.SensorId == sensor.Id);
                    return new
                    {
                        sensorId = sensor.Id,
                        sensorName = sensor.Name,
                        location = sensor.Location,
                        latitude = sensor.Latitude,
                        longitude = sensor.Longitude,
                        weather = data
                    };
                }).Where(r => r.weather != null).ToList();

                await _hubContext.Clients
                    .Group("weather-feed")
                    .SendAsync("ReceiveWeatherUpdate", payload);

                _logger.LogInformation("Weather broadcast poslan za {Count} senzora", payload.Count);
            } catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri weather broadcastu");
            }
        }
    }
}