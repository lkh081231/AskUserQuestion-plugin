export function normalizeAppOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_ORIGIN must be an absolute HTTPS origin.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "APP_ORIGIN must contain only an HTTPS origin, for example https://questions.example.com.",
    );
  }

  return url.origin;
}
