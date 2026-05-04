# IEEE Platform Frontend

Production-ready React frontend scaffold for an IEEE conference registration system. The backend is intentionally decoupled and can be integrated later through the prepared Axios service layer.

## Stack

- React 18 + Vite
- React Router
- Axios
- React Hook Form
- TailwindCSS
- React Context for authentication and mock session state

## Setup

```bash
npm install
npm run dev
```

Optional production build:

```bash
npm run build
npm run preview
```

## Project Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── constants/
│   ├── context/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js
```

## Feature Coverage

- Responsive landing page with conference highlights
- Multi-step registration flow with validation
- Mock pricing engine for attendee/author/member scenarios
- Login flow with role-based mock access
- User dashboard with registration, papers, and payment status
- Admin dashboard UI with metrics and table placeholders
- Reusable UI components and layout primitives
- API/service architecture ready for backend replacement

## Mock Access

Use one of these emails on the login screen:

- `attendee@ieee.org` for participant access
- `admin@ieee.org` for admin access

Any password with at least 6 characters is accepted in mock mode.
