const getAuthenticatedSub = (event) =>
  event?.requestContext?.authorizer?.jwt?.claims?.sub ||
  event?.requestContext?.authorizer?.claims?.sub ||
  null;

module.exports = {
  getAuthenticatedSub,
};
