export const participantTypes = [
  {
    id: 'attendee',
    title: 'Asistente',
    description: 'Participacion general en sesiones, networking y agenda de conferencia.',
  },
  {
    id: 'author',
    title: 'Autor',
    description: 'Registro para autores con carga de articulos y resumen de pago posterior.',
  },
];

export const registrationSteps = [
  'Cuenta',
  'Inscripcion',
  'Articulos',
  'Resumen',
];

export const attendanceTypes = [
  { value: 'in_person', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
];

export const memberTypes = [
  { value: 'ieee_member', label: 'Miembro IEEE' },
  { value: 'non_ieee_member', label: 'No miembro IEEE' },
  { value: 'student', label: 'Estudiante' },
  { value: 'professional', label: 'Profesional' },
];
