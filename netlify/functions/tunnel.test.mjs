import { describe, expect, it } from "vitest";
import { upstreamFor } from "./tunnel.mjs";

const DSN = "https://b822c40c02f0075b1cc91d67d2f48ea4@o4511803623211008.ingest.us.sentry.io/4512052958527488";
const header = (extra) => JSON.stringify({ event_id: "abc", ...extra });

describe("deciding where an envelope may be forwarded", () => {
  it("forwards an envelope carrying this project's own DSN", () => {
    expect(upstreamFor(header({ dsn: DSN }))).toBe(
      "https://o4511803623211008.ingest.us.sentry.io/api/4512052958527488/envelope/"
    );
  });

  it("refuses another host, so this is not an open proxy", () => {
    const elsewhere = "https://key@evil.example.com/4512052958527488";
    expect(upstreamFor(header({ dsn: elsewhere }))).toBe(null);
  });

  it("refuses another project on the same host", () => {
    const other = "https://key@o4511803623211008.ingest.us.sentry.io/9999999999";
    expect(upstreamFor(header({ dsn: other }))).toBe(null);
  });

  it("refuses an envelope with no DSN at all", () => {
    expect(upstreamFor(header({}))).toBe(null);
  });

  it("refuses a header that is not JSON", () => {
    expect(upstreamFor("not json")).toBe(null);
  });

  it("refuses a DSN that is not a URL", () => {
    expect(upstreamFor(header({ dsn: "nonsense" }))).toBe(null);
  });

  it("refuses a non-string DSN", () => {
    expect(upstreamFor(header({ dsn: 42 }))).toBe(null);
  });
});
