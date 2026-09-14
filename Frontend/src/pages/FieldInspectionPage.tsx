import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { locationData, zoneForBlock } from "../data/locationData";
import Icon from "../shared/components/Icon";

type FieldInspectionPageProps = {
  navigate: (route: string) => void;
};

type Officer = {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

const getOfficersRosterUrl = () => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
  return `${base}/officers/roster`;
};

const normalise = (value: string) =>
  value.replace(/^zone\s*/i, "").replace(/^block\s*/i, "").trim().toUpperCase();

const isBiOfficer = (officer: Officer) => {
  const designation = officer.designation.trim().toUpperCase();
  return designation === "BI" || designation.endsWith("-BI");
};

function FieldInspectionPage({ navigate }: FieldInspectionPageProps) {
  const [sourceOfReport, setSourceOfReport] = useState<"complaint" | "field_visit">("complaint");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(true);
  const [officersError, setOfficersError] = useState("");
  const [reportingOfficer, setReportingOfficer] = useState("");
  const [block, setBlock] = useState("");
  const [ward, setWard] = useState("");
  const [location, setLocation] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [otherBuildingType, setOtherBuildingType] = useState("");
  const [violatorName, setViolatorName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [noticePhoto, setNoticePhoto] = useState<File | null>(null);
  const [noticeNumber, setNoticeNumber] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const noticeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch(getOfficersRosterUrl())
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load officers.");
        return result;
      })
      .then((result: { officers?: Officer[] }) => {
        if (active) setOfficers(result.officers ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setOfficersError(reason instanceof Error ? reason.message : "Unable to load officers.");
      })
      .finally(() => {
        if (active) setOfficersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const zone = useMemo(() => zoneForBlock(block), [block]);
  const selectedReportingOfficer = useMemo(
    () => officers.find((officer) => officer.officerId === reportingOfficer),
    [officers, reportingOfficer],
  );
  const availableBlocks = useMemo(() => {
    if (!selectedReportingOfficer) return [];
    const assignedBlocks = new Set(selectedReportingOfficer.blocks.map(normalise));
    return locationData.filter((entry) => assignedBlocks.has(normalise(entry.block)));
  }, [selectedReportingOfficer]);
  const supervisingAtp = useMemo(() => {
    const selectedBlock = normalise(block);
    if (!selectedBlock) return undefined;
    return officers.find(
      (officer) =>
        officer.designation.trim().toUpperCase() === "ATP" &&
        normalise(officer.zone) === normalise(zone) &&
        officer.blocks.some((officerBlock) => normalise(officerBlock) === selectedBlock),
    );
  }, [block, officers, zone]);

  const captureLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location capture.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.message || "Unable to capture the current location.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 0) setPhotos((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

  const submitInspection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="field-inspection-page">
      <div className="field-inspection-page__intro">
        <div>
          <p className="eyebrow">FIELD OPERATIONS / NEW RECORD</p>
          <h1>Building Field Inspection &amp; Violation Report</h1>
          <p>Record inspection details, violation information and supporting evidence in one secure report.</p>
        </div>
        <span className="field-inspection-page__status"><span /> Draft inspection</span>
      </div>

      <form className="field-inspection-form" onSubmit={submitInspection}>
        <section className="inspection-card">
          <div className="inspection-card__header">
            <span className="inspection-card__number">01</span>
            <div><h2>Report Information</h2><p>Identify the source and officer responsible for this inspection.</p></div>
          </div>
          <div className="inspection-grid">
            <div className="form-field form-field--full">
              <label>Source of Report <span>*</span></label>
              <div className="choice-grid choice-grid--inline">
                {([["complaint", "Complaint Based", "Inspection linked to a registered complaint"], ["field_visit", "Field Visit", "Inspection initiated in the field"]] as const).map(([value, label, hint]) => (
                  <label className={`choice-card choice-card--compact ${sourceOfReport === value ? "choice-card--selected" : ""}`} key={value}>
                    <input type="radio" name="sourceOfReport" value={value} checked={sourceOfReport === value} onChange={() => setSourceOfReport(value)} />
                    <span><strong>{label}</strong><small>{hint}</small></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="reportingOfficer">Reporting Officer <span>*</span></label>
              <select id="reportingOfficer" required value={reportingOfficer} onChange={(event) => { setReportingOfficer(event.target.value); setBlock(""); }} disabled={officersLoading || Boolean(officersError)}>
                <option value="">{officersLoading ? "Loading officers..." : "Select reporting officer"}</option>
                {officers.filter(isBiOfficer).map((officer) => <option key={officer.officerId} value={officer.officerId}>{officer.name} · {officer.designation}</option>)}
              </select>
              {officersError ? <small className="field-error">{officersError}</small> : <small>Only BI officers from the current roster can conduct field inspections.</small>}
            </div>
            <div className="form-field">
              <label>Supervising ATP</label>
              <div className={`atp-card ${!supervisingAtp ? "atp-card--empty" : ""}`}>
                <Icon name="user" />
                {supervisingAtp ? <div><strong>{supervisingAtp.name}</strong><span>{supervisingAtp.designation} ·  {supervisingAtp.zone}</span></div> : <div><strong>{block ? "No supervising ATP mapped" : "Select a block to map ATP"}</strong><span>{block ? "No ATP is assigned to the selected block." : "Choose a reporting officer, then select a block."}</span></div>}
              </div>
            </div>
          </div>
        </section>

        <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">02</span><div><h2>Location &amp; Jurisdiction</h2><p>Use the mapped block to determine the responsible zone.</p></div></div>
          <div className="inspection-grid">
            <div className="form-field"><label htmlFor="block">Block <span>*</span></label><select id="block" required value={block} onChange={(event) => setBlock(event.target.value)} disabled={!selectedReportingOfficer}><option value="">{selectedReportingOfficer ? "Select assigned block" : "Select reporting officer first"}</option>{availableBlocks.map((entry) => <option value={entry.block} key={entry.block}>{entry.block}</option>)}</select><small>{selectedReportingOfficer ? "Only blocks assigned to the selected BI officer are shown." : "Block options will appear after selecting a BI officer."}</small></div>
            <div className="form-field"><label htmlFor="zone">Zone</label><div id="zone" className="derived-field"><Icon name="map" />{zone || "Auto-mapped from block"}</div><small>Automatically derived from the selected block.</small></div>
            <div className="form-field"><label htmlFor="ward">Ward <em>Optional</em></label><input id="ward" value={ward} onChange={(event) => setWard(event.target.value)} placeholder="Enter ward" /></div>
            <div className="form-field form-field--wide"><label htmlFor="location">Location / Landmark <span>*</span></label><input id="location" required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter exact location, property address or nearby landmark" /></div>
            <div className="form-field form-field--full"><label>GPS Location <span>*</span></label><div className={`location-capture ${coordinates ? "location-capture--success" : ""}`}><div className="location-capture__icon"><Icon name="map" /></div><div className="location-capture__content"><strong>{coordinates ? "Location captured" : "GPS location not captured"}</strong>{coordinates ? <span>Lat {coordinates.latitude.toFixed(5)} · Long {coordinates.longitude.toFixed(5)} · Accuracy ±{Math.round(coordinates.accuracy)} m</span> : <span>Capture the device location at the inspection site.</span>}</div><button type="button" className="secondary-button" onClick={captureLocation} disabled={locationLoading}>{locationLoading ? "Capturing..." : coordinates ? "Recapture" : "Capture Current Location"}</button></div>{locationError && <small className="field-error">{locationError}</small>}</div>
          </div>
        </section>

        <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">03</span><div><h2>Building &amp; Violator Details</h2><p>Record the building classification and details observed during inspection.</p></div></div>
          <div className="inspection-grid">
            <div className="form-field form-field--full"><label>Building Type <span>*</span></label><div className="building-type-grid">{["Residential", "Commercial", "Industrial", "Other"].map((type) => <label className={`building-type ${buildingType === type ? "building-type--selected" : ""}`} key={type}><input type="radio" name="buildingType" value={type} required checked={buildingType === type} onChange={(event) => setBuildingType(event.target.value)} /><span>{type}</span></label>)}</div></div>
            {buildingType === "Other" && <div className="form-field form-field--full"><label htmlFor="otherBuildingType">Specify Building Type <span>*</span></label><input id="otherBuildingType" required value={otherBuildingType} onChange={(event) => setOtherBuildingType(event.target.value)} placeholder="Enter building type" /></div>}
            <div className="form-field"><label htmlFor="violatorName">Violator Name <span>*</span></label><input id="violatorName" required value={violatorName} onChange={(event) => setViolatorName(event.target.value)} placeholder="Enter violator name" /></div>
            <div className="form-field"><label htmlFor="mobileNumber">Mobile Number <em>Optional</em></label><input id="mobileNumber" type="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="Enter mobile number" /></div>
            <div className="form-field form-field--full"><label htmlFor="description">Brief Description / Construction Details <span>*</span></label><textarea id="description" required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the construction activity, violation or other relevant details" /></div>
          </div>
        </section>

        <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">04</span><div><h2>Location Evidence</h2><p>Add clear photographs supporting the inspection and violation report.</p></div></div>
          <div className="form-field"><label>Geotagged Photos <span>*</span></label><div className="photo-dropzone"><Icon name="upload" /><strong>Add inspection photos</strong><span>Capture a photo or upload from your device</span><div className="photo-dropzone__actions"><button type="button" className="secondary-button" onClick={() => photoInputRef.current?.click()}>Capture Photo</button><button type="button" className="secondary-button" onClick={() => photoInputRef.current?.click()}>Upload Photo</button></div><input ref={photoInputRef} type="file" accept="image/*" multiple capture="environment" hidden onChange={addPhotos} /></div>{photos.length > 0 && <div className="photo-list">{photos.map((photo, index) => <div className="photo-item" key={`${photo.name}-${photo.lastModified}-${index}`}><img src={URL.createObjectURL(photo)} alt="" /><span>{photo.name}</span><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" /></button></div>)}</div>}<small>Location coordinates captured above will be associated with this evidence at submission.</small></div>
        </section>

        <section className="notice-section">
          <button type="button" className="notice-section__header" onClick={() => setNoticeOpen((current) => !current)} aria-expanded={noticeOpen}><span className="notice-section__icon"><Icon name="alert" /></span><span><strong>NOTICE UNDER SECTION 270(1)</strong><small>PMC ACT, 1976 · Required for registration</small></span><span className="notice-section__toggle">{noticeOpen ? "−" : "+"}</span></button>
          {noticeOpen && <div className="notice-section__body"><p>Enter the statutory notice details and attach a clear photograph of the served notice.</p><div className="inspection-grid"><div className="form-field"><label htmlFor="noticeNumber">Notice Number <span>*</span></label><input id="noticeNumber" required value={noticeNumber} onChange={(event) => setNoticeNumber(event.target.value)} placeholder="Enter notice number" /></div><div className="form-field"><label htmlFor="noticeDate">Date of Notice <span>*</span></label><input id="noticeDate" required type="date" value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} /></div><div className="form-field form-field--full"><label>Photo of Notice <span>*</span></label><div className="notice-upload"><Icon name="upload" /><span>{noticePhoto ? noticePhoto.name : "Upload or capture the notice photograph"}</span><button type="button" className="secondary-button" onClick={() => noticeInputRef.current?.click()}>{noticePhoto ? "Replace Photo" : "Choose Photo"}</button><input ref={noticeInputRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => setNoticePhoto(event.target.files?.[0] ?? null)} /></div></div></div></div>}
        </section>

        <div className="inspection-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>Cancel</button><button type="submit" className="primary-button">Register Inspection <Icon name="arrow" /></button></div>
      </form>
    </div>
  );
}

export default FieldInspectionPage;
