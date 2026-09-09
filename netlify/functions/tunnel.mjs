// Ad blockers drop requests to *.ingest.sentry.io, so the browser posts
// envelopes here instead and this forwards them from the server.
const SENTRY_HOST = "o4511803623211008.ingest.us.sentry.io";
const ALLOWED_PROJECTS = new Set(["4512052958527488"]);

// Without this the endpoint would forward anywhere anyone asked it to.
export function upstreamFor(headerLine) {
  let header;
  try {
    header = JSON.parse(headerLine);
  } catch {
    return null;
  }

  if (typeof header?.dsn !== "string") {
    return null;
  }

  let dsn;
  try {
    dsn = new URL(header.dsn);
  } catch {
    return null;
  }

  const project = dsn.pathname.replace(/^\//, "");

  if (dsn.hostname !== SENTRY_HOST || !ALLOWED_PROJECTS.has(project)) {
    return null;
  }

  return `https://${SENTRY_HOST}/api/${project}/envelope/`;
}

export default async function tunnel(request) {
  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const envelope = await request.text();
  const upstream = upstreamFor(envelope.slice(0, envelope.indexOf("\n")));

  if (upstream === null) {
    return new Response("envelope is not for this project", { status: 400 });
  }

  const sent = await fetch(upstream, {
    method: "POST",
    body: envelope,
    headers: { "Content-Type": "application/x-sentry-envelope" },
  });

  // The SDK backs off on these; dropping them makes it retry into a wall.
  const headers = new Headers();
  for (const name of ["x-sentry-rate-limits", "retry-after"]) {
    const value = sent.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  return new Response(await sent.text(), { status: sent.status, headers });
}
