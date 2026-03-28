/**
 * Locks calendar to a fixed share of the viewport below the app header so the
 * document does not scroll; only inner panes (sidebar / grid) scroll.
 */
export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="calendar-route-shell flex w-full min-w-0 shrink-0 flex-col overflow-hidden">
      {children}
    </div>
  );
}
