const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPaymentApprovedTemplate = ({ firstName, amountUsd, transactionReference, paymentMethod, appBaseUrl, logoUrl }) => buildSysconEmail({
  title:'Tu pago fue validado correctamente', name:firstName,
  intro:'El monto aprobado fue aplicado a tu inscripción. Puedes consultar el estado actualizado de tus pagos desde la plataforma.',
  details:[{label:'Monto validado',value:`$${Number(amountUsd || 0).toFixed(2)} USD`},{label:'Referencia',value:transactionReference || 'No registrada'},{label:'Método',value:({bank_transfer:'Transferencia bancaria',payphone:'PayPhone',cobru:'Cobru'})[String(paymentMethod || '').toLowerCase()] || paymentMethod || 'No especificado'}],
  note:'Este correo confirma el pago indicado. Consulta tu inscripción para revisar si existe un saldo pendiente.',
  actionLabel:'Consultar mi inscripción',actionUrl:appBaseUrl,appBaseUrl,logoUrl,
});
module.exports = { buildPaymentApprovedTemplate };
