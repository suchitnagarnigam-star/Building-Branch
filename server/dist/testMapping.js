"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const officerMapping_js_1 = require("./services/officerMapping.js");
const test = async () => {
    const officer = await (0, officerMapping_js_1.findResponsibleOfficer)("Zone 2", "Unknown Block");
    console.log("Mapped officer:", officer);
};
test();
