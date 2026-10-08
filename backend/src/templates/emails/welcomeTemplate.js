const { buildSysconEmail } = require('./sysconEmailLayout');
const buildWelcomeTemplate = ({ firstName, lastName, email, city, affiliation, role, appBaseUrl, logoUrl }) => buildSysconEmail({
  title: 'Tu cuenta fue creada correctamente',
  name: [firstName, lastName].filter(Boolean).join(' ') || 'participante',
  intro: 'Bienvenido a la comunidad de SYSCON LATAM 2026. Ya puedes ingresar para completar tu inscripción, registrar artículos y gestionar tus pagos.',
  details: [{ label:'Nombre', value:[firstName,lastName].filter(Boolean).join(' ') || 'Usuario' },{label:'Correo',value:email || 'No registrado'},{label:'Ciudad',value:city || 'No registrada'},{label:'Afiliación',value:affiliation || 'No registrada'},{label:'Rol',value:role || 'user'}],
  note: 'Siguiente paso: inicia sesión y completa tu registro para participar en la conferencia.',
  actionUrl: appBaseUrl, appBaseUrl, logoUrl,
});
module.exports = { buildWelcomeTemplate };
