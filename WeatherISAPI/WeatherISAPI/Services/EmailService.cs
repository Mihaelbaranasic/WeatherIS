using System.Net;
using System.Net.Mail;

namespace WeatherISAPI.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendAlertToSubscribersAsync(
            IEnumerable<string> emails,
            string sensorName,
            string parameter,
            double measuredValue,
            double thresholdValue)
        {
            foreach (var email in emails)
            {
                await SendAlertEmailAsync(email, sensorName, parameter, measuredValue, thresholdValue);
                await Task.Delay(300);
            }
        }

        private async Task SendAlertEmailAsync(
            string toEmail,
            string sensorName,
            string parameter,
            double measuredValue,
            double thresholdValue)
        {
            var host = _configuration["Email:SmtpHost"];
            var port = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var fromEmail = _configuration["Email:FromEmail"];
            var fromName = _configuration["Email:FromName"];
            var password = _configuration["Email:Password"];

            var paramLabels = new Dictionary<string, string>
            {
                { "Temperature", "Temperatura" },
                { "WindSpeed", "Brzina vjetra" },
                { "Precipitation", "Oborine" },
                { "Pressure", "Tlak" },
                { "Humidity", "Vlažnost" }
            };

            var paramUnits = new Dictionary<string, string>
            {
                { "Temperature", "°C" },
                { "WindSpeed", "km/h" },
                { "Precipitation", "mm" },
                { "Pressure", "hPa" },
                { "Humidity", "%" }
            };

            var paramLabel = paramLabels.GetValueOrDefault(parameter, parameter);
            var unit = paramUnits.GetValueOrDefault(parameter, "");

            var subject = $"WeatherIS Alarm — {sensorName}: {paramLabel}";

            var body = $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
    <div style='background: #1e2235; padding: 24px; border-radius: 8px;'>
        <h2 style='color: #ef4444; margin: 0 0 16px 0;'>
            Meteorološki alarm
        </h2>
        <div style='background: #0f1117; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444;'>
            <p style='color: #e2e8f0; margin: 0 0 8px 0;'>
                <strong>Senzor:</strong> {sensorName}
            </p>
            <p style='color: #e2e8f0; margin: 0 0 8px 0;'>
                <strong>Parametar:</strong> {paramLabel}
            </p>
            <p style='color: #ef4444; margin: 0 0 8px 0; font-size: 20px;'>
                <strong>Izmjereno: {measuredValue}{unit}</strong>
            </p>
            <p style='color: #94a3b8; margin: 0;'>
                Prag: {thresholdValue}{unit}
            </p>
        </div>
        <p style='color: #94a3b8; margin: 16px 0 0 0; font-size: 12px;'>
            WeatherIS — Informacijski sustav za praćenje vremenskih podataka<br/>
            {DateTime.Now:dd.MM.yyyy HH:mm}
        </p>
    </div>
</div>";

            try
            {
                using var smtp = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(fromEmail, password),
                    EnableSsl = true
                };

                using var message = new MailMessage
                {
                    From = new MailAddress(fromEmail!, fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                message.To.Add(toEmail);
                await smtp.SendMailAsync(message);

                _logger.LogInformation(
                    "Email alarm poslan na {Email} za senzor {Sensor}",
                    toEmail, sensorName);
            } catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri slanju email alarma na {Email}", toEmail);
            }
        }
    }
}