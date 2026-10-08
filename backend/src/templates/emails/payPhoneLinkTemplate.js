const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPayPhoneLinkTemplate = ({ firstName, amountUsd, paymentLink, appBaseUrl, logoUrl }) => buildSysconEmail({
  title:'Tu enlace de pago ya está disponible',name:firstName,
  intro:'El equipo administrativo habilitó el enlace para completar el pago con tarjeta de tu inscripción a SYSCON LATAM 2026.',
  details:[{label:'Monto',value:`$${Number(amountUsd || 0).toFixed(2)} USD`},{label:'Método',value:'PayPhone'}],
  note:'Completa el pago desde el enlace y conserva el comprobante o la confirmación que entregue la pasarela.',
  actionLabel:'Abrir enlace de pago',actionUrl:paymentLink,appBaseUrl,logoUrl,
});
module.exports = { buildPayPhoneLinkTemplate };
