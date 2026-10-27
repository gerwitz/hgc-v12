import blake from "blakejs";
import moment from "moment";

const hashV2Epoch = Date.parse("2026-07-01T00:00:00Z");
const base32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

// Preserve the original offset in the payload, but compare instants for version selection.
export const twtxtHash = (url, timestamp, text) =>
{
  const created = moment.parseZone(timestamp, moment.ISO_8601, true);
  if (!created.isValid())
  {
    throw new RangeError("Invalid twtxt timestamp");
  }

  const canonicalTimestamp = created.format("YYYY-MM-DD[T]HH:mm:ssZ").replace(/\+00:00$/, "Z");
  const payload = `${url}\n${canonicalTimestamp}\n${text}`;
  const digest = blake.blake2b(Buffer.from(payload, "utf8"), undefined, 32);
  let encoded = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of digest)
  {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5)
    {
      bits -= 5;
      encoded += base32Alphabet[(buffer >>> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }

  if (bits > 0)
  {
    encoded += base32Alphabet[(buffer << (5 - bits)) & 31];
  }

  return created.valueOf() < hashV2Epoch ? encoded.slice(-7) : encoded.slice(0, 12);
};
