import {useEffect, useMemo, useRef, useState } from "react";
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

type InspectionOutcome = "no_violation" | "violation_found" | "";

const OFFICERS_API_URL = "http://localhost:5000/api/officers/roster";
const INSPECTIONS_API_URL = "http://localhost:5000/api/inspections";

const normalise = (value: string) =>
  value.replace(/^zone\s*/i, "").replace(/^block\s*/i, "").trim().toUpperCase();

const isBiOfficer = (officer: Officer) => {
  const designation = officer.designation.trim().toUpperCase();
  return designation === "BI" || designation.endsWith("-BI");
};

function FieldInspectionPage({ navigate }: FieldInspectionPageProps) {
  const [sourceOfReport, setSourceOfReport] = useState<"complaint" | "field_visit">("complaint");
  const [inspectionOutcome, setInspectionOutcome] = useState<"no_violation"|"violation_found"|"">("");
  const [complaintId, setComplaintId] = useState("");
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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const noticeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch(OFFICERS_API_URL)
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

  const handleOutcomeChange = (outcome: InspectionOutcome) => {
    setInspectionOutcome(outcome);
    setSubmitError("");
    if (outcome === "violation_found") {
      setNoticeOpen(true);
    } else {
      setNoticeNumber("");
      setNoticeDate("");
      setNoticePhoto(null);
      setNoticeOpen(false);
    }
  };

const submitInspection = async (
  event: FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();
  setSubmitError("");

  /*
   * Client-side validation.
   *
   * The backend performs the authoritative validation
   * again, so these checks are only for user feedback.
   */

  if (!inspectionOutcome) {
    setSubmitError(
      "Please select the inspection outcome.",
    );
    return;
  }

  if (!reportingOfficer) {
    setSubmitError(
      "Please select a reporting officer.",
    );
    return;
  }

  if(sourceOfReport === "complaint" && !complaintId.trim()) {
    setSubmitError(
      "Please enter the complaint ID.",
    );
    return;
  }

  if (!block) {
    setSubmitError(
      "Please select a block.",
    );
    return;
  }
  
  if (!zone) {
    setSubmitError(
      "Unable to determine the zone.",
    );
    return;
  }

  if (!location.trim()) {
    setSubmitError(
      "Please enter the inspection location.",
    );
    return;
  }

  if (!coordinates) {
    setSubmitError(
      "Please capture the GPS location before submitting.",
    );
    return;
  }

  if (!buildingType) {
    setSubmitError(
      "Please select a building type.",
    );
    return;
  }

  if (
    buildingType === "Other" &&
    !otherBuildingType.trim()
  ) {
    setSubmitError(
      "Please specify the building type.",
    );
    return;
  }

  if (!violatorName.trim()) {
    setSubmitError(
      "Please enter the violator name.",
    );
    return;
  }

  if (!description.trim()) {
    setSubmitError(
      "Please enter the inspection description/report.",
    );
    return;
  }

  if (photos.length === 0) {
    setSubmitError(
      "Please add at least one inspection evidence photo.",
    );
    return;
  };

  /*
   * Notice is optional and is only meaningful 
   * if viaolation found.
   *
   * But if the operator starts entering notice
   * information, all three fields are required.
   */
  const hasNoticeData =
    Boolean(
      noticeNumber.trim() ||
      noticeDate ||
      noticePhoto,
    );

  if (hasNoticeData) {
    if (inspectionOutcome !== "violation_found") {
      setSubmitError(
        "If you provide a Section 270 notice, notice number, date and notice photo are all required.",
      );
      return;
    }

    if (
      !noticeNumber.trim() ||
      !noticeDate ||
      !noticePhoto
    ) {
      setSubmitError(
        "If you provide a Section 270 notice, notice number, date and notice photo are all required.",
      );
      return;
    }
  }

  try {
    setSubmitting(true);

    const formData = new FormData();

    formData.append(
      "sourceOfReport",
      sourceOfReport,
    );

    formData.append(
      "inspectionOutcome",
      inspectionOutcome,
    );

    formData.append(
      "reportingOfficer",
      reportingOfficer,
    );

    if (sourceOfReport === "complaint") {
      formData.append(
        "complaintId",
        complaintId.trim(),
      );
    }

    formData.append(
      "block",
      block,
    );

    formData.append(
      "ward",
      ward.trim(),
    );

    formData.append(
      "location",
      location.trim(),
    );

    formData.append(
      "buildingType",
      buildingType,
    );

    if (buildingType === "Other") {
      formData.append(
        "otherBuildingType",
        otherBuildingType.trim(),
      );
    }

    formData.append(
      "violatorName",
      violatorName.trim(),
    );

    formData.append(
      "mobileNumber",
      mobileNumber.trim(),
    );

    formData.append(
      "description",
      description.trim(),
    );

    /*
     * GPS data.
     */
    formData.append(
      "latitude",
      String(coordinates.latitude),
    );

    formData.append(
      "longitude",
      String(coordinates.longitude),
    );

    formData.append(
      "accuracy",
      String(coordinates.accuracy),
    );

    formData.append(
      "capturedAt",
      coordinates.capturedAt,
    );

    /*
     * Inspection evidence.
     */
    photos.forEach((photo) => {
      formData.append(
        "inspectionPhotos",
        photo,
      );
    });

    // only send notice when it is complete and valid.
    if(hasNoticeData && noticePhoto) {
      formData.append(
        "noticeNumber",
        noticeNumber.trim(),
      );
      formData.append(
        "noticeDate",
        noticeDate,
      );
      formData.append(
        "noticePhoto",
        noticePhoto,
      );
    }

    const response = await fetch(INSPECTIONS_API_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          "Unable to register inspection.",
      );
    }

    /*
     * Successful submission.
     */
    navigate("/dashboard");

  } catch (error) {

    setSubmitError(
      error instanceof Error
        ? error.message
        : "Unable to register inspection.",
    );

  } finally {
    setSubmitting(false);
  }
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

            {sourceOfReport === "complaint" && (
              <div className="form-field">
                <label htmlFor="complaintId">
                  Complaint ID <span>*</span>
                </label>

                <input
                  id="complaintId"
                  required={sourceOfReport === "complaint"}
                  value={complaintId}
                  onChange={(event) =>
                    setComplaintId(event.target.value)
                  }
                  placeholder="Enter 14-digit complaint ID"
                  inputMode="numeric"
                  maxLength={14}
                />

                <small>
                  Enter the registered complaint ID that this
                  inspection is associated with.
                </small>
              </div>
            )}

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
          <div className="form-field form-field--full">
  <label>
    Inspection Outcome <span>*</span>
  </label>

  <div className="choice-grid choice-grid--inline">
    <label
      className={`choice-card choice-card--compact ${
        inspectionOutcome === "no_violation"
          ? "choice-card--selected"
          : ""
      }`}
    >
      <input
        type="radio"
        name="inspectionOutcome"
        value="no_violation"
        checked={inspectionOutcome === "no_violation"}
        onChange={() => handleOutcomeChange("no_violation")}
      />
      <span>
        <strong>No Violation Found</strong>
        <small>Site inspected and no violation was found.</small>
      </span>
    </label>

    <label
      className={`choice-card choice-card--compact ${
        inspectionOutcome === "violation_found"
          ? "choice-card--selected"
          : ""
      }`}
    >
      <input
        type="radio"
        name="inspectionOutcome"
        value="violation_found"
        checked={inspectionOutcome === "violation_found"}
        onChange={() => handleOutcomeChange("violation_found")}
      />
      <span>
        <strong>Violation Found</strong>
        <small>Violation found during the site inspection.</small>
      </span>
    </label>
  </div>
</div>
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

        {inspectionOutcome === "violation_found" && (
        <section className="notice-section">
          <button type="button" className="notice-section__header" onClick={() => setNoticeOpen((current) => !current)} aria-expanded={noticeOpen}><span className="notice-section__icon"><Icon name="alert" /></span><span><strong>NOTICE UNDER SECTION 270(1)</strong>
          <small>PMC ACT, 1976 · Optional - complete only if a notice has been issued.</small></span><span className="notice-section__toggle">{noticeOpen ? "−" : "+"}</span></button>
          {noticeOpen && <div className="notice-section__body"><p>Enter the statutory notice details and attach a clear photograph of the served notice.</p><div className="inspection-grid"><div className="form-field">
            <label htmlFor="noticeNumber">
              Notice Number 
              <em>Optional</em></label>
              <input id="noticeNumber" value={noticeNumber} onChange={
                (event) => setNoticeNumber(event.target.value)}
                placeholder="Enter notice number" />
                </div>
                
                <div className="form-field">
                  <label htmlFor="noticeDate">
                    Date of Notice 
                    <em>Optional</em>
                  </label>
                  <input id="noticeDate" type="date" value={noticeDate} onChange={
                    (event) => setNoticeDate(event.target.value)} />
                </div>
                
                <div className="form-field form-field--full">
                  <label>Photo of Notice 
                    <em>Optional</em>
                  </label>
                  <div className="notice-upload">
                    <Icon name="upload" />
                    <span>{noticePhoto ? noticePhoto.name :
                     "Upload or capture the notice photograph"}
                    </span>
                    <button type="button" className="secondary-button" onClick=
                    {() => 
                       noticeInputRef.current?.click()
                      }>{noticePhoto ? "Replace Photo" : "Choose Photo"}
                      </button>
                      <input ref={noticeInputRef} 
                      type="file" accept="image/*" 
                      capture="environment" hidden onChange={(event) => 
                      setNoticePhoto(event.target.files?.[0] ?? null)} />
                </div>
                </div>
                </div>
              </div>
          }
        </section>
        )}

       <div className="inspection-actions">
          {submitError && (
            <div
              className="field-error"
              role="alert"
              style={{ marginRight: "auto" }}
            >
              {submitError}
            </div>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting
              ? "Registering..."
              : "Register Inspection"}

            {!submitting && <Icon name="arrow" />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FieldInspectionPage;
