export function normalizeAuthUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
    organization: user.affiliation || '',
    countryId: user.countryId || null,
    country: user.country || null,
  };
}

export function normalizeBackendRegistration({ registration, paymentSummary, papers = [] }) {
  const registrationPapers = papers.length ? papers : registration?.papers || [];

  return {
    ...registration,
    participantType: registration?.participationType,
    papers: registrationPapers,
    paymentStatus: paymentSummary?.paymentStatus || registration?.paymentStatus,
    pricing: {
      total: Number(paymentSummary?.totalAmount || registration?.totalAmount || 0),
      paid: Number(paymentSummary?.paidAmount || registration?.paidAmount || 0),
      balance: Number(paymentSummary?.pendingAmount || registration?.pendingAmount || 0),
      breakdown: paymentSummary || null,
    },
  };
}

export function toCustomFieldValues(fields, valuesById) {
  return fields
    .map((field) => ({
      customFieldId: field.id,
      value: valuesById[field.id],
    }))
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
}
