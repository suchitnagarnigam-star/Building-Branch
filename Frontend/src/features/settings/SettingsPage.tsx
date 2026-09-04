function SettingsPage() {
  return (
    <div className="settings-page">
      <div className="panel settings-card">
        <h2>System settings</h2>
        <div className="settings-group">
          <label className="field">
            <span>Municipal office</span>
            <input defaultValue="Ludhiana Municipal Corporation" />
          </label>
          <label className="field">
            <span>Default complaint workflow</span>
            <input defaultValue="Assigned → In progress → Resolution submitted" />
          </label>
          <label className="field">
            <span>Approval threshold</span>
            <input defaultValue="2-step ATP / MTP sign-off" />
          </label>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
