import Icon from "../../shared/components/Icon";
import { officers } from "../../shared/constants/mockData";

function OfficersPage() {
  return (
    <div className="panel panel--table">
      <div className="panel__header">
        <h2>Officers</h2>
        <button className="primary-button small-button" type="button">Add officer</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Designation</th>
            <th>Zone</th>
            <th>Blocks</th>
            <th>Wards</th>
            <th>Active complaints</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {officers.map((officer) => (
            <tr key={officer.name}>
              <td>{officer.name}</td>
              <td>{officer.designation}</td>
              <td>{officer.zone}</td>
              <td>{officer.blocks.join(", ")}</td>
              <td>{officer.wards} wards</td>
              <td>{officer.activeComplaints}</td>
              <td>
                <div className="icon-action-group">
                  <button className="icon-only-button" type="button" aria-label={`View ${officer.name}`}>
                    <Icon name="eye" />
                  </button>
                  <button className="icon-only-button" type="button" aria-label={`Edit ${officer.name}`}>
                    <Icon name="edit" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OfficersPage;
