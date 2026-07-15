const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const MUMBAI_TIME_ZONE = "Asia/Kolkata";

function getMumbaiDateTime(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MUMBAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export function isWithinActiveHours(delay: number, now = new Date()): boolean {
  const targetTime = new Date(now.getTime() + delay);
  const nowInMumbai = getMumbaiDateTime(now);
  const targetInMumbai = getMumbaiDateTime(targetTime);
  return (
    targetInMumbai.date === nowInMumbai.date &&
    targetInMumbai.hour >= ACTIVE_START_HOUR &&
    targetInMumbai.hour < ACTIVE_END_HOUR
  );
}
