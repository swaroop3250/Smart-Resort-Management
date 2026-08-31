(() => {
  const config = window.SmartResortConfig;
  const auth = window.SmartResortAuth;

  function createError(status, message, payload) {
    const error = new Error(message);
    error.status = status;
    error.payload = payload || null;
    return error;
  }

  function parseResponseBody(response) {
    return response.text().then((text) => {
      if (!text || !text.trim()) {
        return {};
      }

      try {
        return JSON.parse(text);
      } catch (error) {
        return { text };
      }
    });
  }

  function getFriendlyMessage(status, payload) {
    const backendMessage =
      payload &&
      payload.error &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
        ? payload.error.message.trim()
        : "";

    if (status === 400 && backendMessage) return backendMessage;
    if (status === 401 || status === 403) return "Please sign in to continue.";
    if (status === 404 && backendMessage) return backendMessage;
    if (status === 409) return "The selected room is unavailable for those dates.";
    if (status >= 500) return "Something went wrong. Please try again.";
    return backendMessage || "Something went wrong. Please try again.";
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await window.fetch(`${config.API_BASE_URL}${path}`, options);
    } catch (error) {
      throw createError(0, "Something went wrong. Please try again.");
    }

    const payload = await parseResponseBody(response);
    if (!response.ok) {
      throw createError(response.status, getFriendlyMessage(response.status, payload), payload);
    }

    return payload;
  }

  function getProtectedHeaders() {
    const token = auth.getAccessToken();
    if (!token) {
      throw createError(401, "Please sign in to continue.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  function extractRoomItems(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.Items)) return payload.Items;
    if (
      payload &&
      typeof payload === "object" &&
      ((typeof payload.roomId === "string" && payload.roomId.trim()) ||
        (typeof payload.roomName === "string" && payload.roomName.trim()) ||
        (typeof payload.PK === "string" && payload.PK.trim()))
    ) {
      return [payload];
    }

    return [];
  }

  async function getRooms() {
    const payload = await request("/rooms", {
      method: "GET",
    });

    return extractRoomItems(payload);
  }

  async function getBookings() {
    const payload = await request("/bookings", {
      method: "GET",
      headers: getProtectedHeaders(),
    });

    return Array.isArray(payload.items) ? payload.items : [];
  }

  async function createBooking(data) {
    const payload = await request("/bookings", {
      method: "POST",
      headers: {
        ...getProtectedHeaders(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        roomId: String(data && data.roomId ? data.roomId : "").trim(),
        checkIn: data ? data.checkIn : "",
        checkOut: data ? data.checkOut : "",
        guests: Number(data && data.guests),
      }),
    });

    return payload;
  }

  window.SmartResortApi = Object.freeze({
    getRooms,
    getBookings,
    createBooking,
  });
})();
