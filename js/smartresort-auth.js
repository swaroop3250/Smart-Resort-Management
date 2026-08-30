(() => {
  const config = window.SmartResortConfig;
  const memoryStorage = {};
  const ROUTES = ["home", "reviews", "rooms", "activities", "login", "booking", "dashboard"];
  const SESSION_KEY = "smartresort.auth.session";
  const PKCE_KEY = "smartresort.auth.pkce";

  const storage = {
    getItem(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch (error) {
        return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
      }
    },
    setItem(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch (error) {
        memoryStorage[key] = value;
      }
    },
    removeItem(key) {
      try {
        window.sessionStorage.removeItem(key);
      } catch (error) {
        delete memoryStorage[key];
      }
    },
  };

  function readJson(key) {
    const raw = storage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      storage.removeItem(key);
      return null;
    }
  }

  function writeJson(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function toBase64Url(bytes) {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return window.atob(padded);
  }

  function decodeJwt(token) {
    if (typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length < 2) return null;

    try {
      return JSON.parse(fromBase64Url(parts[1]));
    } catch (error) {
      return null;
    }
  }

  function createRandomString(byteLength) {
    const bytes = new Uint8Array(byteLength);
    window.crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  }

  async function createCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(verifier));
    return toBase64Url(new Uint8Array(digest));
  }

  function normalizeRoute(route) {
    if (typeof route !== "string") return "booking";
    const normalized = route.trim().toLowerCase();
    if (!ROUTES.includes(normalized) || normalized === "login") return "booking";
    return normalized;
  }

  function getCurrentRoute() {
    const hashRoute = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (ROUTES.includes(hashRoute)) return hashRoute;

    const bodyRoute = String(document.body && document.body.dataset ? document.body.dataset.page || "" : "")
      .trim()
      .toLowerCase();
    return ROUTES.includes(bodyRoute) ? bodyRoute : "home";
  }

  function clearStoredAuth() {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(PKCE_KEY);
  }

  function replaceUrlHash(route) {
    const safeRoute = route ? `#${route}` : "";
    window.history.replaceState({}, document.title, `${window.location.pathname}${safeRoute}`);
  }

  function formatName(value) {
    const base = String(value || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();

    if (!base) return "Resort Guest";
    return base.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function readSession() {
    const session = readJson(SESSION_KEY);
    if (!session || typeof session !== "object") return null;
    if (typeof session.accessToken !== "string" || typeof session.idToken !== "string") {
      clearStoredAuth();
      return null;
    }

    if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
      clearStoredAuth();
      return null;
    }

    return session;
  }

  function getCurrentUser() {
    const session = readSession();
    if (!session) return null;

    const payload = session.idTokenPayload || decodeJwt(session.idToken) || decodeJwt(session.accessToken) || {};
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const sub = typeof payload.sub === "string" ? payload.sub : "";

    return {
      sub,
      guestId: sub,
      email,
      name: formatName(payload.name || email || payload.phone_number || "Resort Guest"),
      phoneNumber: typeof payload.phone_number === "string" ? payload.phone_number : "",
      role: "guest",
      workerId: "",
    };
  }

  async function login(options = {}) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Secure sign-in is unavailable in this browser.");
    }

    const verifier = createRandomString(64);
    const challenge = await createCodeChallenge(verifier);
    const state = createRandomString(32);
    const returnRoute = normalizeRoute(options.returnRoute || getCurrentRoute());

    writeJson(PKCE_KEY, {
      verifier,
      state,
      returnRoute,
      createdAt: Date.now(),
    });

    const authorizationUrl = new URL(`${config.COGNITO_DOMAIN}/oauth2/authorize`);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", config.COGNITO_CLIENT_ID);
    authorizationUrl.searchParams.set("redirect_uri", config.REDIRECT_URI);
    authorizationUrl.searchParams.set("scope", config.OAUTH_SCOPES.join(" "));
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("code_challenge", challenge);

    window.location.assign(authorizationUrl.toString());
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const authCode = params.get("code");
    const returnedState = params.get("state");

    if (!authError && !authCode) {
      return getCurrentUser();
    }

    const pkceState = readJson(PKCE_KEY);
    if (authError) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Unable to sign in. Please try again.");
    }

    if (!pkceState || !pkceState.verifier || !pkceState.state || pkceState.state !== returnedState) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Your sign-in session expired. Please try again.");
    }

    let tokenResponse;
    try {
      tokenResponse = await window.fetch(`${config.COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.COGNITO_CLIENT_ID,
          code: authCode,
          redirect_uri: config.REDIRECT_URI,
          code_verifier: pkceState.verifier,
        }).toString(),
      });
    } catch (error) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Unable to complete sign-in right now. Please try again.");
    }

    if (!tokenResponse.ok) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Unable to complete sign-in right now. Please try again.");
    }

    let tokenPayload;
    try {
      tokenPayload = await tokenResponse.json();
    } catch (error) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Unable to complete sign-in right now. Please try again.");
    }

    if (
      !tokenPayload ||
      typeof tokenPayload.access_token !== "string" ||
      typeof tokenPayload.id_token !== "string"
    ) {
      clearStoredAuth();
      replaceUrlHash("login");
      throw new Error("Unable to complete sign-in right now. Please try again.");
    }

    const expiresInSeconds = Number(tokenPayload.expires_in) || 3600;
    const idTokenPayload = decodeJwt(tokenPayload.id_token) || {};

    writeJson(SESSION_KEY, {
      accessToken: tokenPayload.access_token,
      idToken: tokenPayload.id_token,
      refreshToken: tokenPayload.refresh_token || "",
      tokenType: tokenPayload.token_type || "Bearer",
      expiresAt: Date.now() + expiresInSeconds * 1000,
      idTokenPayload,
    });

    storage.removeItem(PKCE_KEY);
    replaceUrlHash(normalizeRoute(pkceState.returnRoute));
    return getCurrentUser();
  }

  function isAuthenticated() {
    return Boolean(readSession());
  }

  function getAccessToken() {
    const session = readSession();
    return session ? session.accessToken : null;
  }

  function logout(options = {}) {
    const shouldRedirect = options.redirect !== false;
    clearStoredAuth();

    if (!shouldRedirect) return;

    const logoutUrl = new URL(`${config.COGNITO_DOMAIN}/logout`);
    logoutUrl.searchParams.set("client_id", config.COGNITO_CLIENT_ID);
    logoutUrl.searchParams.set("logout_uri", config.LOGOUT_URI);
    window.location.assign(logoutUrl.toString());
  }

  window.SmartResortAuth = Object.freeze({
    login,
    handleCallback,
    logout,
    isAuthenticated,
    getAccessToken,
    getCurrentUser,
  });
})();
