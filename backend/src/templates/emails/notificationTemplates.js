const { buildSysconEmail } = require('./sysconEmailLayout');
const statusLabels = { draft:'Borrador', submitted:'Enviada', confirmed:'Confirmada', cancelled:'Cancelada', pending:'Pendiente' };
function buildRegistrationConfirmationTemplate({ firstName, registration, appBaseUrl, logoUrl }) {
  return buildSysconEmail({ title:'Recibimos tu inscripción',name:firstName,intro:'Tu inscripción a IEEE SYSCON LATAM 2026 quedó registrada. Ingresa a la plataforma para revisar tus datos y continuar el proceso.',details:[{label:'Inscripción',value:`#${registration.id}`},{label:'Estado',value:statusLabels[registration.status] || registration.status}],note:'La creación de la inscripción no confirma el pago. Consulta el estado de tu participación en la plataforma.',actionLabel:'Consultar mi inscripción',actionUrl:appBaseUrl,appBaseUrl,logoUrl });
}
function buildPaperRegistrationTemplate({ firstName, paper, appBaseUrl, logoUrl }) {
  return buildSysconEmail({title:'Tu artículo fue registrado',name:firstName,intro:'Guardamos los datos de tu artículo en la plataforma de SYSCON LATAM 2026.',details:[{label:'Título',value:paper.title},{label:'Código del artículo',value:paper.paperCode}],note:'Este mensaje confirma el registro del artículo en la plataforma; la aceptación académica se comunica por el proceso correspondiente.',actionLabel:'Revisar mis artículos',actionUrl:appBaseUrl,appBaseUrl,logoUrl});
}
function buildPendingPaymentReminderTemplate({ firstName, registration, appBaseUrl, logoUrl }) {
  return buildSysconEmail({title:'Tienes un saldo pendiente',name:firstName,intro:'Tu inscripción registra un saldo pendiente. Revisa las opciones de pago disponibles en la plataforma para continuar.',details:[{label:'Inscripción',value:`#${registration.id}`},{label:'Saldo pendiente',value:`$${Number(registration.pendingAmount || 0).toFixed(2)} USD`}],note:'Si ya realizaste el pago, consulta su estado y adjunta el comprobante cuando corresponda.',actionLabel:'Consultar mis pagos',actionUrl:appBaseUrl,appBaseUrl,logoUrl});
}
module.exports = {buildRegistrationConfirmationTemplate,buildPaperRegistrationTemplate,buildPendingPaymentReminderTemplate};
