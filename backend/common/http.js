const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(payload),
});

const error = (statusCode, code, message) =>
  json(statusCode, {
    error: { code, message },
  });

const parseJsonBody = (event) => {
  if (!event || event.body === undefined || event.body === null || event.body === "") {
    return {};
  }

  if (typeof event.body === "object") return event.body;

  try {
    return JSON.parse(event.body);
  } catch {
    const invalidBodyError = new Error("Request body must be valid JSON.");
    invalidBodyError.code = "INVALID_JSON";
    throw invalidBodyError;
  }
};

module.exports = {
  error,
  json,
  parseJsonBody,
};
