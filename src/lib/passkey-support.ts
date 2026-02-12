export function getPasskeySupportDetails() {
  if (typeof window === "undefined") {
    return {
      supported: false,
      reason: "window is unavailable",
      origin: "unknown",
      isSecureContext: false,
      publicKeyCredentialType: "undefined",
    };
  }

  const publicKeyCredentialType = typeof window.PublicKeyCredential;
  const isSupported = publicKeyCredentialType === "function";
  const isSecureContext = window.isSecureContext;
  const origin = window.location.origin;

  let reason: string | null = null;
  if (!isSecureContext) {
    reason = "page is not a secure context";
  } else if (!isSupported) {
    reason = "PublicKeyCredential is unavailable";
  }

  return {
    supported: isSupported && isSecureContext,
    reason,
    origin,
    isSecureContext,
    publicKeyCredentialType,
  };
}

export function getPasskeyUnsupportedMessage() {
  const details = getPasskeySupportDetails();
  if (details.supported) return null;

  return [
    "passkey is unavailable in this browser context.",
    `origin=${details.origin}`,
    `secureContext=${details.isSecureContext ? "yes" : "no"}`,
    `PublicKeyCredential=${details.publicKeyCredentialType}`,
    details.reason ? `reason=${details.reason}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
