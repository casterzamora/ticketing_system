# Event Ticketing System - System Overview

## 1. What This System Is
This is a full event booking and ticketing platform with a Laravel API backend and a React SPA frontend.

It supports two operational sides:
- Admin side: event operations, inventory/sales monitoring, bookings oversight, scanner check-in, refund ledger, user management, notifications monitoring, and policy/payment controls.
- Customer side: account access, event browsing, ticket booking, checkout/payment, booking tracking, reschedule decisioning, notifications, and downloadable ticket PDFs with QR codes.

## 2. System Roles
- Admin: manages events, sales operations, refunds ledger visibility, scanner, and platform behavior settings.
- Customer: browses events, books tickets, pays, tracks bookings, and handles reschedule/refund decisions.

## 3. Admin Capabilities

### 3.1 Event Operations
- Create, edit, delete events.
- Configure event details: title, description, venue, address, start/end time, timezone, capacity, base price, media, categories.
- Manage event status lifecycle: draft, published, rescheduled, cancelled, completed.
- Reschedule events with automatic customer decision windows and notifications.
- Cancel events with automatic downstream booking/refund handling.

### 3.2 Ticket Type Management
- Create multiple ticket types per event.
- Set per-type price, quantity, description, and active state.
- Edit and remove ticket types.

### 3.3 Booking Oversight
- View all bookings with search/filter/pagination.
- See booking status, payment status, event mapping, amount, and check-in progress.
- Manual booking actions are supported in backend (approve/reject/cancel/toggle-checkin), while UI is currently positioned as safer monitoring-first operations.

### 3.4 Inventory and Sales Monitoring
- Inventory page shows operational order/sales metrics.
- Event-level sales breakdown and ticket code visibility.
- Low-stock alerts are generated and displayed using a fixed threshold policy.

### 3.5 Refund Ledger (Operational, Read-Oriented)
- Central ledger view for refund entries.
- Filter/search by status, range, customer/booking/event context.
- Shows reasons, amounts, and processing metadata.

### 3.6 Gate Scanner
- QR scanner endpoint accepts ticket code or booking reference payloads.
- Per-ticket check-in is enforced (multi-ticket bookings can be checked in one ticket at a time).
- Duplicate-scan cooldown protection exists.
- Booking-level check-in timestamp is marked when all booking tickets are checked in.

### 3.7 User Management
- List users and inspect user details.
- Update profile fields, toggle active/suspended state, and assign roles.
- View user booking history.

### 3.8 Notifications Monitoring
- Admin notifications monitor page for in-app/email delivery logs.
- Channel visibility includes sent and failed email attempts.
- Search/filter with pagination for operational audit.

### 3.9 Admin Settings and Controls
- Advanced controls exist for operational policy and payment mode.
- These are intentionally hidden behind an advanced section to avoid day-to-day confusion.

## 4. Customer Capabilities

### 4.1 Authentication and Account
- Register, login (email or username), logout.
- Session-based authentication.
- Profile update and password change flows.

### 4.2 Event Discovery
- Browse customer-visible events (published/active/upcoming logic).
- View event details, categories, venue/date/time, and available ticket types.

### 4.3 Booking Flow
- Create booking with ticket quantities and customer details.
- Booking receives unique reference.
- Duplicate booking constraints and inventory guardrails are enforced.

### 4.4 Checkout and Payments
- Checkout supports standard gateway simulation flow and PayMongo mode when enabled/configured.
- Payment health endpoint informs mode readiness.
- Booking status updates to confirmed after successful payment processing.

### 4.5 Booking Tracking
- Customer can view booking list and booking detail page.
- Booking detail includes event metadata, payment summary, ticket lines, and reschedule state.

### 4.6 Reschedule Decision Experience
- For rescheduled events, customer can choose Keep Ticket or Request Refund during decision window.
- Deadline and policy behavior are communicated in app and notification payloads.
- If no response before deadline, ticket remains valid for the new schedule.

### 4.7 Notifications and Email
- In-app notifications timeline with read/mark-all-read behavior.
- Transactional emails for key lifecycle events.

### 4.8 Ticket PDF
- Downloadable booking ticket PDF includes:
    - booking reference and ticket identifiers,
    - per-ticket QR codes,
    - event/customer/payment context.

## 5. Payment Architecture (Current Behavior)

### 5.1 Standard (Sandbox-Backed) Flow
- Customer submits transfer/payment details.
- Payment intent record is stored.
- Delayed confirmation callback simulation updates booking/payment status.
- Tickets are generated on successful payment confirmation.

### 5.2 PayMongo Integration Path
- Admin can switch payment mode to PayMongo when credentials are configured.
- Checkout session creation and webhook handling are supported.
- Mode/health endpoints enforce safe gating.

## 6. Scanner and Ticketing Model
- Tickets are individual entities (not just a booking flag).
- Each ticket has unique code and check-in timestamp.
- Scanner now supports independent validation of each ticket within the same booking.
- Admin monitoring surfaces ticket-entry progress per booking.

## 7. Policy and Automation Rules

### 7.1 Cancellation
- Event cancellation triggers booking cancellation/refund automation based on payment state and policy services.

### 7.2 Rescheduling
- Reschedule window can be set explicitly, otherwise adaptive logic is applied based on schedule shift size.
- Affected bookings are marked pending response and notified.

### 7.3 Refund Eligibility
- Refund behavior is policy-driven and validated against booking/event/payment conditions.

### 7.4 Stock Alerts
- Low-stock alert threshold is fixed and treated as system policy.
- Alert visibility is surfaced in operations views.

## 8. Notifications and Auditability
- Notification logging tracks in-app, email success, and email failure channels.
- Activity logs capture important operational actions.
- Admin has dedicated monitor views for operational observability.

## 9. Core Data Model (High Level)
- users
- events
- event_categories
- event_category_event
- ticket_types
- bookings
- booking_tickets
- tickets
- payments
- refund_requests
- notification_logs
- activity_logs
- system_settings

## 10. Practical Testing Scope
For full end-to-end testing, typical sequence is:
1. Admin creates event and ticket types.
2. Customer creates booking and completes checkout.
3. Tickets are issued and PDF is generated.
4. Admin scans each ticket at gate.
5. Booking/ticket statuses, logs, and notifications are verified.

---
This overview reflects current implemented behavior across admin and customer workflows, including policy, operational, payment, scanner, and notification aspects.
