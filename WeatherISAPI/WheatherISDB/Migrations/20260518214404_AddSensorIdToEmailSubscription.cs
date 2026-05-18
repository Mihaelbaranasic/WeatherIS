using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WeatherISDB.Migrations
{
    /// <inheritdoc />
    public partial class AddSensorIdToEmailSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SensorId",
                table: "EmailSubscriptions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailSubscriptions_SensorId",
                table: "EmailSubscriptions",
                column: "SensorId");

            migrationBuilder.AddForeignKey(
                name: "FK_EmailSubscriptions_Sensors_SensorId",
                table: "EmailSubscriptions",
                column: "SensorId",
                principalTable: "Sensors",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EmailSubscriptions_Sensors_SensorId",
                table: "EmailSubscriptions");

            migrationBuilder.DropIndex(
                name: "IX_EmailSubscriptions_SensorId",
                table: "EmailSubscriptions");

            migrationBuilder.DropColumn(
                name: "SensorId",
                table: "EmailSubscriptions");
        }
    }
}
