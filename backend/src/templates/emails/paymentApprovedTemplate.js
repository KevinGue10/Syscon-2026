const buildPaymentApprovedTemplate = ({
  firstName,
  amountUsd,
  transactionReference,
  paymentMethod,
  appBaseUrl,
  logoUrl,
}) => {
  const safeFirstName = firstName || 'participante';
  const normalizedAmount = Number(amountUsd || 0).toFixed(2);
  const subject = 'Tu pago fue validado correctamente';
  const translatePaymentMethod = (value) => {
    const normalizedValue = String(value || '').toLowerCase();

    if (normalizedValue === 'bank_transfer') {
      return 'Transferencia bancaria';
    }

    if (normalizedValue === 'payphone') {
      return 'PayPhone';
    }

    return value || 'No especificado';
  };
  const details = [
    { label: 'Monto validado', value: `$${normalizedAmount} USD` },
    { label: 'Referencia', value: transactionReference || 'No registrada' },
    { label: 'Metodo', value: translatePaymentMethod(paymentMethod) },
  ];

  const text = [
    `Hola ${safeFirstName},`,
    '',
    'Hemos validado correctamente tu pago en la plataforma IEEE Conference.',
    'El valor aprobado ya fue aplicado a tu registro y tu informacion de pago se actualizo satisfactoriamente.',
    '',
    ...details.map((item) => `${item.label}: ${item.value}`),
    '',
    appBaseUrl ? `Puedes revisar el estado de tu registro en: ${appBaseUrl}` : '',
    'Gracias por completar este proceso. Si necesitas soporte adicional, puedes comunicarte con el equipo organizador.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg, #eff6ff 0%, #f8fafc 42%, #ecfeff 100%); font-family: Arial, sans-serif; color:#0f172a; line-height:1.6;">
      <div style="max-width:680px; margin:0 auto;">
        <div style="background:#ffffff; border:1px solid #dbeafe; border-radius:24px; overflow:hidden; box-shadow:0 24px 60px rgba(15, 23, 42, 0.10);">
          <div style="padding:32px 36px; background:linear-gradient(135deg, #dbeafe 0%, #eff6ff 55%, #ffffff 100%); border-bottom:1px solid #dbeafe;">
            <div style="margin-bottom:16px; text-align:center;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="TEMSCON" style="display:inline-block; max-width:220px; width:auto; height:64px; object-fit:contain;" />`
                  : `<div style="display:inline-block; padding:8px 14px; border-radius:999px; background:#ffffff; color:#1d4ed8; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">TEMSCON IEEE Conference</div>`
              }
            </div>
            <h2 style="margin:18px 0 10px; font-size:32px; line-height:1.15; color:#0f172a;">Tu pago fue validado correctamente</h2>
            <p style="margin:0; max-width:520px; font-size:16px; color:#334155;">El equipo administrativo reviso tu soporte y confirmo la validacion del pago asociado a tu registro.</p>
          </div>

          <div style="padding:34px 36px 18px;">
            <p style="margin:0 0 18px; font-size:18px;">Hola <strong>${safeFirstName}</strong>,</p>
            <p style="margin:0 0 24px; color:#334155;">Te confirmamos que tu pago fue validado exitosamente. El monto aprobado ya quedo reconocido dentro de la plataforma y tu proceso administrativo continua sin novedades.</p>

            <div style="margin:0 0 28px; border:1px solid #dbeafe; border-radius:20px; overflow:hidden; background:#f8fbff;">
              ${details
                .map(
                  (item, index) => `
                    <div style="padding:16px 20px; ${index < details.length - 1 ? 'border-bottom:1px solid #dbeafe;' : ''}">
                      <p style="margin:0 0 4px; font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#2563eb;">${item.label}</p>
                      <p style="margin:0; font-size:18px; color:#0f172a; font-weight:600;">${item.value}</p>
                    </div>
                  `
                )
                .join('')}
            </div>

            <div style="margin:0 0 24px; padding:18px 20px; border-left:4px solid #22c55e; border-radius:14px; background:#f0fdf4;">
              <p style="margin:0; color:#166534;"><strong>Confirmacion:</strong> el pago ya fue registrado como valido y se tendra en cuenta dentro del estado de tu inscripcion.</p>
            </div>

            ${
              appBaseUrl
                ? `<p style="margin:0 0 28px;"><a href="${appBaseUrl}" style="display:inline-block; padding:14px 22px; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff; text-decoration:none; border-radius:12px; font-weight:700; box-shadow:0 12px 24px rgba(37, 99, 235, 0.28);">Ingresar a la plataforma</a></p>`
                : ''
            }

            <p style="margin:0 0 24px; color:#475569;">Si deseas revisar el estado actualizado de tu registro o de tus pagos, puedes ingresar a la plataforma en cualquier momento.</p>
          </div>

          <div style="padding:18px 36px 30px; color:#64748b; font-size:13px; border-top:1px solid #e2e8f0;">
            Este mensaje fue generado automaticamente por la plataforma IEEE Conference.
          </div>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
};

module.exports = {
  buildPaymentApprovedTemplate,
};
