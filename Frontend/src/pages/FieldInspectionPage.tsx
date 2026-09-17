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
type ComplaintLookup = {
  complaintId: string;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedAtpId?: string | null;
  assignedAtpName?: string | null;
  block: string;
  zone: string;
  ward?: string;
  address: string;
};

const getApiBaseUrl = () => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
  return base.replace(/\/$/, "");
};

const OFFICERS_API_URL = `${getApiBaseUrl()}/officers/roster`;
const INSPECTIONS_API_URL = `${getApiBaseUrl()}/inspections`;
const COMPLAINTS_API_URL = `${getApiBaseUrl()}/complaints`;

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
  const [complaintLookup, setComplaintLookup] = useState<ComplaintLookup | null>(null);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [complaintError, setComplaintError] = useState("");
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
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const photoUploadInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (sourceOfReport !== "complaint") {
      return;
    }

    const id = complaintId.trim();
    if (!id) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setComplaintLoading(true);
      setComplaintError("");
      try {
        const response = await fetch(`${COMPLAINTS_API_URL}/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        const result = await response.json() as { success?: boolean; complaint?: ComplaintLookup; message?: string };
        if (!response.ok || !result.success || !result.complaint) {
          throw new Error(result.message || "Complaint not found.");
        }

        const complaint = result.complaint;
        setComplaintLookup(complaint);
        setReportingOfficer(complaint.assignedOfficerId ?? "");
        setBlock(complaint.block);
        setWard(complaint.ward ?? "");
        setLocation(complaint.address);
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setComplaintLookup(null);
        setComplaintError(reason instanceof Error ? reason.message : "Unable to load complaint.");
      } finally {
        if (!controller.signal.aborted) setComplaintLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [complaintId, sourceOfReport]);

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
    const mappedAtp = officers.find(
      (officer) =>
        officer.designation.trim().toUpperCase() === "ATP" &&
        normalise(officer.zone) === normalise(zone) &&
        officer.blocks.some((officerBlock) => normalise(officerBlock) === selectedBlock),
    );
    if (mappedAtp) return mappedAtp;
    if (complaintLookup?.assignedAtpName) {
      return {
        officerId: complaintLookup.assignedAtpId ?? "complaint-atp",
        name: complaintLookup.assignedAtpName,
        mobile: "",
        designation: "ATP",
        zone: complaintLookup.zone,
        blocks: [complaintLookup.block],
      };
    }
    return undefined;
  }, [block, complaintLookup, officers, zone]);
  const isComplaintMode = sourceOfReport === "complaint";

  const handleSourceChange = (value: "complaint" | "field_visit") => {
    setSourceOfReport(value);
    setSubmitError("");
    if (value === "field_visit") {
      setInspectionOutcome("violation_found");
      setNoticeOpen(true);
      setComplaintId("");
      setComplaintLookup(null);
      setComplaintError("");
      setReportingOfficer("");
      setBlock("");
      setWard("");
      setLocation("");
    } else {
      setInspectionOutcome("");
      setNoticeNumber("");
      setNoticeDate("");
      setNoticePhoto(null);
      setNoticeOpen(false);
    }
  };

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

  const effectiveInspectionOutcome =
    sourceOfReport === "field_visit"
      ? "violation_found"
      : inspectionOutcome;
  setInspectionOutcome(effectiveInspectionOutcome);

  /*
   * Client-side validation.
   *
   * The backend performs the authoritative validation
   * again, so these checks are only for user feedback.
   */

  if (!effectiveInspectionOutcome) {
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

  if (effectiveInspectionOutcome === "violation_found" && (
    !noticeNumber.trim() ||
    !noticeDate ||
    !noticePhoto
  )) {
    setSubmitError(
      "Notice number, notice date and notice photo are required when a violation is found.",
    );
    setNoticeOpen(true);
    return;
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
      effectiveInspectionOutcome,
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
    if (effectiveInspectionOutcome === "violation_found" && noticePhoto) {
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
      <form className="field-inspection-form compact-form" onSubmit={submitInspection}>
        <section className="inspection-card">
          <div className="inspection-card__header">
            <span className="inspection-card__number">01</span>
            <h2>Report Information</h2>
          </div>
          <div className="inspection-grid">
            <div className="form-field form-field--full">
              <label>Source of Report <span>*</span></label>
              <div className="choice-grid choice-grid--inline compact-choice-grid">
                {(["complaint", "field_visit"] as const).map((value) => (
                  <label className={`choice-card choice-card--compact ${sourceOfReport === value ? "choice-card--selected" : ""}`} key={value}>
                    <input type="radio" name="sourceOfReport" value={value} checked={sourceOfReport === value} onChange={() => handleSourceChange(value)} />
                    <span><strong>{value === "complaint" ? "Complaint Based" : "Field Visit"}</strong></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="reportingOfficer">Reporting Officer <span>*</span></label>
              <select id="reportingOfficer" required value={reportingOfficer} onChange={(event) => { setReportingOfficer(event.target.value); setBlock(""); }} disabled={isComplaintMode || officersLoading || Boolean(officersError)}>
                <option value="">{officersLoading ? "Loading officers..." : "Select officer"}</option>
                {officers.filter(isBiOfficer).map((officer) => <option key={officer.officerId} value={officer.officerId}>{officer.name}</option>)}
              </select>
              {officersError && <small className="field-error">{officersError}</small>}
            </div>

            {sourceOfReport === "complaint" && (
              <div className="form-field">
                <label htmlFor="complaintId">Complaint ID <span>*</span></label>
                <input
                  id="complaintId"
                  required={sourceOfReport === "complaint"}
                  value={complaintId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setComplaintId(value);
                    if (!value.trim()) {
                      setComplaintLookup(null);
                      setComplaintError("");
                    }
                  }}
                  placeholder="Enter complaint ID"
                  inputMode="numeric"
                  maxLength={14}
                />
                {complaintLoading && <small>Loading complaint details...</small>}
                {complaintError && <small className="field-error">{complaintError}</small>}
                {complaintLookup && <small className="field-success">Complaint details loaded.</small>}
              </div>
            )}

            <div className="form-field">
              <label>Supervising ATP</label>
              <div className={`atp-card ${!supervisingAtp ? "atp-card--empty" : ""}`}>
                <Icon name="user" />
                {supervisingAtp ? <div><strong>{supervisingAtp.name}</strong><span>{supervisingAtp.designation}</span></div> : <div><strong>{block ? "No ATP mapped" : "Select a block"}</strong></div>}
              </div>
            </div>
          </div>
        </section>

        <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">02</span><h2>Location</h2></div>
          <div className="inspection-grid">
            <div className="form-field"><label htmlFor="block">Block <span>*</span></label>            <select id="block" required value={block} onChange={(event) => setBlock(event.target.value)} disabled={isComplaintMode || !selectedReportingOfficer}><option value="">{selectedReportingOfficer ? "Select block" : "Select officer first"}</option>{availableBlocks.map((entry) => <option value={entry.block} key={entry.block}>{entry.block}</option>)}</select></div>
            <div className="form-field"><label htmlFor="zone">Zone</label><div id="zone" className="derived-field"><Icon name="map" />{complaintLookup?.zone || zone || "Auto"}</div></div>
            <div className="form-field"><label htmlFor="ward">Ward <em>Optional</em></label><input id="ward" readOnly={isComplaintMode} value={ward} onChange={(event) => setWard(event.target.value)} placeholder="Ward" /></div>
            <div className="form-field form-field--wide"><label htmlFor="location">Address / Landmark <span>*</span></label><input id="location" readOnly={isComplaintMode} required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter location" /></div>
            <div className="form-field form-field--full"><label>GPS Location <span>*</span></label><div className={`location-capture ${coordinates ? "location-capture--success" : ""}`}><div className="location-capture__icon"><Icon name="map" /></div><div className="location-capture__content"><strong>{coordinates ? "Location captured" : "GPS not captured"}</strong>{coordinates ? <span>Lat {coordinates.latitude.toFixed(5)} · Long {coordinates.longitude.toFixed(5)}</span> : <span>Capture site location</span>}</div><button type="button" className="secondary-button" onClick={captureLocation} disabled={locationLoading}>{locationLoading ? "Capturing..." : coordinates ? "Recapture" : "Capture Location"}</button></div>{locationError && <small className="field-error">{locationError}</small>}</div>
          </div>
        </section>

        {isComplaintMode && <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">03</span><h2>Inspection Outcome</h2></div>
          <div className="form-field form-field--full">
            <div className="choice-grid choice-grid--inline compact-choice-grid">
              <label className={`choice-card choice-card--compact ${inspectionOutcome === "no_violation" ? "choice-card--selected" : ""}`}>
                <input type="radio" name="inspectionOutcome" value="no_violation" checked={inspectionOutcome === "no_violation"} onChange={() => handleOutcomeChange("no_violation")} />
                <span><strong>No Violation</strong></span>
              </label>
              <label className={`choice-card choice-card--compact ${inspectionOutcome === "violation_found" ? "choice-card--selected" : ""}`}>
                <input type="radio" name="inspectionOutcome" value="violation_found" checked={inspectionOutcome === "violation_found"} onChange={() => handleOutcomeChange("violation_found")} />
                <span><strong>Violation Found</strong></span>
              </label>
            </div>
          </div>
        </section>}
        <section className="inspection-card">
          <div className="inspection-card__header compact-header"><span className="inspection-card__number">{isComplaintMode ? "04" : "03"}</span><h2>Details</h2></div>
          <div className="inspection-grid">
            <div className="form-field form-field--full"><label>Building Type <span>*</span></label><div className="building-type-grid">{["Residential", "Commercial", "Industrial", "Other"].map((type) => <label className={`building-type ${buildingType === type ? "building-type--selected" : ""}`} key={type}><input type="radio" name="buildingType" value={type} required checked={buildingType === type} onChange={(event) => setBuildingType(event.target.value)} /><span>{type}</span></label>)}</div></div>
            {buildingType === "Other" && <div className="form-field form-field--full"><label htmlFor="otherBuildingType">Specify Building Type <span>*</span></label><input id="otherBuildingType" required value={otherBuildingType} onChange={(event) => setOtherBuildingType(event.target.value)} placeholder="Enter building type" /></div>}
            <div className="form-field"><label htmlFor="violatorName">Violator Name <span>*</span></label><input id="violatorName" required value={violatorName} onChange={(event) => setViolatorName(event.target.value)} placeholder="Enter name" /></div>
            <div className="form-field"><label htmlFor="mobileNumber">Mobile Number <em>Optional</em></label><input id="mobileNumber" type="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="Enter number" /></div>
            <div className="form-field form-field--full"><label htmlFor="description">Description <span>*</span></label><textarea id="description" required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the violation" /></div>
          </div>
        </section>

        <section className="inspection-card">
          <div className="inspection-card__header"><span className="inspection-card__number">05</span><h2>Evidence</h2></div>
          <div className="form-field"><label>Photos <span>*</span></label><div className="photo-dropzone"><Icon name="upload" /><strong>Add photos</strong><div className="photo-dropzone__actions"><button type="button" className="secondary-button" onClick={() => photoCameraInputRef.current?.click()}>Capture</button><button type="button" className="secondary-button" onClick={() => photoUploadInputRef.current?.click()}>Upload</button></div><input ref={photoCameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={addPhotos} /><input ref={photoUploadInputRef} type="file" accept="image/*" multiple hidden onChange={addPhotos} /></div>{photos.length > 0 && <div className="photo-list">{photos.map((photo, index) => <div className="photo-item" key={`${photo.name}-${photo.lastModified}-${index}`}><img src={URL.createObjectURL(photo)} alt="" /><span>{photo.name}</span><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" /></button></div>)}</div>}</div>
        </section>

        {inspectionOutcome === "violation_found" && (
          <section className="notice-section">
            <button type="button" className="notice-section__header" onClick={() => setNoticeOpen((current) => !current)} aria-expanded={noticeOpen}>
              <span className="notice-section__icon"><Icon name="alert" /></span>
              <span><strong>Notice 270(1)</strong></span>
              <span className="notice-section__toggle">{noticeOpen ? "−" : "+"}</span>
            </button>
            {noticeOpen && <div className="notice-section__body">
              <div className="inspection-grid">
                <div className="form-field"><label htmlFor="noticeNumber">Notice Number <span>*</span></label><input id="noticeNumber" required value={noticeNumber} onChange={(event) => setNoticeNumber(event.target.value)} placeholder="Number" /></div>
                <div className="form-field"><label htmlFor="noticeDate">Date <span>*</span></label><input id="noticeDate" required type="date" value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} /></div>
                <div className="form-field form-field--full"><label>Notice Photo <span>*</span></label><div className="notice-upload"><Icon name="upload" /><span>{noticePhoto ? noticePhoto.name : "Upload photo"}</span><button type="button" className="secondary-button" onClick={() => noticeInputRef.current?.click()}>{noticePhoto ? "Replace" : "Choose"}</button><input ref={noticeInputRef} required={!noticePhoto} type="file" accept="image/*" capture="environment" hidden onChange={(event) => setNoticePhoto(event.target.files?.[0] ?? null)} /></div></div>
              </div>
            </div>}
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
