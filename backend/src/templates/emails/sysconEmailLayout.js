const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const safeUrl = value => /^https?:\/\//i.test(String(value || '')) ? escapeHtml(value) : '';

function buildSysconEmail({ title, intro, name, details = [], note, actionLabel = 'Ingresar a la plataforma', actionUrl, appBaseUrl, logoUrl }) {
  const subject = `SYSCON LATAM 2026 | ${title}`;
  const text = [`IEEE SYSCON LATAM 2026`, 'Cartagena, Colombia · 3 y 4 de diciembre de 2026', '', `Hola ${name || 'participante'},`, '', title, intro, '', ...details.map(item => `${item.label}: ${item.value}`), '', note, actionUrl ? `${actionLabel}: ${actionUrl}` : '', appBaseUrl && appBaseUrl !== actionUrl ? `Plataforma: ${appBaseUrl}` : ''].filter(Boolean).join('\n');
  const link = safeUrl(actionUrl);
  const platform = safeUrl(appBaseUrl);
  const logo = safeUrl(logoUrl);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f7f8;color:#00334d;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(title)} · Cartagena, 3–4 diciembre 2026</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f7f8"><tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="640"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #d6e3e8;border-radius:12px;overflow:hidden;">
<tr><td bgcolor="#ff5100" style="height:5px;font-size:1px;line-height:5px;">&nbsp;</td></tr>
<tr><td bgcolor="#00334d" style="padding:28px 24px;color:#ffffff;">
<p style="margin:0 0 14px;font-size:10px;font-weight:bold;letter-spacing:2px;color:#a6dce5;">IEEE SYSTEMS COUNCIL</p>
${logo ? `<img src="${logo}" alt="IEEE SYSCON LATAM 2026" width="240" style="display:block;width:100%;max-width:240px;height:auto;margin:0 0 18px;border:0;">` : ''}
<p style="margin:0;font-size:36px;line-height:1.15;font-weight:bold;letter-spacing:-1px;"><span style="color:#ff944d;">SYSCON</span> <span style="font-size:21px;color:#ffffff;">LATAM 2026</span></p>
<p style="margin:12px 0 0;color:#c2dce2;font-size:12px;line-height:1.7;">The 1st IEEE Latin American Systems Conference</p>
</td></tr>
<tr><td bgcolor="#eef8f9" style="padding:14px 24px;color:#005e73;font-size:12px;line-height:1.7;border-bottom:1px solid #d7eef1;"><strong>Cartagena, Colombia</strong> &nbsp;·&nbsp; 3 y 4 de diciembre de 2026</td></tr>
<tr><td style="padding:30px 24px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;">Hola <strong>${escapeHtml(name || 'participante')}</strong>,</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#00334d;">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;color:#526b7a;font-size:15px;line-height:1.8;">${escapeHtml(intro)}</p>
${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f7f8" style="border:1px solid #d6e3e8;border-radius:8px;">${details.map(item => `<tr><td style="padding:14px 18px;border-bottom:1px solid #d6e3e8;"><p style="margin:0 0 5px;font-size:10px;font-weight:bold;letter-spacing:1px;color:#00758a;">${escapeHtml(item.label)}</p><p style="margin:0;font-size:16px;line-height:1.6;color:#00334d;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(item.value)}</p></td></tr>`).join('')}</table>` : ''}
${note ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;"><tr><td bgcolor="#eef8f9" style="padding:16px 18px;border-left:4px solid #007b91;font-size:13px;line-height:1.8;color:#345364;">${escapeHtml(note)}</td></tr></table>` : ''}
${link ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;"><tr><td bgcolor="#c83e00" style="border-radius:6px;mso-padding-alt:14px 22px;"><a href="${link}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;line-height:1.5;">${escapeHtml(actionLabel)}</a></td></tr></table><p style="margin:18px 0 0;font-size:12px;color:#607986;line-height:1.7;">Si el botón no funciona, abre este enlace:<br><a href="${link}" style="color:#00758a;word-break:break-all;">${escapeHtml(actionUrl)}</a></p>` : ''}
${platform && platform !== link ? `<p style="margin:20px 0 0;font-size:13px;"><a href="${platform}" style="color:#00758a;">Volver a la plataforma</a></p>` : ''}
</td></tr>
<tr><td style="padding:22px 24px;border-top:1px solid #d6e3e8;font-size:11px;line-height:1.8;color:#607986;"><strong style="color:#00334d;">IEEE SYSCON LATAM 2026</strong><br>Primera edición latinoamericana · Cartagena, Colombia<br>Mensaje automático de la plataforma de participantes.</td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { subject, text, html };
}
module.exports = { buildSysconEmail };
