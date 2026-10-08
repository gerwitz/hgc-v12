#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG = "/etc/calmserve/pings.json";
const DEFAULT_READY_URL = "https://hans.gerwitz.com/.well-known/calmserve/updated.svg";
const DEFAULT_READY_FILE = "/usr/share/nginx/html/.well-known/calmserve/updated.svg";
const MAX_HEADER_BYTES = 1024;
const MAX_BODY_BYTES = 1024 * 1024;
const VARIABLES = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

// Only errors created here may reach logs; transport errors can contain credentials.
const failure = (message, retryable = false) => Object.assign(new Error(message), { retryable, notificationSafe: true });
const safeMessage = (error) => error?.notificationSafe ? error.message : "Request failed.";

const normalizeUrl = (value) =>
{
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value))
  {
    throw failure("Endpoints must be single-line URLs.");
  }

  const parts = value.match(/^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)([^#]*)(#.*)?$/i);
  if (!parts || parts[1].includes("${") || parts[2].includes("${") || parts[4]?.includes("${") || value.replace(VARIABLES, "").includes("${"))
  {
    throw failure("URL variables are allowed only in paths and queries.");
  }

  // Protect placeholders from URL canonicalization without resolving any secrets.
  let marker = "calmserve-variable-";
  while (value.includes(marker))
  {
    marker += "x";
  }
  const variables = [];
  const protectedValue = value.replace(VARIABLES, (match) =>
  {
    variables.push(match);
    return `${marker}${variables.length}-end`;
  });
  let url;
  try
  {
    url = new URL(protectedValue);
  }
  catch
  {
    throw failure("Invalid endpoint URL.");
  }
  if (!["gemini:", "http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password)
  {
    throw failure("Endpoints must use Gemini, HTTP, or HTTPS with a hostname and no URL credentials.");
  }
  url.hash = "";
  let normalized = url.href;
  variables.forEach((variable, index) =>
  {
    normalized = normalized.replaceAll(`${marker}${index + 1}-end`, variable);
  });
  if (url.protocol === "gemini:" && Buffer.byteLength(normalized) + 2 > 1024)
  {
    throw failure("Gemini request URLs must fit within 1024 bytes including CRLF.");
  }
  return normalized;
};

const transformBody = (value, replace) =>
{
  if (typeof value === "string")
  {
    return replace(value);
  }
  if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))
  {
    return value;
  }
  if (Array.isArray(value))
  {
    return value.map((item) => transformBody(item, replace));
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype)
  {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformBody(item, replace)]));
  }
  throw failure("Notification bodies must be strings or JSON values.");
};

const normalizeEndpoint = (endpoint) =>
{
  if (typeof endpoint === "string")
  {
    return normalizeUrl(endpoint);
  }
  if (!endpoint || Array.isArray(endpoint) || typeof endpoint !== "object" || Object.keys(endpoint).some((key) => !["url", "method", "headers", "body"].includes(key)))
  {
    throw failure("Endpoints must be URL strings or notification objects.");
  }
  const url = normalizeUrl(endpoint.url);
  if (!["GET", "POST"].includes(endpoint.method))
  {
    throw failure("Notification methods must be GET or POST.");
  }
  const hasHeaders = Object.hasOwn(endpoint, "headers");
  const hasBody = Object.hasOwn(endpoint, "body");
  if (new URL(url).protocol === "gemini:" && (endpoint.method !== "GET" || hasHeaders || hasBody))
  {
    throw failure("Gemini objects support only GET without headers or a body.");
  }
  if (endpoint.method === "GET" && hasBody)
  {
    throw failure("GET notifications cannot include a body.");
  }
  if (hasHeaders)
  {
    if (!endpoint.headers || Array.isArray(endpoint.headers) || typeof endpoint.headers !== "object" || Object.values(endpoint.headers).some((value) => typeof value !== "string") || Object.keys(endpoint.headers).some((key) => key.includes("${")))
    {
      throw failure("Notification headers must be a string map with literal names.");
    }
    try
    {
      new Headers(endpoint.headers);
    }
    catch
    {
      throw failure("Invalid notification headers.");
    }
  }
  if (hasBody)
  {
    transformBody(endpoint.body, (value) => value);
  }
  return { ...endpoint, url };
};

export const loadEndpoints = async (filePath = DEFAULT_CONFIG) =>
{
  let endpoints;
  try
  {
    endpoints = JSON.parse(await readFile(filePath, "utf8"));
  }
  catch
  {
    throw failure("Unable to read or parse the notification configuration.");
  }
  if (!Array.isArray(endpoints))
  {
    throw failure("The notification configuration must be a JSON array.");
  }
  return endpoints.map(normalizeEndpoint);
};

const resolveEndpoint = (endpoint, env) =>
{
  const normalized = normalizeEndpoint(endpoint);
  const options = typeof normalized === "string" ? { url: normalized, method: "GET" } : normalized;
  const replace = (value, encode = false) => value.replace(VARIABLES, (match, name) =>
  {
    if (!Object.hasOwn(env, name) || typeof env[name] !== "string" || !env[name])
    {
      throw failure("A required environment variable is missing or empty.");
    }
    // A single replacement pass prevents expansion of variables inside secret values.
    return encode ? encodeURIComponent(env[name]).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`) : env[name];
  });
  const substitutedUrl = replace(options.url, true);
  const url = normalizeUrl(substitutedUrl);
  if (url !== substitutedUrl)
  {
    throw failure("URL substitution must not change the URI structure.");
  }
  const headers = options.headers && Object.fromEntries(Object.entries(options.headers).map(([key, value]) => [key, replace(value)]));
  let body;
  if (Object.hasOwn(options, "body"))
  {
    const resolvedBody = transformBody(options.body, replace);
    body = typeof resolvedBody === "string" ? resolvedBody : JSON.stringify(resolvedBody);
    if (typeof resolvedBody !== "string" && !Object.keys(headers || {}).some((key) => key.toLowerCase() === "content-type"))
    {
      return normalizeEndpoint({ url, method: options.method, headers: { ...headers, "content-type": "application/json" }, body });
    }
  }
  return normalizeEndpoint({ url, method: options.method, ...(headers && { headers }), ...(body !== undefined && { body }) });
};

export const geminiRequest = async (value, { readBody = false, timeoutMs = 5000, connect = tls.connect } = {}) =>
{
  const url = new URL(normalizeUrl(value));
  if (url.protocol !== "gemini:")
  {
    throw failure("Gemini requests require a Gemini URL.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  return new Promise((resolve, reject) =>
  {
    let socket;
    try
    {
      // Gemini endpoints commonly use self-signed certificates; verification is intentionally disabled.
      socket = connect({
        host: hostname,
        port: Number(url.port || 1965),
        servername: isIP(hostname) ? undefined : hostname,
        rejectUnauthorized: false,
      });
    }
    catch
    {
      reject(failure("Gemini connection failed.", true));
      return;
    }
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
    const timer = setTimeout(() => finish(failure("Gemini request timed out.", true)), timeoutMs);
    const appendBody = (chunk) =>
    {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES)
      {
        finish(failure("Gemini readiness response exceeded 1 MiB."));
        return;
      }
      bodyChunks.push(chunk);
    };

    socket.once("secureConnect", () => socket.write(`${url.href}\r\n`));
    socket.once("error", () => finish(failure("Gemini connection failed.", true)));
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
        finish(failure("Gemini response header exceeded 1024 bytes."));
        return;
      }
      if (end < 0)
      {
        return;
      }
      const match = header.subarray(0, end).toString("utf8").match(/^([1-6][0-9]) ([^\r\n]*)$/);
      if (!match)
      {
        finish(failure("Invalid Gemini response header."));
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
    socket.once("end", () => finish(response ? undefined : failure("Incomplete Gemini response header.", true)));
    socket.once("close", () => finish(failure("Gemini connection closed before the response completed.", true)));
  });
};

export const httpRequest = async (value, { method = "GET", headers, body, readBody = false, timeoutMs = 5000, fetch: fetchRequest = globalThis.fetch } = {}) =>
{
  const url = normalizeUrl(value);
  if (!["http:", "https:"].includes(new URL(url).protocol))
  {
    throw failure("HTTP requests require an HTTP or HTTPS URL.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try
  {
    // Native fetch retains normal HTTPS certificate verification; redirects are handled below.
    const response = await fetchRequest(url, { method, headers, body, redirect: "manual", credentials: "omit", signal: controller.signal });
    const result = { status: response.status, meta: response.headers.get("location") || "", body: Buffer.alloc(0) };
    if (!readBody || response.status < 200 || response.status >= 300)
    {
      // Notification responses need only their headers, even when the peer streams indefinitely.
      try
      {
        await response.body?.cancel();
      }
      catch
      {
        // Cancellation cannot change a status already received.
      }
      return result;
    }
    let bodyBytes = 0;
    const chunks = [];
    for await (const chunk of response.body || [])
    {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES)
      {
        throw failure("HTTP readiness response exceeded 1 MiB.");
      }
      chunks.push(Buffer.from(chunk));
    }
    return { ...result, body: Buffer.concat(chunks) };
  }
  catch (error)
  {
    throw error?.notificationSafe ? error : failure("HTTP request failed.", true);
  }
  finally
  {
    clearTimeout(timer);
  }
};

const requestSuccess = async (endpoint, { request, readBody }) =>
{
  const { url: initialUrl, ...options } = endpoint;
  let url = initialUrl;
  const gemini = new URL(url).protocol === "gemini:";
  for (let redirects = 0; redirects <= 3; redirects += 1)
  {
    let response;
    try
    {
      response = await request(url, { ...options, readBody });
    }
    catch (error)
    {
      throw error?.notificationSafe ? error : failure(gemini ? "Gemini request failed." : "HTTP request failed.", true);
    }
    const status = response.status;
    if (!Number.isInteger(status))
    {
      throw failure("Invalid response status.");
    }
    if (gemini ? status >= 20 && status < 30 : status >= 200 && status < 300)
    {
      return response;
    }
    const redirect = gemini ? status >= 30 && status < 40 : [301, 302, 303, 307, 308].includes(status);
    if (redirect)
    {
      if (redirects === 3 || endpoint.method !== "GET")
      {
        throw failure("Redirect limit reached or POST redirect rejected.");
      }
      let target;
      try
      {
        if (!response.meta)
        {
          throw failure("Missing redirect target.");
        }
        target = normalizeUrl(new URL(response.meta, url).href);
      }
      catch
      {
        throw failure("Invalid redirect target.");
      }
      if (gemini ? new URL(target).protocol !== "gemini:" : new URL(target).origin !== new URL(url).origin)
      {
        throw failure("Cross-protocol or cross-origin redirect rejected.");
      }
      url = target;
      continue;
    }
    throw failure(`${gemini ? "Gemini" : "HTTP"} response ${status}.`, gemini ? status >= 40 && status < 50 : status === 429 || (status >= 500 && status < 600));
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

// Host/index labels omit paths, queries, headers, bodies, and resolved variables.
const logEndpoint = (endpoint, index) =>
{
  try
  {
    const url = new URL(typeof endpoint === "string" ? endpoint : endpoint.url);
    return `${index + 1} (${url.protocol}//${url.host})`;
  }
  catch
  {
    return `${index + 1}`;
  }
};

export const pingAfterDeployment = async ({
  endpoints,
  readyUrl = DEFAULT_READY_URL,
  expectedBody,
  request,
  fetch: fetchRequest = globalThis.fetch,
  connect = tls.connect,
  env = process.env,
  retries = 2,
  delayMs = 1000,
  sleep: wait = sleep,
  logger = console,
}) =>
{
  const result = { ready: false, sent: 0, failed: 0, skipped: 0 };
  if (!endpoints.length)
  {
    logger.log("No notification endpoints configured; nothing to do.");
    return result;
  }
  const dispatch = request || ((url, options) => new URL(url).protocol === "gemini:"
    ? geminiRequest(url, { ...options, connect })
    : httpRequest(url, { ...options, fetch: fetchRequest }));
  const retryOptions = { retries, delayMs, sleep: wait };
  try
  {
    const readiness = resolveEndpoint(readyUrl, env);
    await retry(async () =>
    {
      const response = await requestSuccess(readiness, { request: dispatch, readBody: true });
      if (!Buffer.from(response.body).equals(Buffer.from(expectedBody)))
      {
        throw failure("The public readiness body does not yet match this deployment.", true);
      }
    }, retryOptions);
    result.ready = true;
  }
  catch (error)
  {
    result.skipped = endpoints.length;
    logger.warn(`Skipping notifications: ${safeMessage(error)}`);
    return result;
  }
  for (const [index, endpoint] of endpoints.entries())
  {
    const label = logEndpoint(endpoint, index);
    try
    {
      const resolved = resolveEndpoint(endpoint, env);
      const response = await retry(() => requestSuccess(resolved, { request: dispatch, readBody: false }), { ...retryOptions, retries: resolved.method === "POST" ? 0 : retries });
      result.sent += 1;
      logger.log(`Notification ${label} succeeded (${response.status}).`);
    }
    catch (error)
    {
      result.failed += 1;
      logger.warn(`Notification ${label} failed: ${safeMessage(error)}`);
    }
  }
  logger.log(`Notifications complete: ${result.sent} sent, ${result.failed} failed.`);
  return result;
};

const main = async () =>
{
  const arguments_ = process.argv.slice(2);
  const dryRun = arguments_.includes("--dry-run");
  const paths = arguments_.filter((argument) => argument !== "--dry-run");
  if (paths.length > 1 || paths.some((argument) => argument.startsWith("--")))
  {
    throw failure("Usage: calmserve-notify [config.json] [--dry-run]");
  }
  const endpoints = await loadEndpoints(paths[0] || DEFAULT_CONFIG);
  if (dryRun)
  {
    console.log(`Configured notification endpoints: ${endpoints.length}. No requests made.`);
    endpoints.forEach((endpoint, index) => console.log(logEndpoint(endpoint, index)));
    return;
  }
  console.log(`Notifications configured: ${endpoints.length}.`);
  let expectedBody = Buffer.alloc(0);
  if (endpoints.length)
  {
    try
    {
      expectedBody = await readFile(process.env.PING_READY_FILE || process.env.GEMINI_PING_READY_FILE || DEFAULT_READY_FILE);
    }
    catch
    {
      console.warn("Skipping notifications: local readiness file is unavailable.");
      return;
    }
  }
  await pingAfterDeployment({
    endpoints,
    expectedBody,
    readyUrl: process.env.PING_READY_URL || process.env.GEMINI_PING_READY_URL || DEFAULT_READY_URL,
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  main().catch((error) =>
  {
    console.error(`Notification configuration error: ${safeMessage(error)}`);
    process.exitCode = 1;
  });
}
