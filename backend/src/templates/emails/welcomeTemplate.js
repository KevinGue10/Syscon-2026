const { buildSysconEmail } = require('./sysconEmailLayout');
const buildWelcomeTemplate = ({ firstName, lastName, email, city, affiliation, appBaseUrl, logoUrl }) => buildSysconEmail({
  title: "Your account has been created",
  name: [firstName, lastName].filter(Boolean).join(' ') || 'participant',
  intro: "Welcome to the SYSCON LATAM 2026 community. Sign in to complete your registration, register papers and manage your payments.",
  details: [{ label:"Name", value:[firstName,lastName].filter(Boolean).join(' ') || "User" },{label:"Email",value:email || "Not provided"},{label:"City",value:city || "Not provided"},{label:"Affiliation",value:affiliation || "Not provided"}],
  note: "Next step: sign in and complete your conference registration.",
  actionUrl: appBaseUrl, appBaseUrl, logoUrl,
});
module.exports = { buildWelcomeTemplate };
