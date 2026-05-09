const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { initModels, User, EventEdition, PricingRule, Country, DollarRate, CustomField } = require('../models');
const { USER_ROLES, PARTICIPANT_TYPES, MEMBER_TYPES } = require('../constants/enums');

const seedCountries = async () => {
  const countries = [
    { name: 'Colombia', code: 'CO' },
    { name: 'United States', code: 'US' },
    { name: 'Mexico', code: 'MX' },
  ];

  for (const country of countries) {
    await Country.findOrCreate({
      where: { code: country.code },
      defaults: country,
    });
  }

  return Country.findOne({ where: { code: 'CO' } });
};

const seedDollarRate = async () => {
  await DollarRate.findOrCreate({
    where: { effectiveDate: '2026-05-01' },
    defaults: {
      rate: 3900,
      effectiveDate: '2026-05-01',
    },
  });
};

const seedAdminUser = async (countryId) => {
  const [adminUser, created] = await User.findOrCreate({
    where: { email: 'admin@ieee-platform.com' },
    defaults: {
      firstName: 'Platform',
      lastName: 'Admin',
      email: 'admin@ieee-platform.com',
      passwordHash: await bcrypt.hash('Admin12345!', 10),
      countryId,
      city: 'Bogota',
      address: 'Admin office',
      birthDate: '1990-01-01',
      gender: 'female',
      docType: 'CC',
      docNumber: '1000000000',
      affiliation: 'IEEE',
      phoneNumber: '+57 3000000000',
      occupation: 'Administrator',
      role: USER_ROLES.ADMIN,
    },
  });

  return { adminUser, created };
};

const seedEventEdition = async () => {
  const [eventEdition] = await EventEdition.findOrCreate({
    where: { year: 2026 },
    defaults: {
      name: 'IEEE Conference 2026',
      year: 2026,
      location: 'Bogota, Colombia',
      currency: 'USD',
      isActive: true,
    },
  });

  await EventEdition.update({ isActive: false }, { where: { id: { [Op.ne]: eventEdition.id } } });
  await eventEdition.update({ isActive: true });
  return eventEdition;
};

const buildPricingRules = (eventEditionId) => [
  {
    eventEditionId,
    name: 'R1 – IEEE TEMS Member Author',
    participationType: PARTICIPANT_TYPES.AUTHOR,
    memberType: MEMBER_TYPES.PROFESSIONAL,
    isIeeeMember: true,
    isTems: true,
    baseAmount: 350,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'R2 – IEEE Member Author',
    participationType: PARTICIPANT_TYPES.AUTHOR,
    memberType: MEMBER_TYPES.PROFESSIONAL,
    isIeeeMember: true,
    isTems: false,
    baseAmount: 400,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'R3 – Non-IEEE Member Author',
    participationType: PARTICIPANT_TYPES.AUTHOR,
    memberType: MEMBER_TYPES.PROFESSIONAL,
    isIeeeMember: false,
    isTems: false,
    baseAmount: 450,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'R4 – IEEE Member Attendee',
    participationType: PARTICIPANT_TYPES.ATTENDEE,
    memberType: MEMBER_TYPES.PROFESSIONAL,
    isIeeeMember: true,
    isTems: false,
    baseAmount: 200,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'R5 – Student Attendee (Non-IEEE)',
    participationType: PARTICIPANT_TYPES.ATTENDEE,
    memberType: MEMBER_TYPES.STUDENT,
    isIeeeMember: false,
    isTems: false,
    baseAmount: 200,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'R6 – Attendee (Non-IEEE Member)',
    participationType: PARTICIPANT_TYPES.ATTENDEE,
    memberType: MEMBER_TYPES.PROFESSIONAL,
    isIeeeMember: false,
    isTems: false,
    baseAmount: 250,
    startsAt: '2026-05-05',
    endsAt: '2026-05-08',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'Additional Paper',
    participationType: PARTICIPANT_TYPES.AUTHOR,
    memberType: null,
    isIeeeMember: false,
    isTems: false,
    baseAmount: 150,
    startsAt: '2026-01-01',
    endsAt: '2026-12-31',
    isActive: true,
  },
  {
    eventEditionId,
    name: 'Additional Page',
    participationType: PARTICIPANT_TYPES.AUTHOR,
    memberType: null,
    isIeeeMember: false,
    isTems: false,
    baseAmount: 80,
    startsAt: '2026-01-01',
    endsAt: '2026-12-31',
    isActive: true,
  },
];

const seedPricingRules = async (eventEditionId) => {
  const rules = buildPricingRules(eventEditionId);
  for (const rule of rules) {
    await PricingRule.findOrCreate({
      where: {
        eventEditionId: rule.eventEditionId,
        name: rule.name,
        participationType: rule.participationType,
        memberType: rule.memberType,
        isIeeeMember: rule.isIeeeMember,
        isTems: rule.isTems,
      },
      defaults: rule,
    });
  }
};

const seedCustomFields = async (eventEditionId) => {
  const fields = [
    {
      eventEditionId,
      fieldKey: 'dietary_requirements',
      label: 'Dietary Requirements',
      fieldType: 'textarea',
      isRequired: false,
      optionsJson: null,
      displayOrder: 1,
      appliesTo: 'registration',
      isActive: true,
    },
    {
      eventEditionId,
      fieldKey: 'orcid',
      label: 'ORCID',
      fieldType: 'text',
      isRequired: false,
      optionsJson: null,
      displayOrder: 1,
      appliesTo: 'user',
      isActive: true,
    },
  ];

  for (const field of fields) {
    await CustomField.findOrCreate({
      where: { fieldKey: field.fieldKey },
      defaults: field,
    });
  }
};

const runSeeder = async () => {
  try {
    initModels();
    await sequelize.authenticate();
    await sequelize.sync();

    const country = await seedCountries();
    await seedDollarRate();
    const { created } = await seedAdminUser(country.id);
    const eventEdition = await seedEventEdition();
    await seedPricingRules(eventEdition.id);
    await seedCustomFields(eventEdition.id);

    console.log(created ? 'Admin user created.' : 'Admin user already exists.');
    console.log(`Active event edition: ${eventEdition.name}`);
    console.log(`Default country seeded: ${country.name}`);
    console.log('Pricing rules seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

runSeeder();
