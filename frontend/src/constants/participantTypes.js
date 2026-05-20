export const participantTypes = [
  {
    id: 'attendee',
    title: 'Asistente',
    description: 'Participación general en sesiones, networking y agenda de conferencia.',
  },
  {
    id: 'author',
    title: 'Autor',
    description: 'Registro para autores con carga de artículos y resumen de pago posterior.',
  },
];

export const registrationSteps = [
  'Cuenta',
  'Inscripción',
  'Artículos',
  'Resumen',
];

export const attendanceTypes = [
  { value: 'in_person', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
];

export const occupationTypes = [
  { value: 'professional', label: 'Profesional' },
  { value: 'student', label: 'Estudiante' },
];

export const genderOptions = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
];

export const documentTypeOptions = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PP', label: 'Pasaporte' },
];
