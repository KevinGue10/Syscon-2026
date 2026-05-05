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
  { value: 'CC', label: 'Cedula de ciudadania' },
  { value: 'CE', label: 'Cedula de extranjeria' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PP', label: 'Pasaporte' },
];
