# Flash | Next-Gen B2B Commerce & Marketplace

A modern, high-velocity B2B marketplace and seller commerce platform built for enterprise procurement, bulk ordering, tiered pricing, and vendor workflows.

---

## ⚡ Overview

**Flash** accelerates business buying and selling by eliminating friction from quotation to delivery. It delivers:
- **Verified B2B Catalog**: Multi-category wholesale procurement with real-time SKU search, MOQ tiers, and volume-discount schedules.
- **Bulk Purchasing & Cart Engine**: Multi-seller cart grouping, volume tier auto-recalculation, and corporate tax exemption workflows.
- **Corporate Checkout**: Multi-step corporate checkout with delivery hub management, Net-30 credit terms, Purchase Order (PO) routing, and approval gates.
- **RFQ & Negotiation Inbox**: Direct buyer-seller RFQ exchange with real-time counter-offers and quote lifecycle tracking.
- **Seller Central**: Assortment management, multi-tab listing wizards, fulfillment queues, automated tracking integration, and payout ledgers.
- **Admin Governance**: KYB compliance verification, catalog quality moderation, and dispute arbitration queues.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [Wouter](https://github.com/molefrog/wouter)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components & UI**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **State & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest) + [tRPC](https://trpc.io/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Server**: [Express](https://expressjs.com/)
- **API Protocol**: [tRPC v11](https://trpc.io/) with SuperJSON serialization
- **Database & ORM**: [MySQL](https://www.mysql.com/) / [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: JWT-based session management (`jose`) with secure HTTP-only cookies

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0` or pnpm `>= 9.0.0`

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
# Application
NODE_ENV=development
PORT=3000

# Client Configuration
VITE_APP_ID=flash-b2b-marketplace

# Authentication & Security
JWT_SECRET=your-secure-jwt-secret-key-min-32-chars

# Database (Optional for frontend preview, required for persistence)
DATABASE_URL=mysql://user:password@localhost:3306/flash_marketplace
```

### 3. Development Server
Start the unified fullstack development server with hot module replacement:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build & Deployment

### Build the Application
To compile both the Vite client SPA and the backend service:
```bash
npm run build
```
The production bundle will be generated in:
- `dist/public` (Static frontend assets)
- `dist/index.js` (Compiled Node server)

### Start Production Server
```bash
npm run start
```

### Vercel Deployment (Frontend SPA)
The project includes a ready-to-deploy `vercel.json` configured for single-page routing:
1. Connect your repository to Vercel.
2. Ensure build command is `npm run build` or `vite build`.
3. Set the output directory to `dist/public`.
4. Deploy!

---

## 🧪 Testing & Code Quality

Run the test suite:
```bash
npm run test
```

Typecheck TypeScript files:
```bash
npm run check
```

---

## 📄 License
MIT License. © Flash Technologies.
