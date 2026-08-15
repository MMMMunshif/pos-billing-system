export default function StatCard({ label, value, variant = 'default', icon }) {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-card-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
      {icon && <span className="stat-icon">{icon}</span>}
    </div>
  );
}
