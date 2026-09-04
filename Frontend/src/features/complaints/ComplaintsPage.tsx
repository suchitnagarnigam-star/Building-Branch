import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import { complaints } from "../../shared/constants/mockData";

type ComplaintsPageProps = {
  route: string;
  navigate: (path: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

function ComplaintsPage({ route, navigate, setSelectedComplaintId }: ComplaintsPageProps) {
  const visibleComplaints = complaints.filter((complaint) => {
    if (route === "/complaints/mine") {
      return complaint.officer === "Sonia Mehta" || complaint.officer === "Rohit Verma";
    }
    if (route === "/complaints/pending") {
      return complaint.status === "Pending approval" || complaint.status === "Resolution submitted";
    }
    return true;
  });

  return (
    <div className="panel panel--table">
      <div className="panel__header">
        <h2>Complaints</h2>
        <div className="toolbar toolbar--wide">
          <div className="search-box">
            <Icon name="search" />
            <input type="text" placeholder="Complaint ID, citizen, ward" />
          </div>
          <select defaultValue="All zones"><option>All zones</option></select>
          <select defaultValue="All blocks"><option>All blocks</option></select>
          <select defaultValue="All wards"><option>All wards</option></select>
          <select defaultValue="All status"><option>All status</option></select>
          <button className="secondary-button small-button" type="button">
            <Icon name="download" /> Export CSV
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
          {visibleComplaints.map((complaint) => (
            <tr
              key={complaint.id}
              className="table-row"
              onClick={() => {
                setSelectedComplaintId(complaint.id);
                navigate(`/complaints/${complaint.id}`);
              }}
            >
              <td>{complaint.id}</td>
              <td>{complaint.citizen}</td>
              <td>{complaint.ward}</td>
              <td>{complaint.officer}</td>
              <td><StatusBadge status={complaint.status} /></td>
              <td>{complaint.registered}</td>
              <td>
                <button className="icon-only-button" type="button">
                  <Icon name="eye" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComplaintsPage;
