// WhatsApp click-to-chat links: open WhatsApp with a message typed in, ready
// to send. No API or paid service; the person still taps Send.

const DEFAULT_COUNTRY_CODE = "232"; // Sierra Leone

/** Turn "076 123 456", "+232 76 123456" or "23276123456" into "23276123456". */
export function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  else if (digits.length <= 8) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits.length >= 10 ? digits : null;
}

/** A chat with one person, or the contact picker when there is no number. */
export function whatsAppLink(text: string, phone?: string | null) {
  const number = normalizePhone(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}
