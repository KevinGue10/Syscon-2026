export const participantTypes = [
  {
    id: 'attendee',
    title: "Attendee",
    description: "General participation in sessions, networking and the conference program.",
  },
  {
    id: 'author',
    title: "Author",
    description: "Registration for authors, including papers and a payment summary.",
  },
];

export const registrationSteps = [
  "Account",
  "Registration",
  "Papers",
  "Summary",
];

export const attendanceTypes = [
  { value: 'in_person', label: "In person" },
  { value: 'virtual', label: 'Virtual' },
];

export const occupationTypes = [
  { value: 'professional', label: "Professional" },
  { value: 'student', label: "Student" },
];

export const genderOptions = [
  { value: 'female', label: "Female" },
  { value: 'male', label: "Male" },
  { value: 'other', label: "Other" },
];

export const documentTypeOptions = [
  { value: 'CC', label: "Colombian citizenship ID" },
  { value: 'CE', label: "Foreign resident ID" },
  { value: 'TI', label: "Identity card" },
  { value: 'PP', label: "Passport" },
];
