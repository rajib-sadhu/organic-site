# Service layer

Business logic, framework-agnostic. Returns values or throws — **never** produces HTTP
responses (that's the Route Handlers' job). Keeping logic here means it can be lifted into
a standalone API later without rewriting.

Planned services:
- `orderService` — create order (transactional), status transitions, order numbers
- `paymentService` — Razorpay order creation, signature verification, webhook handling
- `couponService` — validate + compute discount (re-validated at order time)
- `inventoryService` — stock reserve/release, decrement on confirm
- `emailService` — Resend transactional sends
- `invoiceService` — invoice numbering + react-pdf generation
- `otpService` — COD phone OTP (toggle in Settings)
