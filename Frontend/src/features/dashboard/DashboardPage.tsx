import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import { complaints } from "../../shared/constants/mockData";

type DashboardPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

const statCards = [
  { label: "Total complaints", value: "1,284", sublabel: "All time", accent: "navy" },
  { label: "Open complaints", value: "312", sublabel: "Registered + Assigned + In progress", accent: "blue" },
  { label: "Pending approval", value: "48", sublabel: "Awaiting ATP / MTP sign-off", accent: "amber" },
  { label: "Closed today", value: "27", sublabel: "Approved today", accent: "green" },
];

function DashboardPage({ navigate, setSelectedComplaintId }: DashboardPageProps) {
  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-card__icon stat-card__icon--${card.accent}`}>
              <Icon name="chart" />
            </div>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__label">{card.label}</div>
            <div className="stat-card__sublabel">{card.sublabel}</div>
          </div>
        ))}
      </div>

      <section className="panel panel--table">
        <div className="panel__header">
          <h2>Recent complaints</h2>
          <div className="toolbar">
            <select defaultValue="All zones"><option>All zones</option></select>
            <select defaultValue="All blocks"><option>All blocks</option></select>
            <select defaultValue="All wards"><option>All wards</option></select>
            <select defaultValue="All status"><option>All status</option></select>
            <button className="secondary-button small-button" type="button">
              <Icon name="download" /> Export
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Citizen</th>
              <th>Ward</th>
              <th>Assigned officer</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {complaints.slice(0, 5).map((complaint) => (
              <tr
                key={complaint.id}
                onClick={() => {
                  setSelectedComplaintId(complaint.id);
                  navigate(`/complaints/${complaint.id}`);
                }}
                className="table-row"
              >
                <td>{complaint.id}</td>
                <td>{complaint.citizen}</td>
                <td>{complaint.ward}</td>
                <td>{complaint.officer}</td>
                <td><StatusBadge status={complaint.status} /></td>
                <td>{complaint.registered}</td>
                <td>
                  <button
                    className="icon-only-button"
                    type="button"
                    aria-label={`View ${complaint.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedComplaintId(complaint.id);
                      navigate(`/complaints/${complaint.id}`);
                    }}
                  >
                    <Icon name="eye" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default DashboardPage;
