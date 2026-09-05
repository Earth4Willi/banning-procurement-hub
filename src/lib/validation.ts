export type QuoteContact = { name: string; phone: string; area: string; note?: string };
export type QuoteFieldErrors = { name?: string; phone?: string; area?: string };

const GHANA_MOBILE = /^(?:\+?233|0)?\s?[245][0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/;

export function validateQuoteContact(contact: QuoteContact): QuoteFieldErrors {
  const errors: QuoteFieldErrors = {};
  if (!contact.name.trim()) errors.name = "Please enter your name.";
  if (contact.name.trim().length > 80) errors.name = "Name is too long.";
  if (!contact.area.trim()) errors.area = "Please enter your delivery area.";
  if (!GHANA_MOBILE.test(contact.phone.trim())) {
    errors.phone = "Enter a valid Ghana mobile number, e.g. 055 885 0667.";
  }
  return errors;
}
