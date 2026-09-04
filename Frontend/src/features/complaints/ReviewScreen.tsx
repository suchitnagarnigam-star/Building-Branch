import Icon from "../../shared/components/Icon";

function ReviewScreen() {
  return (
    <div className="form-page">
      <div className="page-card review-card">
        <div className="review-banner">
          <span className="review-banner__icon"><Icon name="sparkles" /></span>
          Fields were filled from your uploaded document. Review and correct before submitting.
        </div>

        <div className="review-layout">
          <div className="review-fields">
            <label className="field">
              <span>Citizen name</span>
              <input defaultValue="Ravinder Singh" />
            </label>
            <label className="field low-confidence">
              <span>Phone number</span>
              <input defaultValue="98765 43210" />
              <small>Check this field — extracted with low confidence.</small>
            </label>
            <label className="field">
              <span>Complaint title</span>
              <input defaultValue="Waterlogging on main road" />
            </label>
            <label className="field">
              <span>Complaint description</span>
              <textarea
                rows={5}
                defaultValue="Heavy rain has caused water accumulation near the traffic signal."
              />
            </label>
          </div>

          <div className="preview-sidebar">
            <div className="preview-panel">Uploaded image preview</div>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="secondary-button">Re-upload</button>
          <button type="button" className="primary-button">Submit complaint</button>
        </div>
      </div>
    </div>
  );
}

export default ReviewScreen;
