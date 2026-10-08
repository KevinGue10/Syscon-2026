const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPasswordResetTemplate = ({ firstName, provisionalPassword, appBaseUrl, logoUrl }) => buildSysconEmail({
  title: 'Tu contraseña fue restablecida', name:firstName,
  intro:'Recibimos una solicitud de restablecimiento de contraseña. La clave anterior dejó de ser válida y generamos una contraseña provisional para acceder a tu cuenta.',
  details:[{label:'Contraseña provisional',value:provisionalPassword}],
  note:'Por seguridad, inicia sesión y cambia esta contraseña lo antes posible. Si no solicitaste este cambio, contacta inmediatamente al equipo administrador.',
  actionUrl:appBaseUrl, appBaseUrl, logoUrl,
});
module.exports = { buildPasswordResetTemplate };
