import { findResponsibleOfficer } from "./services/officerMapping.js";

const test = async () => {
  const officer = await findResponsibleOfficer(
    "Zone 2",
    "Unknown Block"
  );

  console.log("Mapped officer:", officer);
};

test();