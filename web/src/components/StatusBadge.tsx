export default function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
      <span className="progress-label">{clamped}%</span>
    </div>
  );
}
