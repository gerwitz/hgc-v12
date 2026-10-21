import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const SITE_ORIGIN = "https://hans.gerwitz.com";
const metadataByPath = new Map();

const isPng = (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const isGif = (bytes) => bytes.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/);
const isJpeg = (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8;

const readJpegMetadata = (bytes) =>
{
  let offset = 2;

  while (offset < bytes.length)
  {
    if (bytes[offset] !== 0xff)
    {
      throw new Error("Invalid JPEG marker.");
    }

    while (bytes[offset] === 0xff)
    {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda)
    {
      break;
    }

    const length = bytes.readUInt16BE(offset);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame)
    {
      return {
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3),
        type: "image/jpeg",
      };
    }

    offset += length;
  }

  throw new Error("JPEG dimensions were not found.");
};

export const readImageMetadata = (filePath) =>
{
  const cached = metadataByPath.get(filePath);

  if (cached)
  {
    return cached;
  }

  const bytes = readFileSync(filePath);
  let metadata;

  if (isPng(bytes))
  {
    metadata = {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      type: "image/png",
    };
  }
  else if (isGif(bytes))
  {
    metadata = {
      width: bytes.readUInt16LE(6),
      height: bytes.readUInt16LE(8),
      type: "image/gif",
    };
  }
  else if (isJpeg(bytes))
  {
    metadata = readJpegMetadata(bytes);
  }
  else
  {
    throw new Error(`Unsupported social-preview image format: ${filePath}`);
  }

  metadataByPath.set(filePath, metadata);
  return metadata;
};

const sourcePathForImage = (image, inputPath) =>
{
  if (typeof image !== "string")
  {
    return null;
  }

  if (!image.startsWith("/") && !image.match(/^[a-z][a-z0-9+.-]*:/i) && typeof inputPath === "string")
  {
    const relativePath = path.resolve(process.cwd(), path.dirname(inputPath), image);

    if (existsSync(relativePath))
    {
      return relativePath;
    }
  }

  let url;
  try
  {
    url = new URL(image, SITE_ORIGIN);
  }
  catch
  {
    return null;
  }

  if (url.origin !== SITE_ORIGIN)
  {
    return null;
  }

  const relativePath = `.${decodeURIComponent(url.pathname)}`;
  const candidates = [
    path.resolve(process.cwd(), "src", relativePath),
    path.resolve(process.cwd(), "src/_meta", relativePath),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || null;
};

export const imageMetadata = (image, inputPath) =>
{
  const filePath = sourcePathForImage(image, inputPath);

  return filePath ? readImageMetadata(filePath) : {};
};

export const socialImageUrl = (image, pageUrl) =>
{
  return new URL(image, new URL(pageUrl, SITE_ORIGIN)).href;
};
