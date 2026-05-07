const { CustomField, CustomFieldValue } = require('../models');
const AppError = require('../utils/errors');

const getActiveCustomFields = async ({ eventEditionId, appliesTo, transaction }) =>
  CustomField.findAll({
    where: {
      eventEditionId,
      appliesTo,
      isActive: true,
    },
    order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    transaction,
  });

const saveCustomFieldValues = async ({ eventEditionId, appliesTo, values = [], entityIds = {}, transaction }) => {
  if (!values.length) {
    return [];
  }

  const customFields = await getActiveCustomFields({ eventEditionId, appliesTo, transaction });
  const fieldsById = new Map(customFields.map((field) => [field.id, field]));

  for (const field of customFields) {
    if (field.isRequired) {
      const submitted = values.find((value) => Number(value.customFieldId) === field.id);
      if (!submitted || submitted.value === undefined || submitted.value === null || submitted.value === '') {
        throw new AppError(`Custom field "${field.label}" is required.`, 400);
      }
    }
  }

  const saved = [];
  for (const item of values) {
    const customField = fieldsById.get(Number(item.customFieldId));
    if (!customField) {
      throw new AppError(`Custom field ${item.customFieldId} is not active for this event.`, 400);
    }

    const where = {
      customFieldId: customField.id,
      userId: entityIds.userId || null,
      registrationId: entityIds.registrationId || null,
      articleId: entityIds.articleId || null,
    };

    const [record] = await CustomFieldValue.findOrCreate({
      where,
      defaults: {
        ...where,
        value: String(item.value ?? ''),
      },
      transaction,
    });

    if (!record.isNewRecord) {
      await record.update({ value: String(item.value ?? '') }, { transaction });
    }

    saved.push(record);
  }

  return saved;
};

module.exports = {
  getActiveCustomFields,
  saveCustomFieldValues,
};
