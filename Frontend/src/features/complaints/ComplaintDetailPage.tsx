import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { AppComplaint } from "../../shared/types";

type ComplaintDetailPageProps = {
  complaint: AppComplaint;
  navigate: (path: string) => void;
};

function ComplaintDetailPage({ complaint, navigate }: ComplaintDetailPageProps) {
  return (
    <div className="detail-page">
      <div className="detail-main">
        <button className="back-link" type="button" onClick={() => navigate("/complaints")}>
          <Icon name="arrow" /> All complaints
        </button>

        <div className="detail-header">
          <div className="detail-header__meta">{complaint.id}</div>
          <h2>{complaint.title}</h2>
          <div className="detail-header__info">
            <StatusBadge status={complaint.status} />
            <span>Registered {complaint.registered}</span>
          </div>
        </div>

        <div className="panel detail-panel">
          <h3>Citizen and location</h3>
          <div className="detail-grid">
            <div><span>Citizen</span><strong>{complaint.citizen}</strong></div>
            <div><span>Phone</span><strong>{complaint.phone}</strong></div>
            <div><span>Zone</span><strong>{complaint.zone}</strong></div>
            <div><span>Block</span><strong>{complaint.block}</strong></div>
            <div><span>Ward</span><strong>{complaint.ward}</strong></div>
            <div><span>Address</span><strong>{complaint.address}</strong></div>
          </div>
        </div>

        <div className="panel detail-panel">
          <h3>Complaint details</h3>
          <p>{complaint.description}</p>
          <div className="attachment-grid">
            <div className="attachment-preview" />
            <div className="attachment-preview" />
            <div className="attachment-preview" />
          </div>
        </div>

        <div className="panel detail-panel">
          <h3>Activity timeline</h3>
          <div className="timeline">
            {complaint.timeline.map((item) => (
              <div className="timeline-item" key={`${item.label}-${item.timestamp}`}>
                <span className={`timeline-dot timeline-dot--${item.accent}`} />
                <div>
                  <div className="timeline-item__label">{item.label}</div>
                  <div className="timeline-item__meta">{item.timestamp} • {item.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="detail-side">
        <div className="panel side-card">
          <h3>Assignment</h3>
          <div className="actor-row">
            <div className="actor-avatar">SM</div>
            <div>
              <strong>{complaint.assignedOfficer}</strong>
              <small>{complaint.phone}</small>
            </div>
          </div>
          <div className="side-divider" />
          <div className="meta-row"><span>ATP</span><strong>{complaint.atp}</strong></div>
        </div>

        <div className="panel side-card">
          <h3>Status</h3>
          <div className="status-highlight"><StatusBadge status={complaint.status} /></div>
          <div className="days-open">{complaint.daysOpen} days open</div>
        </div>

        <div className="panel side-card">
          <h3>Actions</h3>
          <button type="button" className="secondary-button button-full">Edit complaint</button>
          <button type="button" className="primary-button button-full">Submit resolution</button>
        </div>
      </aside>
    </div>
  );
}

export default ComplaintDetailPage;
