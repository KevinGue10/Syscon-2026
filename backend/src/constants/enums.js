const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

const PARTICIPANT_TYPES = {
  ATTENDEE: 'attendee',
  AUTHOR: 'author',
};

const ATTENDANCE_TYPES = {
  IN_PERSON: 'in_person',
  VIRTUAL: 'virtual',
};

const MEMBER_TYPES = {
  IEEE_MEMBER: 'ieee_member',
  NON_IEEE_MEMBER: 'non_ieee_member',
  STUDENT: 'student',
  PROFESSIONAL: 'professional',
};

const REGISTRATION_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
};

const PAYMENT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REFUNDED: 'refunded',
};

const REGISTRATION_PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

const PAPER_STATUSES = {
  REGISTERED: 'registered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const CUSTOM_FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  EMAIL: 'email',
  TEXTAREA: 'textarea',
};

const CUSTOM_FIELD_APPLIES_TO = {
  USER: 'user',
  REGISTRATION: 'registration',
  ARTICLE: 'article',
};

const EMAIL_LOG_STATUSES = {
  SENT: 'sent',
  FAILED: 'failed',
};

const GENDERS = {
  FEMALE: 'female',
  MALE: 'male',
  OTHER: 'other',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
};

const DOCUMENT_TYPES = {
  CC: 'CC',
  CE: 'CE',
  TI: 'TI',
  PASSPORT: 'PASSPORT',
  DNI: 'DNI',
  NIT: 'NIT',
};

module.exports = {
  USER_ROLES,
  PARTICIPANT_TYPES,
  ATTENDANCE_TYPES,
  MEMBER_TYPES,
  REGISTRATION_STATUSES,
  PAYMENT_STATUSES,
  REGISTRATION_PAYMENT_STATUSES,
  PAPER_STATUSES,
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_APPLIES_TO,
  EMAIL_LOG_STATUSES,
  GENDERS,
  DOCUMENT_TYPES,
};
