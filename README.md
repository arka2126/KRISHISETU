# KrishiSetu — Digital National Agriculture Market Platform

**"Connecting Farms. Creating Markets. Empowering Farmers."**

A full-stack agricultural marketplace prototype: farmers register produce, mandi staff
process gate entries and lots, quality assessors certify quality, buyers bid in real-time
digital auctions, and payments/settlement/invoices/gate-passes/logistics are simulated
end-to-end.

This is an **independent demo/prototype** inspired by the concept of India's e-NAM —
not affiliated with, or a copy of, any government platform. All payments, banking,
Aadhaar verification, and government API integrations are mocked.

## Scope note

This build is a fully functional core covering the complete demo workflow (farmer →
lot → quality → auction → live bidding → payment → settlement → invoice → gate pass →
logistics → dashboards for all 5 roles). Some peripheral admin table/analytics screens
(charts, full CRUD tables with pagination/sort UI for every entity) are intentionally
left as REST endpoints you can wire further UI onto — the backend already supports
them (`/api/users`, `/api/lots`, `/api/auctions`, `/api/payments`, audit logs, etc.).

## Tech stack

- **Frontend:** React 18 + Vite, React Router, Axios, Socket.IO client
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.IO (live auction bidding, notifications)
- **Auth:** JWT + bcrypt password hashing

## Folder structure

```
krishisetu/
├── frontend/    React (Vite) app
├── backend/     Express API + Socket.IO
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js 18+ and npm
- A running MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env if your MongoDB URI, JWT secret, or port differ from the defaults
npm run seed     # populates demo users, commodities, lots, an active auction, and one completed sale
npm run dev      # starts the API + Socket.IO server on http://localhost:5000 (needs nodemon, or use `npm start`)
```

`.env` variables:

```
MONGODB_URI=mongodb://127.0.0.1:27017/krishisetu
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
```

## 2. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # defaults already point at the local backend via the Vite proxy
npm run dev             # starts the app on http://localhost:5173
```

Visit **http://localhost:5173**.

## Demo login credentials

Password for every seeded account: `Demo@123`

| Role              | Email                        |
|-------------------|-------------------------------|
| Admin             | admin@krishisetu.demo         |
| Farmer            | farmer1@krishisetu.demo (…farmer10) |
| Buyer             | buyer1@krishisetu.demo (…buyer10)   |
| Mandi Staff       | mandi1@krishisetu.demo (…mandi3)    |
| Quality Assessor  | assessor1@krishisetu.demo (…assessor3) |

The seed script also creates **one live auction** ready for bidding and **one fully
completed transaction** (sold → paid → settled) so every dashboard has real data on
first load.

## Testing the complete workflow manually

1. Log in as **mandi1@krishisetu.demo** → Gate Entry & Lot Creation → create a lot for a farmer.
2. Log in as **assessor1@krishisetu.demo** → Quality Assessor dashboard → test the new lot → issue certificate.
3. Log in as **mandi1@krishisetu.demo** again → approve the lot from the Mandi dashboard.
4. Use the backend API (or extend the Mandi UI) to `POST /api/auctions` with that lot's id, a `startTime`, `endTime`.
5. Log in as **buyer1@krishisetu.demo** (open a second browser/incognito window for a second buyer, e.g. buyer2) →
   go to **Live Auctions** → open the auction → place bids. Watch both browser windows update instantly via Socket.IO.
6. When ready, `POST /api/auctions/:id/close` (as mandi/admin) to close the auction.
7. As the winning buyer, open the sold lot's detail page and click **PAY NOW** — this auto-generates
   the settlement, transaction ID and invoice.
8. Check the **Farmer dashboard** to see the settlement and net payout reflected immediately.
9. Check the **Admin dashboard** to see the transaction rolled up into platform-wide totals.

You can also drive every step directly via the REST API (e.g. with Postman/curl) —
see the endpoint list below.

## Key REST API endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/users                      (admin)
GET    /api/commodities

POST   /api/lots                       (mandi staff)
GET    /api/lots
PUT    /api/lots/:id

POST   /api/quality-reports            (quality assessor)
GET    /api/quality-reports/pending
GET    /api/quality-reports/:lotId

POST   /api/auctions                   (mandi staff)
GET    /api/auctions
GET    /api/auctions/:id
POST   /api/auctions/:id/bids          (buyer — also available live via Socket.IO "placeBid")
POST   /api/auctions/:id/close

POST   /api/payments                   (buyer, simulated payment)
GET    /api/payments/:id

GET    /api/settlements
GET    /api/settlements/:id

POST   /api/gate-passes
GET    /api/gate-passes/:id

POST   /api/logistics
PUT    /api/logistics/:id
GET    /api/logistics/:lotId

GET    /api/dashboard/farmer | buyer | mandi | admin
GET    /api/notifications
```

## Socket.IO events (live auctions)

Client connects with `auth: { token: <JWT> }`.

- `joinAuction` / `leaveAuction` — subscribe/unsubscribe to an auction room
- `placeBid` `{ auctionId, amount }` → ack callback `{ success, message, data }`
- `newBid` (server → client) — broadcast to everyone in the auction room
- `auctionClosed` (server → client)
- `notification` (server → client) — personal notifications

The backend **never trusts the client for bid validity** — every bid (REST or socket)
is re-validated server-side against the current highest bid, minimum increment, and
auction time window before it's accepted.

## Security notes

- Passwords hashed with bcrypt; plaintext passwords are never stored.
- JWT-based auth with role-based route authorization (`protect` + `authorize` middleware).
- `helmet` for secure HTTP headers, `express-rate-limit` on the API surface, CORS locked to `CLIENT_URL`.
- All secrets live in `backend/.env` (gitignored) — never in frontend code.

## What's simulated / out of scope for this prototype

- Payments (UPI/Net Banking/Bank Transfer) always succeed instantly — no real gateway.
- Aadhaar/KYC verification, real weighbridge hardware, and government API integrations are not implemented.
- PDF invoice/certificate downloads use the browser's print dialog in this build rather than a generated binary PDF.
- Some admin analytics charts and full CRUD table UIs (search/filter/sort/pagination for every entity)
  are available as REST endpoints but not all have dedicated frontend screens yet — a natural next step.

Emails & Passwords
Admin	admin@krishisetu.demo
Farmer farmer1@krishisetu.demo to farmer10@krishisetu.demo
Buyer	buyer1@krishisetu.demo to buyer10@krishisetu.demo
Mandi Staff	mandi1@krishisetu.demo to mandi3@krishisetu.demo
Quality Assessor	assessor1@krishisetu.demo to assessor3@krishisetu.demo

Pass Demo@123

Mandi Staff → creates lot
Quality Assessor → certifies it
Mandi Staff → approves lot and creates/activates auction
Buyer → places bids
Mandi Staff or Admin → closes auction 