# IEEE Platform Backend

Node.js + Express backend for an IEEE conference registration platform. It supports authentication, attendee/author registrations, dynamic pricing from the database, paper management, partial payments, admin dashboards, Excel exports, and email notifications.

## Stack

- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT authentication
- bcrypt
- express-validator
- nodemailer
- exceljs

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── seeders/
│   ├── services/
│   ├── utils/
│   ├── validations/
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. Enter the backend folder.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your local values.
4. Create a MySQL database matching `DB_NAME`.

## Environment Variables

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ieee_conference
DB_USER=root
DB_PASSWORD=
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1d
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Database Setup

This project uses Sequelize model sync for initial setup.

1. Create the MySQL database manually.
2. Run the seeder:

```bash
npm run seed
```

The seeder creates:

- An admin user: `admin@ieee-platform.com`
- Default password: `Admin12345!`
- Active event edition for 2026
- Initial pricing rules

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Available Scripts

- `npm run dev`: starts the API with nodemon
- `npm start`: starts the API with Node.js
- `npm run seed`: seeds admin user, event edition, and pricing rules

## Main API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Registrations

- `POST /api/registrations`
- `GET /api/registrations/me`
- `GET /api/registrations/:id`
- `PUT /api/registrations/:id`
- `POST /api/registrations/:id/papers`
- `DELETE /api/papers/:id`
- `GET /api/registrations/:id/payment-summary`

### Payments

- `POST /api/payments`
- `GET /api/payments/registration/:registrationId`
- `PATCH /api/payments/:id/status`

### Admin

- `GET /api/admin/users`
- `GET /api/admin/registrations`
- `GET /api/admin/payments`
- `GET /api/admin/papers`
- `GET /api/admin/dashboard`
- `GET /api/admin/pricing-rules`
- `POST /api/admin/pricing-rules`
- `PUT /api/admin/pricing-rules/:id`
- `GET /api/admin/exports/users`
- `GET /api/admin/exports/registrations`
- `GET /api/admin/exports/payments`
- `GET /api/admin/exports/papers`

## Notes

- Password hashes are never returned in API responses.
- Pricing is read from `pricingRules` and recalculated whenever registrations or approved payments change.
- SMTP is optional. If it is missing or fails, the application logs the issue and continues running.
- The API is ready to be consumed by the existing React frontend through REST endpoints.
