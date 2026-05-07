export function translateParticipationType(value) {
  const map = {
    attendee: 'Asistente',
    author: 'Autor',
  };

  return map[value] || value || 'No registrado';
}

export function translateAttendanceType(value) {
  const map = {
    in_person: 'Presencial',
    virtual: 'Virtual',
  };

  return map[value] || value || 'No registrado';
}

export function translateMemberType(value) {
  const map = {
    ieee_member: 'Miembro IEEE',
    non_ieee_member: 'No miembro IEEE',
    student: 'Estudiante',
    professional: 'Profesional',
  };

  return map[value] || value || 'No registrado';
}

export function translateRegistrationStatus(value) {
  const map = {
    draft: 'Borrador',
    submitted: 'Enviada',
    confirmed: 'Confirmada',
  };

  return map[value] || value || 'No registrado';
}

export function translatePaymentStatus(value) {
  const map = {
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagado',
    cancelled: 'Cancelado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    Partial: 'Parcial',
    Paid: 'Pagado',
    Pending: 'Pendiente',
  };

  return map[value] || value || 'No registrado';
}

export function translateGender(value) {
  const map = {
    female: 'Femenino',
    Female: 'Femenino',
    male: 'Masculino',
    Male: 'Masculino',
    other: 'Otro',
    Other: 'Otro',
  };

  return map[value] || value || 'No registrado';
}

export function translateDocumentType(value) {
  const map = {
    CC: 'Cedula de ciudadania',
    CE: 'Cedula de extranjeria',
    TI: 'Tarjeta de identidad',
    PP: 'Pasaporte',
  };

  return map[value] || value || 'No registrado';
}

export function translateOccupation(value) {
  const map = {
    professional: 'Profesional',
    Professional: 'Profesional',
    student: 'Estudiante',
    Student: 'Estudiante',
    engineer: 'Ingeniero',
    Engineer: 'Ingeniero',
  };

  return map[value] || value || 'No registrado';
}
