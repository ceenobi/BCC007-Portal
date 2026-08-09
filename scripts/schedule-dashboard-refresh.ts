import { Client } from "@upstash/qstash";

const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
const token = process.env.QSTASH_TOKEN;
const clientUrl = process.env.CLIENT_URL;

if (!token || !clientUrl) {
  console.error("QSTASH_TOKEN and CLIENT_URL environment variables are required");
  process.exit(1);
}

const destination = `${clientUrl}/api/v1/workflow/run-dashboard-refresh`;
const cron = "*/15 * * * *";

const client = new Client({ baseUrl, token });

async function main() {
  const schedules = await client.schedules.list();
  const existing = schedules.find((schedule) =>
    schedule.destination.includes("/run-dashboard-refresh"),
  );

  if (existing) {
    await client.schedules.create({
      destination,
      cron,
      scheduleId: existing.scheduleId,
    });
    console.log(
      `Updated schedule ${existing.scheduleId} -> ${destination} (${cron})`,
    );
    return;
  }

  const { scheduleId } = await client.schedules.create({
    destination,
    cron,
    method: "POST",
    body: "{}",
    headers: { "Content-Type": "application/json" },
  });
  console.log(`Created schedule ${scheduleId} -> ${destination} (${cron})`);
}

main().catch((error) => {
  console.error("Failed to create/update dashboard-refresh schedule:", error);
  process.exit(1);
});
