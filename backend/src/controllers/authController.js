const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, EventEdition } = require('../models');
const { signToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { createAuditLog } = require('../services/auditService');
const { saveCustomFieldValues } = require('../services/customFieldService');
const { ensureUserIsActive } = require('../services/userService');
const { sendSuccess } = require('../utils/responseContract');

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const NUMBER_CHARS = '23456789';
const SYMBOL_CHARS = '!@#$%*?';
const PASSWORD_CHARSET = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${NUMBER_CHARS}${SYMBOL_CHARS}`;

const getRandomChar = (charset) => charset[crypto.randomInt(0, charset.length)];

const dispatchEmailInBackground = (task, label) => {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`${label} failed:`, error.message);
    });
};

const shuffleString = (value) => {
  const chars = value.split('');

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
};

const generateSecureTemporaryPassword = (length = 16) => {
  const normalizedLength = Math.max(length, 12);
  const requiredChars = [
    getRandomChar(UPPERCASE_CHARS),
    getRandomChar(LOWERCASE_CHARS),
    getRandomChar(NUMBER_CHARS),
    getRandomChar(SYMBOL_CHARS),
  ];

  while (requiredChars.length < normalizedLength) {
    requiredChars.push(getRandomChar(PASSWORD_CHARSET));
  }

  return shuffleString(requiredChars.join(''));
};

const register = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ where: { email: req.body.email.toLowerCase() } });
  if (existingUser) {
    throw new AppError('Revisa los campos marcados.', 409, [
      { field: 'email', message: 'El correo ya se encuentra registrado.' },
    ]);
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email.toLowerCase(),
    passwordHash,
    countryId: req.body.countryId,
    city: req.body.city,
    address: req.body.address || null,
    birthDate: req.body.birthDate || null,
    gender: req.body.gender || null,
    docType: req.body.docType || null,
    docNumber: req.body.docNumber || null,
    affiliation: req.body.affiliation,
    phoneNumber: req.body.phoneNumber,
    occupation: req.body.occupation || null,
    active: true,
  });

  const activeEventEdition = await EventEdition.findOne({ where: { isActive: true } });
  if (activeEventEdition) {
    await saveCustomFieldValues({
      eventEditionId: activeEventEdition.id,
      appliesTo: 'user',
      values: req.body.customFieldValues || [],
      entityIds: { userId: user.id },
    });
  }

  const token = signToken({ userId: user.id, role: user.role });
  await createAuditLog({
    userId: user.id,
    action: 'register',
    entity: 'user',
    entityId: user.id,
    newValue: sanitizeUser(user),
  });
  dispatchEmailInBackground(
    () => sendWelcomeEmail(user),
    'Welcome email'
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Cuenta creada correctamente.',
    data: {
      token,
      user: sanitizeUser(user),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email.toLowerCase() } });
  if (!user) {
    throw new AppError('Credenciales invalidas.', 401);
  }

  ensureUserIsActive(user, 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.');

  const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Credenciales invalidas.', 401);
  }

  const token = signToken({ userId: user.id, role: user.role });
  return sendSuccess(res, {
    message: 'Inicio de sesion correcto.',
    data: {
      token,
      user: sanitizeUser(user),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: 'Usuario obtenido correctamente.',
    data: {
      user: sanitizeUser(req.user),
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return sendSuccess(res, {
      message: 'Si el correo existe, se enviara una contrasena provisional.',
      data: {},
    });
  }

  ensureUserIsActive(user, 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.');

  const provisionalPassword = generateSecureTemporaryPassword();
  const passwordHash = await bcrypt.hash(provisionalPassword, 10);
  await user.update({ passwordHash });

  const emailResult = await sendPasswordResetEmail({
    user,
    provisionalPassword,
  });

  if (emailResult?.skipped || emailResult?.error) {
    throw new AppError(
      'No fue posible enviar el correo de restablecimiento. Verifica la configuracion SMTP.',
      503
    );
  }

  await createAuditLog({
    userId: user.id,
    action: 'forgot-password',
    entity: 'user',
    entityId: user.id,
    newValue: { passwordResetAt: new Date().toISOString() },
  });

  return sendSuccess(res, {
    message: 'Si el correo existe, se enviara una contrasena provisional.',
    data: {},
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;
  ensureUserIsActive(user, 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.');

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new AppError('Revisa los campos marcados.', 400, [
      { field: 'currentPassword', message: 'La contrasena actual no es correcta.' },
    ]);
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new AppError('Revisa los campos marcados.', 400, [
      { field: 'newPassword', message: 'La nueva contrasena no puede ser igual a la actual.' },
    ]);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash });

  await createAuditLog({
    userId: user.id,
    action: 'change-password',
    entity: 'user',
    entityId: user.id,
    newValue: { passwordChangedAt: new Date().toISOString() },
  });

  return sendSuccess(res, {
    message: 'Contrasena actualizada correctamente. Inicia sesion de nuevo por seguridad.',
    data: {},
  });
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  changePassword,
};
