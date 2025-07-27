# Copilot Instructions for ThreadedTreasure-New

## Project Overview
ThreadedTreasure-New is a Node.js/Express e-commerce platform with modular backend and dynamic frontend. It supports user/admin dashboards, product/inventory/order management, and email notifications.

## Key Architecture & Data Flow
- **Backend:**
  - `server.js`: Main Express app, mounts routes under `/api/*`, serves static files from `public/`.
  - `controllers/`: Business logic for users, products, orders, inventory, etc.
  - `routes/`: API endpoints mapped to controllers (e.g. `orderRoutes.js` for `/api/orders/*`).
  - `config/database.js`: MySQL2 connection pool (`promisePool`).
  - `middleware/auth.js`: JWT authentication for protected routes.
  - `services/emailService.js`: Handles transactional emails.
- **Frontend:**
  - `public/components/header.html`: Unified header, loaded via JS into `<div id="header-placeholder"></div>`.
  - `public/js/componentLoader.js`: Loads header/footer and other components, uses cache-busting for header updates.
  - Main JS controllers: `app.js`, `products-manager-new.js`, `user-orders.js`.
  - Pages use placeholders and load components dynamically.

## Inventory & Order Status Logic
- **Inventory is tracked in `inventory` table** (not in `products`).
- **Order status transitions:**
  - When admin sets status to `processing`, `shipped`, or `delivered`, inventory is deducted (see `OrderController.js`).
  - If status changes from a deducted state to `cancelled` or `refunded`, inventory is restored.
  - Direct cancellation from `pending` does NOT deduct inventory.
- **SQL queries use size/color for inventory matching.**

## Developer Workflows
- **Start server:**
  ```bash
  npm run dev
  ```
- **Static files:** Served from `public/`.
- **API requests:** All under `/api/*` (e.g. `/api/orders/my-orders`).
- **Authentication:** JWT required for user-specific and admin routes.
- **Frontend component updates:** Update `header.html` and use cache-busting in loader to reflect changes immediately.

## Project-Specific Patterns
- **Component loading:** Always use JS loader to insert header/footer; do not use static markup in pages.
- **Order history:** `/api/orders/my-orders` returns only the current user's orders; items are fetched per order.
- **Admin pages:** Use DataTables, fetch data via AJAX, and expect specific fields (e.g. `main_image`, `quantity`).
- **Inventory updates:** Always use the `inventory` table for stock changes, not the `products` table.
- **Error handling:** API returns `{ success: false, message: ... }` for errors; frontend displays toast or modal.

## Integration Points
- **Email:** Configured via `services/emailService.js` (Gmail SMTP).
- **Database:** MySQL/MariaDB, schema in `threadedtreasure.sql`.
- **JWT:** Used for authentication in `middleware/auth.js`.

## Examples
- **Order status update (inventory logic):** See `OrderController.js`, method `updateOrderStatus`.
- **Component loading:** See `componentLoader.js` and usage in HTML files.
- **API route mounting:** See `server.js`:
  ```js
  app.use('/api/orders', require('./routes/orderRoutes'));
  ```

---
**If any section is unclear or missing, please provide feedback so this guide can be improved for your team.**
