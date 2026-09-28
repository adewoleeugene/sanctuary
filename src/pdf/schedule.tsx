import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ActivitySheet } from "@/lib/queries";
import { cleaningTimesLabel } from "@/db/schema";
import { formatBirthday, formatLong } from "@/lib/dates";

const BRAND = "#5b3a8c";
const MUTED = "#6b6259";
const LINE = "#e7e1d9";

const s = StyleSheet.create({
  // A5 portrait reads well full-screen on a phone in WhatsApp.
  page: { padding: 28, fontSize: 10.5, fontFamily: "Helvetica", color: "#1f1b16" },
  kicker: { fontSize: 9, color: BRAND, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", marginTop: 4 },
  date: { fontSize: 11.5, marginTop: 3 },
  theme: { marginTop: 8, padding: 8, backgroundColor: "#efe9f7", borderRadius: 4, fontSize: 10 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 3,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  label: { width: "42%", color: MUTED },
  value: { width: "58%", fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, fontSize: 8, color: MUTED, textAlign: "center" },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

export function SchedulePdf({ sheets }: { sheets: ActivitySheet[] }) {
  return (
    <Document title="Sanctuary schedule" author="Sanctuary">
      {sheets.map((sheet) => {
        const { activity } = sheet;
        return (
          <Page key={activity.id} size="A5" style={s.page}>
            <Text style={s.kicker}>
              {sheet.programmeName
                ? `${sheet.programmeName}${activity.dayNumber ? ` · Day ${activity.dayNumber} of ${sheet.programmeDays}` : ""}`
                : "Sanctuary"}
            </Text>
            <Text style={s.title}>{sheet.typeName}</Text>
            <Text style={s.date}>
              {formatLong(activity.date)}
              {activity.time ? ` · ${activity.time}` : ""}
            </Text>
            {activity.theme && <Text style={s.theme}>{activity.theme}</Text>}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Service roles</Text>
              <Row
                label={sheet.coordinators.length > 1 ? "Coordinators" : "Coordinator"}
                value={sheet.coordinators.map((c) => c.fullName).join(" & ") || "TBC"}
              />
              {sheet.roles.map(({ role, members }) => (
                <Row key={role.id} label={role.name} value={members.map((m) => m.fullName).join(", ") || "TBC"} />
              ))}
            </View>

            {sheet.zones.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Cleaning · {cleaningTimesLabel(activity.cleaningShifts)}</Text>
                {sheet.zones.map(({ zone, assignments }) => (
                  <Row
                    key={zone.id}
                    label={zone.name}
                    value={assignments.map((a) => a.member.fullName).join(", ") || "—"}
                  />
                ))}
              </View>
            )}

            {sheet.birthdays.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Birthdays this week</Text>
                {sheet.birthdays.map((b) => (
                  <Row
                    key={b.member.id}
                    label={formatBirthday(b.member.birthDay!, b.member.birthMonth!)}
                    value={b.member.fullName}
                  />
                ))}
              </View>
            )}

            <Text style={s.footer} fixed>
              &quot;Holiness adorns your house, O Lord, forever.&quot; — Psalm 93:5
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}
