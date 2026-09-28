import { cleaningTimesLabel, type Member } from "@/db/schema";
import type { ActivitySheet } from "@/lib/queries";
import { formatBirthday, formatLong } from "@/lib/dates";

/** Plain text for pasting a day's programme into WhatsApp (*bold* is WhatsApp markup). */
export function activityWhatsAppText(sheet: ActivitySheet) {
  const { activity } = sheet;
  const lines: string[] = [];

  const heading = sheet.programmeName
    ? `*${sheet.programmeName}${activity.dayNumber ? ` — Day ${activity.dayNumber} of ${sheet.programmeDays}` : ""}*`
    : `*${sheet.typeName}*`;
  lines.push(heading);
  lines.push(`📅 ${formatLong(activity.date)}${activity.time ? ` · ${activity.time}` : ""}`);
  if (sheet.programmeName) lines.push(`⛪ ${sheet.typeName}`);
  if (activity.theme) lines.push(`📖 ${activity.theme}`);
  lines.push("");
  lines.push(
    `*Coordinator${sheet.coordinators.length > 1 ? "s" : ""}:* ${sheet.coordinators.map((c) => c.fullName).join(" & ") || "TBC"}`,
  );
  for (const { role, members } of sheet.roles) {
    lines.push(`*${role.name}:* ${members.map((m) => m.fullName).join(", ") || "TBC"}`);
  }

  if (sheet.zones.length) {
    lines.push("");
    lines.push(`🧹 *Cleaning (${cleaningTimesLabel(activity.cleaningShifts)})*`);
    for (const { zone, assignments } of sheet.zones) {
      lines.push(`• ${zone.name}: ${assignments.map((a) => a.member.fullName).join(", ") || "—"}`);
    }
  }

  if (sheet.birthdays.length) {
    lines.push("");
    lines.push("🎂 *Birthdays this week*");
    for (const b of sheet.birthdays) {
      lines.push(`• ${b.member.fullName} — ${formatBirthday(b.member.birthDay!, b.member.birthMonth!)}`);
    }
  }

  return lines.join("\n");
}

export function birthdayMessage(template: string, fullName: string) {
  return template.replaceAll("{name}", fullName);
}

/** Everyone with a duty on the day, with their duties, for personal reminders. */
export function dutiesByMember(sheet: ActivitySheet) {
  const duties = new Map<number, { member: Member; duties: string[] }>();
  const add = (member: Member, duty: string) => {
    const entry = duties.get(member.id) ?? { member, duties: [] };
    entry.duties.push(duty);
    duties.set(member.id, entry);
  };
  for (const c of sheet.coordinators) add(c, "Coordinator");
  for (const { role, members } of sheet.roles) for (const m of members) add(m, role.name);
  const when = cleaningTimesLabel(sheet.activity.cleaningShifts);
  for (const { zone, assignments } of sheet.zones) {
    for (const a of assignments) add(a.member, `Cleaning ${zone.name} (${when})`);
  }
  return [...duties.values()];
}

export function reminderText(sheet: ActivitySheet, member: Member, duties: string[]) {
  const first = member.fullName.replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, "").split(" ")[0];
  const what = sheet.programmeName
    ? `${sheet.programmeName}${sheet.activity.dayNumber ? ` (Day ${sheet.activity.dayNumber})` : ""}`
    : sheet.typeName;
  return [
    `Hello ${first} 👋`,
    "",
    `A reminder for *${what}* on *${formatLong(sheet.activity.date)}*${sheet.activity.time ? ` at ${sheet.activity.time}` : ""}.`,
    "",
    `You are on: *${duties.join(", ")}*`,
    "",
    "Thank you for serving! 🙏",
  ].join("\n");
}
