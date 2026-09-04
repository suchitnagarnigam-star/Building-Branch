import { officers } from "../../shared/constants/mockData";

const barSegments = [65, 52, 16, 34];

function AnalyticsPage() {
  return (
    <div className="analytics-page">
      <div className="analytics-filters">
        <button className="secondary-button small-button" type="button">Last 7 days</button>
        <select defaultValue="All zones"><option>All zones</option></select>
        <select defaultValue="All blocks"><option>All blocks</option></select>
        <select defaultValue="All wards"><option>All wards</option></select>
        <select defaultValue="All officers"><option>All officers</option></select>
      </div>

      <div className="stats-grid stats-grid--analytics">
        <div className="stat-card">
          <div className="stat-card__value">1,284</div>
          <div className="stat-card__label">Total complaints</div>
          <div className="stat-card__sublabel positive">+12 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">312</div>
          <div className="stat-card__label">Open complaints</div>
          <div className="stat-card__sublabel negative">-4 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">48</div>
          <div className="stat-card__label">Pending approval</div>
          <div className="stat-card__sublabel positive">+5 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">27</div>
          <div className="stat-card__label">Closed today</div>
          <div className="stat-card__sublabel positive">+8 this week</div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="panel">
          <h3>Complaints by status</h3>
          <div className="status-bars">
            {(
              [
                ["Registered", 52],
                ["Assigned", 40],
                ["In progress", 22],
                ["Approved / Closed", 18],
                ["Rejected", 12],
              ] as [string, number][]
            ).map(([label, width]) => (
              <div className="status-bar-row" key={label}>
                <span>{label}</span>
                <div className="status-bar-track">
                  <div className="status-bar-fill" style={{ width: `${width}%` }} />
                </div>
                <strong>{width}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Complaints over time</h3>
          <div className="line-chart">
            {barSegments.map((segment, index) => (
              <div key={index} className="line-chart__point" style={{ height: `${segment}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Top performers</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Officer name</th>
              <th>Zone</th>
              <th>Complaints assigned</th>
              <th>Resolved</th>
              <th>Avg days to resolve</th>
              <th>Approval rate</th>
            </tr>
          </thead>
          <tbody>
            {officers.slice(0, 4).map((officer) => (
              <tr key={officer.name}>
                <td>{officer.name}</td>
                <td>{officer.zone}</td>
                <td>{officer.activeComplaints + 10}</td>
                <td>{officer.activeComplaints + 6}</td>
                <td>{5 + officer.activeComplaints}</td>
                <td>{75 + officer.activeComplaints * 4}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnalyticsPage;
