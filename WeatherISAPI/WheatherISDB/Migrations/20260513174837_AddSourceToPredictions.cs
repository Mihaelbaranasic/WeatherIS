using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WeatherISDB.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceToPredictions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Predictions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "Predictions");
        }
    }
}
