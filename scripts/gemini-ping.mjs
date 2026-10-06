import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG = fileURLToPath(new URL("../src/_editions/gemini/pings.json", import.meta.url));
const DEFAULT_READY_URL = "gemini://hans.gerwitz.com/gemlog/";
const DEFAULT_READY_FILE = "/srv/calmserve/gemlog/index.gmi";
const MAX_HEADER_BYTES = 1024;
const MAX_BODY_BYTES = 1024 * 1024;

const normalizeUrl = (value) =>
{
  if (typeof value !== "string" || /[\r\n]/.test(value))
  {
    throw new Error("Endpoints must be single-line Gemini URLs.");
  }

  const url = new URL(value);
  if (url.protocol !== "gemini:" || !url.hostname)
  {
    throw new Error("Endpoints must use gemini:// with a hostname.");
  }

  url.hash = "";
  if (Buffer.byteLength(url.href) + 2 > 1024)
  {
    throw new Error("Gemini request URLs must fit within 1024 bytes including CRLF.");
  }

  return url.href;
};

export const loadEndpoints = async (filePath) =>
{
  const endpoints = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(endpoints))
  {
    throw new Error("The Gemini ping configuration must be a JSON array of URLs.");
  }

  return endpoints.map(normalizeUrl);
};

export const geminiRequest = async (value, { readBody = false, timeoutMs = 5000, connect = tls.connect } = {}) =>
{
  const url = new URL(normalizeUrl(value));
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  return new Promise((resolve, reject) =>
  {
    // Gemini endpoints commonly use self-signed certificates; verification is intentionally disabled.
    const socket = connect({
      host: hostname,
      port: Number(url.port || 1965),
      servername: isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: false,
    });
    let settled = false;
    let header = Buffer.alloc(0);
    let response;
    let bodyBytes = 0;
    const bodyChunks = [];

    const finish = (error) =>
    {
      if (settled)
      {
        return;
      }

      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error)
      {
        reject(error);
      }
      else
      {
        resolve({ ...response, body: Buffer.concat(bodyChunks) });
      }
    };
    const timer = setTimeout(() => finish(new Error("Gemini request timed out.")), timeoutMs);
    const appendBody = (chunk) =>
    {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES)
      {
        finish(new Error("Gemini readiness response exceeded 1 MiB."));
        return;
      }
      bodyChunks.push(chunk);
    };

    socket.once("secureConnect", () => socket.write(`${url.href}\r\n`));
    socket.once("error", finish);
    socket.on("data", (chunk) =>
    {
      if (settled)
      {
        return;
      }

      if (response)
      {
        appendBody(chunk);
        return;
      }

      header = Buffer.concat([header, chunk]);
      const end = header.indexOf("\r\n");
      if ((end < 0 && header.length > MAX_HEADER_BYTES) || end + 2 > MAX_HEADER_BYTES)
      {
        finish(new Error("Gemini response header exceeded 1024 bytes."));
        return;
      }
      if (end < 0)
      {
        return;
      }

      const match = header.subarray(0, end).toString("utf8").match(/^([1-6][0-9]) ([^\r\n]*)$/);
      if (!match)
      {
        finish(new Error("Invalid Gemini response header."));
        return;
      }

      response = { status: Number(match[1]), meta: match[2] };
      if (!readBody || response.status < 20 || response.status >= 30)
      {
        finish();
        return;
      }

      appendBody(header.subarray(end + 2));
      header = Buffer.alloc(0);
    });
    socket.once("end", () => finish(response ? undefined : new Error("Incomplete Gemini response header.")));
    socket.once("close", () => finish(new Error("Gemini connection closed before the response completed.")));
  });
};

const requestSuccess = async (value, { request, readBody }) =>
{
  let url = normalizeUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1)
  {
    const response = await request(url, { readBody });
    if (response.status >= 20 && response.status < 30)
    {
      return response;
    }

    if (response.status >= 30 && response.status < 40 && redirects < 3)
    {
      url = normalizeUrl(new URL(response.meta, url).href);
      continue;
    }

    const error = new Error(`Gemini response ${response.status}${response.status >= 30 && response.status < 40 ? " (redirect limit reached)" : ""}.`);
    error.retryable = response.status >= 40 && response.status < 50;
    throw error;
  }
};

const retry = async (operation, { retries, delayMs, sleep: wait }) =>
{
  for (let attempt = 0; attempt <= retries; attempt += 1)
  {
    try
    {
      return await operation();
    }
    catch (error)
    {
      if (attempt === retries || error.retryable === false)
      {
        throw error;
      }
      await wait(delayMs);
    }
  }
};

// Do not expose query strings in deployment logs, even if an endpoint uses a token.
const logUrl = (value) =>
{
  const url = new URL(value);
  return `${url.protocol}//${url.host}${url.pathname}`;
};

export const pingAfterDeployment = async ({
  endpoints,
  readyUrl = DEFAULT_READY_URL,
  expectedBody,
  request = geminiRequest,
  retries = 2,
  delayMs = 1000,
  sleep: wait = sleep,
  logger = console,
}) =>
{
  const result = { ready: false, sent: 0, failed: 0, skipped: 0 };
  if (!endpoints.length)
  {
    logger.log("No Gemini ping endpoints configured; nothing to do.");
    return result;
  }

  const retryOptions = { retries, delayMs, sleep: wait };
  try
  {
    await retry(async () =>
    {
      const response = await requestSuccess(readyUrl, { request, readBody: true });
      if (!Buffer.from(response.body).equals(Buffer.from(expectedBody)))
      {
        throw new Error("The public Gemlog does not yet match this deployment.");
      }
    }, retryOptions);
    result.ready = true;
  }
  catch (error)
  {
    result.skipped = endpoints.length;
    logger.warn(`Skipping Gemini pings: ${error.message}`);
    return result;
  }

  for (const endpoint of endpoints)
  {
    try
    {
      const response = await retry(() => requestSuccess(endpoint, { request, readBody: false }), retryOptions);
      result.sent += 1;
      logger.log(`Gemini ping succeeded: ${logUrl(endpoint)} (${response.status}).`);
    }
    catch (error)
    {
      result.failed += 1;
      logger.warn(`Gemini ping failed: ${logUrl(endpoint)}: ${error.message}`);
    }
  }

  logger.log(`Gemini pings complete: ${result.sent} sent, ${result.failed} failed.`);
  return result;
};

const main = async () =>
{
  const arguments_ = process.argv.slice(2);
  const dryRun = arguments_.includes("--dry-run");
  const paths = arguments_.filter((argument) => argument !== "--dry-run");
  if (paths.length > 1 || paths.some((argument) => argument.startsWith("--")))
  {
    throw new Error("Usage: node gemini-ping.mjs [config.json] [--dry-run]");
  }


  const endpoints = await loadEndpoints(paths[0] || DEFAULT_CONFIG);
  if (dryRun)
  {
    console.log(`Configured Gemini endpoints: ${endpoints.length}. No requests made.`);
    endpoints.forEach((endpoint) => console.log(logUrl(endpoint)));
    return;
  }

  const expectedBody = endpoints.length
    ? await readFile(process.env.GEMINI_PING_READY_FILE || DEFAULT_READY_FILE)
    : Buffer.alloc(0);
  await pingAfterDeployment({
    endpoints,
    expectedBody,
    readyUrl: process.env.GEMINI_PING_READY_URL || DEFAULT_READY_URL,
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  main().catch((error) =>
  {
    console.error(`Gemini ping configuration error: ${error.message}`);
    process.exitCode = 1;
  });
}
