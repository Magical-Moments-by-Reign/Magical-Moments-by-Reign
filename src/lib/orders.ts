// ── Order service ───────────────────────────────────────────────
// Creates orders with SERVER-computed totals (never trusts the client).
// Prices come from approved PLANS / ADD_ONS via computeTotals().

import { prisma } from "@/lib/db";
import { computeTotals, toCents, orderNumber, needsShipping, formatPrice, type CartState } from "@/lib/commerce";
import { getPlan } from "@/lib/plans";
import { sendEmail, ADMIN_EMAIL, purchaseThankYouEmail, adminOrderNotifyEmail } from "@/lib/email";

export interface CheckoutDetails {
  name: string;
  email: string;
  phone?: string;
  experienceTitle?: string;
  experienceType?: string;
  eventDate?: string;
  customDomain?: string;
  billing?: AddressInput;
  shipping?: AddressInput;
}

export interface AddressInput {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal: string;
  country?: string;
  phone?: string;
}

export interface CreatedOrder {
  id: string;
  number: string;
  totalCents: number;
}

async function nextOrderNumber(now: Date): Promise<string> {
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const countToday = await prisma.order.count({ where: { createdAt: { gte: startOfDay } } });
  return orderNumber(now, countToday + 1);
}

export async function createOrder(cart: CartState, details: CheckoutDetails): Promise<CreatedOrder> {
  if (!cart.planId || !getPlan(cart.planId)) {
    throw new Error("A preservation plan is required to check out.");
  }

  const totals = computeTotals(cart); // authoritative
  const now = new Date();
  const number = await nextOrderNumber(now);

  const customer = await prisma.customer.upsert({
    where: { email: details.email.toLowerCase() },
    update: { name: details.name, phone: details.phone || undefined },
    create: { email: details.email.toLowerCase(), name: details.name, phone: details.phone || null },
  });

  const billing = details.billing
    ? await prisma.address.create({ data: normalizeAddress(details.billing, details.name) })
    : null;
  const shipping = needsShipping(cart) && details.shipping
    ? await prisma.address.create({ data: normalizeAddress(details.shipping, details.name) })
    : null;

  const order = await prisma.order.create({
    data: {
      number,
      customerId: customer.id,
      planId: cart.planId,
      experienceTitle: details.experienceTitle || null,
      experienceType: details.experienceType || null,
      eventDate: details.eventDate ? new Date(details.eventDate) : null,
      customDomain: details.customDomain || null,
      subtotal: toCents(totals.subtotal),
      discount: 0,
      tax: toCents(totals.tax),
      total: toCents(totals.total),
      recurringAnnual: toCents(totals.recurringAnnual),
      currency: "USD",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      billingAddressId: billing?.id ?? null,
      shippingAddressId: shipping?.id ?? null,
      items: {
        create: totals.lines.map((l) => ({
          kind: l.kind,
          refId: l.id,
          label: l.label,
          unitPrice: toCents(l.unitPrice),
          quantity: l.qty,
          amount: toCents(l.amount),
          recurring: l.recurring,
        })),
      },
      domainRequest: details.customDomain
        ? { create: { requested: details.customDomain, status: "PENDING" } }
        : undefined,
    },
  });

  // Thank-you to the customer (with instructions) + admin notification.
  // Emails must never block or fail the order.
  const itemLabels = totals.lines.map((l) => (l.qty > 1 ? `${l.label} × ${l.qty}` : l.label));
  const totalStr = formatPrice(totals.total);
  const thanks = purchaseThankYouEmail({ name: details.name, number: order.number, items: itemLabels, total: totalStr });
  const adminNote = adminOrderNotifyEmail({ number: order.number, email: details.email, total: totalStr, items: itemLabels });
  await Promise.allSettled([
    sendEmail({ to: details.email, subject: thanks.subject, html: thanks.html, replyTo: ADMIN_EMAIL }),
    sendEmail({ to: ADMIN_EMAIL, subject: adminNote.subject, html: adminNote.html, replyTo: details.email }),
  ]);

  return { id: order.id, number: order.number, totalCents: order.total };
}

function normalizeAddress(a: AddressInput, fallbackName: string) {
  return {
    name: a.name || fallbackName,
    line1: a.line1,
    line2: a.line2 || null,
    city: a.city,
    region: a.region,
    postal: a.postal,
    country: a.country || "US",
    phone: a.phone || null,
  };
}
