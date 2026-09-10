export type QuoteContact = { name: string; phone: string; email?: string; area: string; note?: string };
export type QuoteFieldErrors = { name?: string; phone?: string; email?: string; area?: string };

const GHANA_MOBILE = /^(?:\+?233|0)?\s?[245][0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateQuoteContact(contact: QuoteContact): QuoteFieldErrors {
  const errors: QuoteFieldErrors = {};
  if (!contact.name.trim()) errors.name = "Please enter your name.";
  if (contact.name.trim().length > 80) errors.name = "Name is too long.";
  if (!contact.area.trim()) errors.area = "Please select your delivery area.";
  if (contact.email && contact.email.trim() && !EMAIL.test(contact.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!GHANA_MOBILE.test(contact.phone.trim())) {
    errors.phone = "Enter a valid Ghana mobile number, e.g. 055 885 0667.";
  }
  return errors;
}

const PASSWORD_RULE =
  "Password must be 8-200 characters and include an uppercase letter, a lowercase letter and a number.";

const PASSWORD_OK = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export type LoginFieldErrors = { email?: string; password?: string };
export type RegisterFieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  area?: string;
  address?: string;
  password?: string;
  confirmPassword?: string;
};
export type ProfileFieldErrors = { name?: string; email?: string; phone?: string };
export type DeliveryFieldErrors = { area?: string; address?: string };
export type PasswordChangeErrors = { currentPassword?: string; newPassword?: string; confirmPassword?: string };

function passwordError(password: string): string | undefined {
  if (password.length < 8 || password.length > 200 || !PASSWORD_OK.test(password)) {
    return PASSWORD_RULE;
  }
  return undefined;
}

export function validateLogin(input: { email: string; password: string }): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!input.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.password) errors.password = "Please enter your password.";
  return errors;
}

export function validateRegister(input: {
  name: string;
  phone: string;
  email: string;
  area: string;
  address: string;
  password: string;
  confirmPassword: string;
}): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!input.name.trim()) {
    errors.name = "Please enter your name.";
  } else if (input.name.trim().length > 80) {
    errors.name = "Name is too long.";
  }
  if (!input.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (!GHANA_MOBILE.test(input.phone.trim())) {
    errors.phone = "Enter a valid Ghana mobile number, e.g. 055 885 0667.";
  }
  if (!input.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.area) errors.area = "Please select your delivery area.";
  if (input.address.trim().length > 500) errors.address = "Address is too long.";
  const password = passwordError(input.password);
  if (password) errors.password = password;
  if (!input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateProfile(input: { name: string; email: string; phone: string }): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!input.name.trim()) {
    errors.name = "Please enter your name.";
  } else if (input.name.trim().length > 80) {
    errors.name = "Name is too long.";
  }
  if (!input.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (!GHANA_MOBILE.test(input.phone.trim())) {
    errors.phone = "Enter a valid Ghana mobile number, e.g. 055 885 0667.";
  }
  return errors;
}

export function validateDelivery(input: { area: string; address: string }): DeliveryFieldErrors {
  const errors: DeliveryFieldErrors = {};
  if (!input.area) errors.area = "Please select your delivery area.";
  if (input.address.trim().length > 500) errors.address = "Address is too long.";
  return errors;
}

export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};
  if (!input.currentPassword) errors.currentPassword = "Please enter your current password.";
  if (!input.newPassword) {
    errors.newPassword = "Please enter a new password.";
  } else {
    const password = passwordError(input.newPassword);
    if (password) errors.newPassword = password;
  }
  if (!input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  } else if (input.confirmPassword !== input.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}
