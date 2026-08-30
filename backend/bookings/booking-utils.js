const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value, fieldName) => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw validationError(`${fieldName} must use YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw validationError(`${fieldName} must be a valid calendar date.`);
  }

  return date;
};

const validationError = (message) => {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
};

const validateBookingInput = ({ roomId, checkIn, checkOut, guests }) => {
  if (typeof roomId !== "string" || roomId.trim() === "") {
    throw validationError("roomId is required.");
  }

  const checkInDate = parseIsoDate(checkIn, "checkIn");
  const checkOutDate = parseIsoDate(checkOut, "checkOut");
  if (checkOutDate <= checkInDate) {
    throw validationError("checkOut must be after checkIn.");
  }

  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    throw validationError("guests must be a positive whole number.");
  }

  return {
    checkInDate,
    checkOutDate,
    guestCount,
    roomId: roomId.trim(),
  };
};

const countWeekendNights = (checkInDate, checkOutDate) => {
  let weekendNights = 0;
  const cursor = new Date(checkInDate);

  while (cursor < checkOutDate) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) weekendNights += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return weekendNights;
};

const calculateAmounts = ({ room, checkInDate, checkOutDate, guestCount }) => {
  const price = Number(room.price);
  const capacity = Number(room.capacity);

  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(capacity) || capacity < 1) {
    throw validationError("Room pricing data is invalid.");
  }

  const nights = Math.round((checkOutDate - checkInDate) / 86400000);
  const weekendNights = countWeekendNights(checkInDate, checkOutDate);
  const baseAmount = Math.round(price * nights);
  const weekendCharge = Math.round(price * weekendNights * 0.1);
  const extraGuestCharge = Math.round(Math.max(0, guestCount - capacity) * 1000 * nights);
  const subtotal = baseAmount + weekendCharge + extraGuestCharge;
  const gstAmount = Math.round(subtotal * 0.18);

  return {
    baseAmount,
    weekendCharge,
    extraGuestCharge,
    gstAmount,
    totalAmount: subtotal + gstAmount,
  };
};

module.exports = {
  calculateAmounts,
  validateBookingInput,
};
