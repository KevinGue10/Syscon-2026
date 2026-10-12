export function translateParticipationType(value) {
  const map = {
    attendee: "Attendee",
    author: "Author",
  };

  return map[value] || value || "Not provided";
}

export function translateAttendanceType(value) {
  const map = {
    in_person: "In person",
    virtual: 'Virtual',
  };

  return map[value] || value || "Not provided";
}

export function translateMemberType(value) {
  const map = {
    ieee_member: "IEEE member",
    non_ieee_member: "Non-IEEE member",
    student: "Student",
    professional: "Professional",
  };

  return map[value] || value || "Not provided";
}

export function translateRegistrationStatus(value) {
  const map = {
    draft: "Draft",
    submitted: "Submitted",
    confirmed: "Confirmed",
  };

  return map[value] || value || "Not provided";
}

export function translatePaymentStatus(value) {
  const map = {
    pending_link: "Awaiting payment link",
    pending_payment: "Awaiting payment",
    pending_validation: "Pending review",
    pending: "Pending",
    partial: "Partial",
    paid: "Paid",
    cancelled: "Cancelled",
    approved: "Approved",
    rejected: "Rejected",
    pendingLink: "Awaiting payment link",
    pendingPayment: "Awaiting payment",
    pendingValidation: "Pending review",
    Partial: "Partial",
    Paid: "Paid",
    Pending: "Pending",
  };

  return map[value] || value || "Not provided";
}

export function translateGender(value) {
  const map = {
    female: "Female",
    Female: "Female",
    male: "Male",
    Male: "Male",
    other: "Other",
    Other: "Other",
  };

  return map[value] || value || "Not provided";
}

export function translateDocumentType(value) {
  const map = {
    CC: "Colombian citizenship ID",
    CE: "Foreign resident ID",
    TI: "Identity card",
    PP: "Passport",
  };

  return map[value] || value || "Not provided";
}

export function translateOccupation(value) {
  const map = {
    professional: "Professional",
    Professional: "Professional",
    student: "Student",
    Student: "Student",
    engineer: "Engineer",
    Engineer: "Engineer",
  };

  return map[value] || value || "Not provided";
}
