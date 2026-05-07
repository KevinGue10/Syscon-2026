const asyncHandler = require('../utils/asyncHandler');
const { Country, EventEdition, CustomField } = require('../models');
const { sendSuccess } = require('../utils/responseContract');

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

module.exports = {
  listCountries,
  listEventEditions,
  listCustomFields,
};
