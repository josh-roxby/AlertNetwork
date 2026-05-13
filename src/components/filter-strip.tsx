export function FilterStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {children}
    </div>
  );
}
