const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPasswordResetTemplate = ({ firstName, provisionalPassword, appBaseUrl, logoUrl }) => buildSysconEmail({
  title: "Your password has been reset", name:firstName,
  intro:"We received a password reset request. Your previous password is no longer valid, and we generated a temporary password for your account.",
  details:[{label:"Temporary password",value:provisionalPassword}],
  note:"For your security, sign in and change this password as soon as possible. If you did not request this change, contact an administrator immediately.",
  actionUrl:appBaseUrl, appBaseUrl, logoUrl,
});
module.exports = { buildPasswordResetTemplate };
