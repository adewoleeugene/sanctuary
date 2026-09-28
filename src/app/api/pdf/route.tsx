import { renderToBuffer } from "@react-pdf/renderer";
import { SchedulePdf } from "@/pdf/schedule";
import { activityIdsBetween, activityIdsForProgramme, getActivitySheets } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.role) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const programme = Number(url.searchParams.get("programme"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const ids = programme
    ? await activityIdsForProgramme(programme)
    : from && to
      ? await activityIdsBetween(from, to)
      : (url.searchParams.get("ids") ?? "").split(",").map(Number).filter(Boolean);

  const sheets = await getActivitySheets(ids.slice(0, 400));
  if (sheets.length === 0) return new Response("Nothing to print", { status: 404 });

  const buffer = await renderToBuffer(<SchedulePdf sheets={sheets} />);
  const name =
    sheets.length === 1
      ? `sanctuary-${sheets[0].activity.date}.pdf`
      : `sanctuary-${sheets[0].activity.date}-to-${sheets.at(-1)!.activity.date}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
