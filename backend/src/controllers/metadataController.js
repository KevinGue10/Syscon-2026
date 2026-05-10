const asyncHandler = require('../utils/asyncHandler');
const { Country, EventEdition, CustomField } = require('../models');
const { sendSuccess } = require('../utils/responseContract');
const env = require('../config/env');

const listCountries = asyncHandler(async (req, res) => {
  const countries = await Country.findAll({ order: [['name', 'ASC']] });
  return sendSuccess(res, {
    message: 'Países obtenidos correctamente.',
    data: { countries },
  });
});

const listEventEditions = asyncHandler(async (req, res) => {
  const eventEditions = await EventEdition.findAll({
    where: req.query.onlyActive === 'true' ? { isActive: true } : undefined,
    order: [['year', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Ediciones del evento obtenidas correctamente.',
    data: { eventEditions },
  });
});

const listCustomFields = asyncHandler(async (req, res) => {
  const where = { isActive: true };
  if (req.query.eventEditionId) {
    where.eventEditionId = Number(req.query.eventEditionId);
  }
  if (req.query.appliesTo) {
    where.appliesTo = req.query.appliesTo;
  }

  const customFields = await CustomField.findAll({
    where,
    order: [['displayOrder', 'ASC'], ['id', 'ASC']],
  });
  return sendSuccess(res, {
    message: 'Campos personalizados obtenidos correctamente.',
    data: { customFields },
  });
});

const getBankTransferDetails = asyncHandler(async (req, res) => {
  const bankTransferDetails = Object.entries(env.bankTransfer).reduce((accumulator, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});

  return sendSuccess(res, {
    message: 'Datos bancarios obtenidos correctamente.',
    data: {
      bankTransferDetails,
      isConfigured: Object.keys(bankTransferDetails).length > 0,
    },
  });
});

module.exports = {
  listCountries,
  listEventEditions,
  listCustomFields,
  getBankTransferDetails,
};
