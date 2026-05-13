using Microsoft.EntityFrameworkCore;
using WeatherISAPI.Hubs;
using WeatherISAPI.Services;
using WeatherISCore.Interfaces;
using WeatherISDB;
using WeatherISDB.Repositories;
using WeatherISML.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repozitoriji
builder.Services.AddScoped<ISensorRepository, SensorRepository>();
builder.Services.AddScoped<IPredictionRepository, PredictionRepository>();
builder.Services.AddScoped<IAlertRepository, AlertRepository>();

// Servisi
builder.Services.AddSingleton<WeatherPredictionService>();
builder.Services.AddHttpClient<OpenMeteoService>();
builder.Services.AddHostedService<DataSyncService>();
builder.Services.AddHostedService<IoTSimulatorService>();
builder.Services.AddSignalR();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:52257",
                "https://localhost:52257"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ReactPolicy");
app.UseAuthorization();
app.MapControllers();
app.MapHub<SensorHub>("/hubs/sensor");

app.Run();