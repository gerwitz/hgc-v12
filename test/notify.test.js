import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { chmod, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { geminiRequest, httpRequest, loadEndpoints, pingAfterDeployment } from '../scripts/notify.mjs';

const readyUrl = 'gemini://public.example.invalid/ready.txt';
const expectedBody = 'Deployment ready.\n';
const endpoints = [
  'gemini://first.example.invalid/ping',
  'gemini://second.example.invalid/ping',
  'gemini://third.example.invalid/ping'
];
const logger = { log: () => {}, warn: () => {} };
const response = (status = 20, body = '') => ({
  status,
  meta: 'text/gemini; charset=utf-8',
  body: Buffer.from(body)
});

const withEndpointsFile = async (contents, callback) =>
{
  const directory = await mkdtemp(join(tmpdir(), 'notify-test-'));
  const filePath = join(directory, 'endpoints.json');

  try
  {
    await writeFile(filePath, contents);
    await callback(filePath);
  }
  finally
  {
    await rm(directory, { recursive: true, force: true });
  }
};

// Events are asynchronous, just like a TLS socket, without opening a connection.
const createConnection = (onWrite = () => {}, onConnect) =>
{
  const socket = new EventEmitter();
  const writes = [];
  let connectionOptions;
  let destroyed = false;

  socket.write = (chunk) =>
  {
    writes.push(Buffer.from(chunk));
    queueMicrotask(() => onWrite(socket));
    return true;
  };
  socket.destroy = () =>
  {
    if (!destroyed)
    {
      destroyed = true;
      queueMicrotask(() => socket.emit('close'));
    }
    return socket;
  };

  const connect = (options) =>
  {
    connectionOptions = options;
    queueMicrotask(() =>
    {
      if (onConnect)
      {
        onConnect(socket);
      }
      else
      {
        socket.emit('secureConnect');
      }
    });
    return socket;
  };

  return { connect, socket, writes, options: () => connectionOptions };
};

const createDeployment = (request, overrides = {}) => ({
  endpoints,
  readyUrl,
  expectedBody,
  request,
  retries: 2,
  delayMs: 17,
  sleep: async () => {},
  logger,
  ...overrides
});

test('the CLI runs without any enabling environment variable', async () =>
{
  await withEndpointsFile('[]', async (filePath) =>
  {
    const { stdout } = await promisify(execFile)(process.execPath, [
      fileURLToPath(new URL('../scripts/notify.mjs', import.meta.url)),
      filePath,
    ], { env: {} });
    assert.match(stdout, /Notifications configured: 0\./);
        assert.match(stdout, /No notification endpoints configured; nothing to do\./);
  });
});

test('loadEndpoints accepts an empty array', async () =>
{
  await withEndpointsFile('[]', async (filePath) =>
  {
    assert.deepEqual(await loadEndpoints(filePath), []);
  });
});

test('loadEndpoints returns canonical Gemini URL strings in input order', async () =>
{
  const input = [
    'GEMINI://first.example.invalid/path with spaces',
    'gemini://second.example.invalid:1966/ping?source=deployment'
  ];
  await withEndpointsFile(JSON.stringify(input), async (filePath) =>
  {
    assert.deepEqual(await loadEndpoints(filePath), [
      'gemini://first.example.invalid/path%20with%20spaces',
      'gemini://second.example.invalid:1966/ping?source=deployment'
    ]);
  });
});

test('loadEndpoints rejects invalid JSON, invalid shapes, and unsafe URLs', async (context) =>
{
  const invalidContents = [
    '{',
    '{}',
    'null',
    '"gemini://example.invalid/ping"',
    '[1]',
    '[null]',
    '[{}]',
    JSON.stringify(['ftp://example.invalid/ping']),
    JSON.stringify(['https://user:password@example.invalid/ping']),
    JSON.stringify(['https://${HOST}/ping']),
    JSON.stringify(['https://example.invalid/ping#${TOKEN}']),
    JSON.stringify(['https://example.invalid/${INVALID-NAME}']),
    JSON.stringify([{ url: endpoints[0], method: 'POST' }]),
    JSON.stringify([{ url: endpoints[0], method: 'GET', headers: {} }]),
    JSON.stringify([{ url: endpoints[0], method: 'GET', body: '' }]),
    JSON.stringify([{ url: 'https://example.invalid/', method: 'DELETE' }]),
    JSON.stringify([{ url: 'https://example.invalid/', method: 'GET', body: 'body' }]),
    JSON.stringify([{ url: 'https://example.invalid/', method: 'POST', headers: { token: 42 } }]),
    JSON.stringify([{ url: 'https://example.invalid/', method: 'POST', headers: { '${NAME}': 'value' } }]),
    JSON.stringify([{ url: 'https://example.invalid/', method: 'POST', headers: { token: 'bad\r\nvalue' } }]),
    JSON.stringify(['not a URL']),
    JSON.stringify(['gemini://example.invalid/ping\rnext']),
    JSON.stringify(['gemini://example.invalid/ping\nnext']),
    JSON.stringify(['gemini://example.invalid/ping\r\nnext'])
  ];

  for (const contents of invalidContents)
  {
    await context.test(JSON.stringify(contents), async () =>
    {
      await withEndpointsFile(contents, async (filePath) =>
      {
        await assert.rejects(() => loadEndpoints(filePath));
      });
    });
  }
});

test('geminiRequest frames the request and uses TLS with SNI and the default port', async () =>
{
  const url = endpoints[0];
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('20 text/gemini\r\nignored body'));
  });
  const result = await geminiRequest(url, { connect: connection.connect });

  assert.deepEqual(connection.writes, [Buffer.from(`${url}\r\n`)]);
  assert.equal(connection.options().host, 'first.example.invalid');
  assert.equal(connection.options().servername, 'first.example.invalid');
  assert.equal(Number(connection.options().port), 1965);
  assert.equal(connection.options().rejectUnauthorized, false);
  assert.deepEqual(result, { status: 20, meta: 'text/gemini', body: Buffer.alloc(0) });
});

test('geminiRequest honors an explicit port and parses a non-success header', async () =>
{
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('51 Not found\r\n'));
  });
  const result = await geminiRequest('gemini://example.invalid:1966/ping', {
    connect: connection.connect
  });

  assert.equal(Number(connection.options().port), 1966);
  assert.deepEqual(result, { status: 51, meta: 'Not found', body: Buffer.alloc(0) });
});

test('geminiRequest handles a header and CRLF split across data events', async () =>
{
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('2'));
    queueMicrotask(() =>
    {
      socket.emit('data', Buffer.from('0 text/gemini\r'));
      queueMicrotask(() => socket.emit('data', Buffer.from('\n')));
    });
  });

  assert.deepEqual(await geminiRequest(endpoints[0], { connect: connection.connect }), {
    status: 20,
    meta: 'text/gemini',
    body: Buffer.alloc(0)
  });
});

test('geminiRequest reads the complete binary body until end when requested', async () =>
{
  const firstChunk = Buffer.from([0, 255, 13]);
  const secondChunk = Buffer.from([10, 128, 42]);
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.concat([Buffer.from('20 application/octet-stream\r\n'), firstChunk]));
    queueMicrotask(() =>
    {
      socket.emit('data', secondChunk);
      socket.emit('end');
    });
  });

  assert.deepEqual(await geminiRequest(endpoints[0], {
    readBody: true,
    connect: connection.connect
  }), {
    status: 20,
    meta: 'application/octet-stream',
    body: Buffer.concat([firstChunk, secondChunk])
  });
});

test('geminiRequest rejects malformed, oversized, and incomplete headers', async (context) =>
{
  const headers = [
    'not a Gemini header\r\n',
    '2x text/gemini\r\n',
    '20text/gemini\r\n',
    `20 ${'x'.repeat(65536)}\r\n`,
    `20 ${'x'.repeat(65536)}`,
    '20 text/gemini\r',
    '20 text/gemini\n',
    ''
  ];

  for (const [index, header] of headers.entries())
  {
    await context.test(`invalid header ${index + 1}`, async () =>
    {
      const connection = createConnection((socket) =>
      {
        socket.emit('data', Buffer.from(header));
        socket.emit('end');
      });
      await assert.rejects(() => geminiRequest(endpoints[0], { connect: connection.connect }));
    });
  }
});

test('geminiRequest times out when the peer never sends a response', { timeout: 1000 }, async () =>
{
  const connection = createConnection();
  await assert.rejects(() => geminiRequest(endpoints[0], {
    connect: connection.connect,
    timeoutMs: 10
  }));
});

test('geminiRequest rejects TLS and response errors', async (context) =>
{
  for (const phase of ['connect', 'response'])
  {
    await context.test(phase, async () =>
    {
      const error = new Error(`${phase} failed`);
      const emitError = (socket) => socket.emit('error', error);
      const connection = phase === 'connect'
        ? createConnection(undefined, emitError)
        : createConnection(emitError);

      await assert.rejects(() => geminiRequest(endpoints[0], {
        connect: connection.connect
      }), { message: 'Gemini connection failed.' });
    });
  }
});

test('geminiRequest rejects a socket closed before a complete header', async () =>
{
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('20 text'));
    socket.emit('close');
  });
  await assert.rejects(() => geminiRequest(endpoints[0], { connect: connection.connect }));
});

test('geminiRequest accepts a body at the 1 MiB limit', async () =>
{
  const body = Buffer.alloc(1024 * 1024, 42);
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('20 application/octet-stream\r\n'));
    socket.emit('data', body);
    socket.emit('end');
  });
  const result = await geminiRequest(endpoints[0], {
    readBody: true,
    connect: connection.connect
  });

  assert.deepEqual(result.body, body);
});

test('geminiRequest rejects bodies exceeding 1 MiB across data events', async () =>
{
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.concat([
      Buffer.from('20 application/octet-stream\r\n'),
      Buffer.alloc(1024 * 1024)
    ]));
    queueMicrotask(() => socket.emit('data', Buffer.from([42])));
  });

  await assert.rejects(() => geminiRequest(endpoints[0], {
    readBody: true,
    connect: connection.connect
  }), /exceeded 1 MiB/);
});

test('geminiRequest rejects a body interrupted by close without end', async () =>
{
  const connection = createConnection((socket) =>
  {
    socket.emit('data', Buffer.from('20 text/gemini\r\npartial body'));
    queueMicrotask(() => socket.emit('close'));
  });

  await assert.rejects(() => geminiRequest(endpoints[0], {
    readBody: true,
    connect: connection.connect
  }), /closed before the response completed/);
});

test('pingAfterDeployment skips all requests for an empty endpoint list', async () =>
{
  const request = async () => assert.fail('An empty endpoint list must not make requests');
  const result = await pingAfterDeployment(createDeployment(request, { endpoints: [] }));

  assert.equal(typeof result.ready, 'boolean');
  assert.deepEqual({ sent: result.sent, failed: result.failed, skipped: result.skipped }, {
    sent: 0,
    failed: 0,
    skipped: 0
  });
});

test('pingAfterDeployment waits for the exact readiness body before pinging in order', async () =>
{
  const events = [];
  let readinessAttempts = 0;
  const request = async (url, options) =>
  {
    events.push({ url, readBody: options.readBody });
    if (url === readyUrl)
    {
      readinessAttempts += 1;
      return response(20, readinessAttempts === 1 ? 'Previous deployment.\n' : expectedBody);
    }
    return response();
  };
  const sleep = async (milliseconds) => events.push({ sleep: milliseconds });

  assert.deepEqual(await pingAfterDeployment(createDeployment(request, { sleep })), {
    ready: true,
    sent: 3,
    failed: 0,
    skipped: 0
  });
  assert.deepEqual(events, [
    { url: readyUrl, readBody: true },
    { sleep: 17 },
    { url: readyUrl, readBody: true },
    ...endpoints.map((url) => ({ url, readBody: false }))
  ]);
});

test('pingAfterDeployment requires byte-for-byte readiness body equality', async () =>
{
  const urls = [];
  const request = async (url) =>
  {
    urls.push(url);
    return response(20, 'Deployment ready.\r\n');
  };

  assert.deepEqual(await pingAfterDeployment(createDeployment(request)), {
    ready: false,
    sent: 0,
    failed: 0,
    skipped: endpoints.length
  });
  assert.deepEqual(urls, [readyUrl, readyUrl, readyUrl]);
});

test('pingAfterDeployment retries readiness errors and 4x responses within the bound', async (context) =>
{
  for (const failure of ['error', 40, 44])
  {
    await context.test(String(failure), async () =>
    {
      const urls = [];
      const waits = [];
      const request = async (url) =>
      {
        urls.push(url);
        if (failure === 'error')
        {
          throw new Error('Public readiness unavailable');
        }
        return response(failure, expectedBody);
      };
      const sleep = async (milliseconds) => waits.push(milliseconds);

      assert.deepEqual(await pingAfterDeployment(createDeployment(request, { sleep })), {
        ready: false,
        sent: 0,
        failed: 0,
        skipped: endpoints.length
      });
      assert.deepEqual(urls, [readyUrl, readyUrl, readyUrl]);
      assert.deepEqual(waits, [17, 17]);
    });
  }
});

test('pingAfterDeployment does not retry permanent readiness failures', async (context) =>
{
  for (const status of [10, 51, 60])
  {
    await context.test(String(status), async () =>
    {
      const urls = [];
      const request = async (url) =>
      {
        urls.push(url);
        return response(status, expectedBody);
      };
      const sleep = async () => assert.fail('Permanent failures must not wait for retries');

      assert.deepEqual(await pingAfterDeployment(createDeployment(request, { sleep })), {
        ready: false,
        sent: 0,
        failed: 0,
        skipped: endpoints.length
      });
      assert.deepEqual(urls, [readyUrl]);
    });
  }
});

test('pingAfterDeployment makes one readiness attempt when retries is zero', async () =>
{
  let attempts = 0;
  const request = async (url) =>
  {
    assert.equal(url, readyUrl);
    attempts += 1;
    return response(40);
  };
  const sleep = async () => assert.fail('Zero retries must not sleep');

  assert.deepEqual(await pingAfterDeployment(createDeployment(request, { retries: 0, sleep })), {
    ready: false,
    sent: 0,
    failed: 0,
    skipped: endpoints.length
  });
  assert.equal(attempts, 1);
});

test('pingAfterDeployment follows relative and absolute Gemini redirects up to three hops', async (context) =>
{
  for (const stage of ['readiness', 'endpoint'])
  {
    await context.test(stage, async () =>
    {
      const initialUrl = stage === 'readiness' ? readyUrl : endpoints[0];
      const relativeUrl = new URL('./redirected', initialUrl).href;
      const absoluteUrl = 'gemini://redirect.example.invalid/next';
      const finalUrl = 'gemini://redirect.example.invalid/final';
      const redirects = new Map([
        [initialUrl, { status: 30, meta: './redirected' }],
        [relativeUrl, { status: 31, meta: absoluteUrl }],
        [absoluteUrl, { status: 30, meta: '/final' }]
      ]);
      const calls = [];
      const request = async (url, options) =>
      {
        calls.push({ url, readBody: options.readBody });
        return redirects.get(url) || response(20, expectedBody);
      };
      const sleep = async () => assert.fail('Successful redirects must not require retries');

      assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
        endpoints: [endpoints[0]],
        sleep
      })), { ready: true, sent: 1, failed: 0, skipped: 0 });

      const redirectCalls = [initialUrl, relativeUrl, absoluteUrl, finalUrl].map((url) => ({
        url,
        readBody: stage === 'readiness'
      }));
      assert.deepEqual(calls, stage === 'readiness'
        ? [...redirectCalls, { url: endpoints[0], readBody: false }]
        : [{ url: readyUrl, readBody: true }, ...redirectCalls]);
    });
  }
});

test('pingAfterDeployment stops after three Gemini redirects without retrying the chain', async (context) =>
{
  for (const stage of ['readiness', 'endpoint'])
  {
    await context.test(stage, async () =>
    {
      const initialUrl = stage === 'readiness' ? readyUrl : endpoints[0];
      const redirectUrls = [
        initialUrl,
        new URL('/redirect-1', initialUrl).href,
        new URL('/redirect-2', initialUrl).href,
        new URL('/redirect-3', initialUrl).href
      ];
      const calls = [];
      const request = async (url, options) =>
      {
        calls.push({ url, readBody: options.readBody });
        if (stage === 'endpoint' && url === readyUrl)
        {
          return response(20, expectedBody);
        }
        return { status: 30, meta: `/redirect-${redirectUrls.indexOf(url) + 1}`, body: Buffer.alloc(0) };
      };
      const sleep = async () => assert.fail('A redirect limit failure must not be retried');

      assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
        endpoints: [endpoints[0]],
        sleep
      })), stage === 'readiness'
        ? { ready: false, sent: 0, failed: 0, skipped: 1 }
        : { ready: true, sent: 0, failed: 1, skipped: 0 });

      const redirectCalls = redirectUrls.map((url) => ({ url, readBody: stage === 'readiness' }));
      assert.deepEqual(calls, stage === 'readiness'
        ? redirectCalls
        : [{ url: readyUrl, readBody: true }, ...redirectCalls]);
    });
  }
});

test('pingAfterDeployment rejects non-Gemini redirects without requesting their targets', async (context) =>
{
  for (const stage of ['readiness', 'endpoint'])
  {
    for (const protocol of ['http:', 'https:'])
    {
      await context.test(`${stage} to ${protocol}`, async () =>
      {
        const initialUrl = stage === 'readiness' ? readyUrl : endpoints[0];
        const calls = [];
        const request = async (url, options) =>
        {
          calls.push({ url, readBody: options.readBody });
          if (url === initialUrl)
          {
            return { status: 30, meta: `${protocol}//redirect.example.invalid/ping`, body: Buffer.alloc(0) };
          }
          return response(20, expectedBody);
        };

        assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
          endpoints: [endpoints[0]],
          retries: 0
        })), stage === 'readiness'
          ? { ready: false, sent: 0, failed: 0, skipped: 1 }
          : { ready: true, sent: 0, failed: 1, skipped: 0 });
        assert.deepEqual(calls, stage === 'readiness'
          ? [{ url: readyUrl, readBody: true }]
          : [{ url: readyUrl, readBody: true }, { url: endpoints[0], readBody: false }]);
      });
    }
  }
});

test('pingAfterDeployment continues after endpoint errors and reports success and failure totals', async () =>
{
  const calls = [];
  const request = async (url, options) =>
  {
    calls.push({ url, readBody: options.readBody });
    if (url === readyUrl)
    {
      return response(21, expectedBody);
    }
    if (url === endpoints[0])
    {
      throw new Error('Endpoint unavailable');
    }
    if (url === endpoints[1])
    {
      return response(51);
    }
    return response(20);
  };

  assert.deepEqual(await pingAfterDeployment(createDeployment(request)), {
    ready: true,
    sent: 1,
    failed: 2,
    skipped: 0
  });
  assert.deepEqual(calls, [
    { url: readyUrl, readBody: true },
    { url: endpoints[0], readBody: false },
    { url: endpoints[0], readBody: false },
    ...endpoints.map((url) => ({ url, readBody: false }))
  ]);
});

test('loadEndpoints accepts mixed strings and objects without resolving variables', async () =>
{
  const input = [
    'GEMINI://first.example.invalid/path with spaces',
    'HTTPS://HTTP.EXAMPLE.INVALID/${TOKEN}?key=${TOKEN}',
    'http://plain.example.invalid/ping',
    { url: endpoints[1], method: 'GET' },
    { url: 'https://hook.example.invalid/', method: 'POST', headers: { Authorization: '${TOKEN}' }, body: { text: '${TOKEN}' } }
  ];
  await withEndpointsFile(JSON.stringify(input), async (filePath) =>
  {
    assert.deepEqual(await loadEndpoints(filePath), [
      'gemini://first.example.invalid/path%20with%20spaces',
      'https://http.example.invalid/${TOKEN}?key=${TOKEN}',
      ...input.slice(2)
    ]);
  });
});

test('dispatch encodes URL variables, interpolates raw headers and nested JSON once, and redacts logs', async () =>
{
  const token = '雪&?/# ${NESTED}';
  const headerToken = 'raw&?/# ${NESTED}';
  const calls = [];
  const logs = [];
  const request = async (url, options) =>
  {
    calls.push({ url, options });
    return url === readyUrl ? response(20, expectedBody) : response(new URL(url).protocol === 'gemini:' ? 20 : 202);
  };
  const configured = [
    'gemini://first.example.invalid/${TOKEN}?key=${TOKEN}',
    { url: 'https://hook.example.invalid/${TOKEN}?key=${TOKEN}', method: 'POST', headers: { Authorization: 'Bearer ${HEADER_TOKEN}' }, body: { text: '${TOKEN}', nested: ['${TOKEN}', { enabled: true, count: 2, empty: null }] } },
    { url: 'https://hook.example.invalid/raw', method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '${TOKEN}' }
  ];
  assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
    endpoints: configured,
    env: { TOKEN: token, HEADER_TOKEN: headerToken, NESTED: 'must-not-expand' },
    logger: { log: (message) => logs.push(message), warn: (message) => logs.push(message) }
  })), { ready: true, sent: 3, failed: 0, skipped: 0 });
  const encoded = '%E9%9B%AA%26%3F%2F%23%20%24%7BNESTED%7D';
  assert.equal(calls[1].url, `gemini://first.example.invalid/${encoded}?key=${encoded}`);
  assert.equal(calls[2].url, `https://hook.example.invalid/${encoded}?key=${encoded}`);
  assert.deepEqual(calls[2].options.headers, { Authorization: `Bearer ${headerToken}`, 'content-type': 'application/json' });
  assert.deepEqual(JSON.parse(calls[2].options.body), { text: token, nested: [token, { enabled: true, count: 2, empty: null }] });
  assert.equal(calls[3].options.body, token);
  assert.deepEqual(calls[3].options.headers, { 'Content-Type': 'text/plain' });
  assert.doesNotMatch(logs.join('\n'), /雪|NESTED|TOKEN|%E9|\/raw|Bearer|must-not-expand/);
});

test('missing or empty URL/header/body variables fail only their endpoint without retrying', async () =>
{
  const calls = [];
  const request = async (url) =>
  {
    calls.push(url);
    return response(20, url === readyUrl ? expectedBody : '');
  };
  assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
    endpoints: [
      'gemini://first.example.invalid/${MISSING}',
      { url: 'https://hook.example.invalid/', method: 'POST', headers: { Authorization: '${EMPTY}' } },
      { url: 'https://hook.example.invalid/', method: 'POST', body: { text: '${MISSING}' } },
      endpoints[2]
    ],
    env: { EMPTY: '' },
    sleep: async () => assert.fail('Missing keys are permanent failures')
  })), { ready: true, sent: 1, failed: 3, skipped: 0 });
  assert.deepEqual(calls, [readyUrl, endpoints[2]]);
});

test('the CLI dry-run works without keys, redacts paths and payloads, and runs as an extensionless executable', async () =>
{
  const input = [
    'gemini://first.example.invalid/literal-secret/${TOKEN}?secret=literal-secret',
    { url: 'https://hook.example.invalid/literal-secret/${TOKEN}', method: 'POST', headers: { Authorization: 'literal-secret ${TOKEN}' }, body: { text: 'literal-secret ${TOKEN}' } }
  ];
  await withEndpointsFile(JSON.stringify(input), async (filePath) =>
  {
    const script = fileURLToPath(new URL('../scripts/notify.mjs', import.meta.url));
    const executable = join(dirname(filePath), 'calmserve-notify');
    await copyFile(script, executable);
    await chmod(executable, 0o755);
    assert.ok((await readFile(executable, 'utf8')).startsWith('#!/usr/bin/env node\n'));
    const { stdout } = await promisify(execFile)(executable, [filePath, '--dry-run'], { env: { PATH: dirname(process.execPath) } });
    const populated = await promisify(execFile)(process.execPath, [script, '--dry-run', filePath], { env: { TOKEN: 'resolved-secret' } });
    assert.equal(stdout, populated.stdout);
    assert.match(stdout, /Configured notification endpoints: 2\. No requests made\./);
    assert.doesNotMatch(stdout, /literal-secret|resolved-secret|TOKEN|Authorization|\/ping/);
  });
});

test('CLI readiness file outages are nonfatal and malformed configuration errors are redacted', async () =>
{
  const script = fileURLToPath(new URL('../scripts/notify.mjs', import.meta.url));
  await withEndpointsFile(JSON.stringify([endpoints[0]]), async (filePath) =>
  {
    for (const variable of ['PING_READY_FILE', 'GEMINI_PING_READY_FILE'])
    {
      const { stderr } = await promisify(execFile)(process.execPath, [script, filePath], { env: { [variable]: join(dirname(filePath), 'missing-secret-file') } });
      assert.match(stderr, /Skipping notifications: local readiness file is unavailable/);
      assert.doesNotMatch(stderr, /missing-secret-file/);
    }
    await promisify(execFile)(process.execPath, [script, filePath], {
      env: { PING_READY_FILE: filePath, PING_READY_URL: 'ftp://generic.example.invalid/', GEMINI_PING_READY_URL: readyUrl }
    });
    await promisify(execFile)(process.execPath, [script, filePath], {
      env: { GEMINI_PING_READY_FILE: filePath, GEMINI_PING_READY_URL: 'ftp://legacy.example.invalid/' }
    });
  });
  await withEndpointsFile('{"secret":"do-not-print"', async (filePath) =>
  {
    await assert.rejects(() => promisify(execFile)(process.execPath, [script, filePath, '--dry-run']), (error) =>
    {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Unable to read or parse/);
      assert.doesNotMatch(error.stderr, /do-not-print/);
      return true;
    });
  });
});

test('default dispatch mixes HTTPS readiness, HTTP notifications, and fake Gemini TLS', async () =>
{
  const badge = '<svg data-version="whole-web-fingerprint"/>\n';
  const calls = [];
  let cancellations = 0;
  const connection = createConnection((socket) => socket.emit('data', Buffer.from('20 text/gemini\r\n')));
  const fetch = async (url, options) =>
  {
    calls.push({ url, options });
    if (options.readBody === true)
    {
      assert.fail('Native fetch must not receive custom readBody options');
    }
    if (url.endsWith('/updated.svg'))
    {
      return new Response(badge);
    }
    return new Response(new ReadableStream({ cancel: () => { cancellations += 1; } }), { status: 202 });
  };
  assert.deepEqual(await pingAfterDeployment({
    endpoints: [endpoints[0], 'http://plain.example.invalid/ping', { url: 'https://hook.example.invalid/', method: 'POST', body: { updated: true } }],
    expectedBody: badge,
    fetch,
    connect: connection.connect,
    logger,
    sleep: async () => {}
  }), { ready: true, sent: 3, failed: 0, skipped: 0 });
  assert.equal(calls[0].url, 'https://hans.gerwitz.com/.well-known/calmserve/updated.svg');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.body, '{"updated":true}');
  assert.equal(cancellations, 2);
  assert.deepEqual(connection.writes, [Buffer.from(`${endpoints[0]}\r\n`)]);
});

test('HTTP readiness reads all chunks, enforces 1 MiB, and compares the whole badge', async () =>
{
  const body = Buffer.alloc(1024 * 1024, 65);
  const result = await httpRequest('https://public.example.invalid/', {
    readBody: true,
    fetch: async () => new Response(new ReadableStream({ start: (controller) =>
    {
      controller.enqueue(body.subarray(0, 500));
      controller.enqueue(body.subarray(500));
      controller.close();
    } }))
  });
  assert.deepEqual(result.body, body);
  await assert.rejects(() => httpRequest('https://public.example.invalid/', {
    readBody: true,
    fetch: async () => new Response(Buffer.alloc(1024 * 1024 + 1))
  }), { message: 'HTTP readiness response exceeded 1 MiB.' });
  let attempts = 0;
  assert.deepEqual(await pingAfterDeployment({
    endpoints: [endpoints[0]],
    expectedBody: '<svg data-version="new"/>',
    fetch: async () => { attempts += 1; return new Response('<svg data-version="old"/>'); },
    connect: () => assert.fail('Stale readiness must prevent notifications'),
    logger,
    sleep: async () => {}
  }), { ready: false, sent: 0, failed: 0, skipped: 1 });
  assert.equal(attempts, 3);
});

test('HTTP errors and timeouts have generic messages without URL or credential tokens', async () =>
{
  const url = 'https://hook.example.invalid/secret-path?key=secret-key';
  await assert.rejects(() => httpRequest(url, {
    fetch: async () => { throw new Error(`${url} secret-header secret-body`); }
  }), { message: 'HTTP request failed.', retryable: true });
  for (const readBody of [false, true])
  {
    await assert.rejects(() => httpRequest(url, {
      timeoutMs: 10,
      readBody,
      fetch: async (value, { signal }) => readBody
        ? new Response(new ReadableStream({ start: (controller) => signal.addEventListener('abort', () => controller.error(new Error(value))) }))
        : new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error(value))))
    }), { message: 'HTTP request failed.', retryable: true });
  }
  const logs = [];
  await pingAfterDeployment(createDeployment(async (value) =>
  {
    if (value === readyUrl)
    {
      return response(20, expectedBody);
    }
    throw new Error(`${value} secret-header secret-body`);
  }, { endpoints: [url], logger: { log: (message) => logs.push(message), warn: (message) => logs.push(message) } }));
  assert.doesNotMatch(logs.join('\n'), /secret-path|secret-key|secret-header|secret-body/);
});

test('HTTP GET retries only 429, 5xx, and network failures; POST never retries', async (context) =>
{
  for (const method of ['GET', 'POST'])
  {
    for (const status of [200, 299, 400, 401, 404, 429, 500, 503, 'network'])
    {
      await context.test(`${method} ${status}`, async () =>
      {
        let attempts = 0;
        let waits = 0;
        const request = async (url) =>
        {
          if (url === readyUrl)
          {
            return response(20, expectedBody);
          }
          attempts += 1;
          if (status === 'network')
          {
            throw new Error('Transport failed with secret tokens');
          }
          return response(status);
        };
        const result = await pingAfterDeployment(createDeployment(request, {
          endpoints: [{ url: 'https://hook.example.invalid/', method }],
          sleep: async () => { waits += 1; }
        }));
        const retryable = method === 'GET' && [429, 500, 503, 'network'].includes(status);
        assert.equal(attempts, retryable ? 3 : 1);
        assert.equal(waits, retryable ? 2 : 0);
        assert.deepEqual(result, { ready: true, sent: [200, 299].includes(status) ? 1 : 0, failed: [200, 299].includes(status) ? 0 : 1, skipped: 0 });
      });
    }
  }
});

test('HTTP GET retries can recover before the next notification', async () =>
{
  let attempts = 0;
  const request = async (url) =>
  {
    if (url === readyUrl)
    {
      return response(20, expectedBody);
    }
    if (url === endpoints[0])
    {
      return response();
    }
    attempts += 1;
    return response(attempts === 1 ? 429 : attempts === 2 ? 503 : 204);
  };
  assert.deepEqual(await pingAfterDeployment(createDeployment(request, {
    endpoints: ['https://hook.example.invalid/', endpoints[0]]
  })), { ready: true, sent: 2, failed: 0, skipped: 0 });
  assert.equal(attempts, 3);
});

test('HTTP GET follows at most three same-origin redirects for readiness and notifications', async (context) =>
{
  for (const stage of ['readiness', 'endpoint'])
  {
    for (const overflow of [false, true])
    {
      await context.test(`${stage} overflow=${overflow}`, async () =>
      {
        const initial = `https://public.example.invalid/${stage}`;
        const calls = [];
        const fetch = async (url, options) =>
        {
          calls.push({ url, options });
          if (url === 'https://public.example.invalid/ready')
          {
            return new Response(expectedBody);
          }
          const hop = url === initial ? 0 : Number(new URL(url).pathname.slice(1));
          return hop < 3 || overflow
            ? new Response(null, { status: hop % 2 ? 307 : 302, headers: { location: hop === 1 ? 'https://public.example.invalid/2' : `/${hop + 1}` } })
            : new Response(expectedBody);
        };
        const result = await pingAfterDeployment({
          endpoints: [{ url: stage === 'endpoint' ? initial : 'https://public.example.invalid/ready', method: 'GET', headers: { Authorization: 'secret' } }],
          readyUrl: stage === 'readiness' ? initial : 'https://public.example.invalid/ready',
          expectedBody, fetch, logger,
          sleep: async () => assert.fail('Redirect chains must not be retried')
        });
        assert.deepEqual(result, overflow
          ? stage === 'readiness' ? { ready: false, sent: 0, failed: 0, skipped: 1 } : { ready: true, sent: 0, failed: 1, skipped: 0 }
          : { ready: true, sent: 1, failed: 0, skipped: 0 });
        const redirected = calls.filter(({ url }) => url !== 'https://public.example.invalid/ready');
        assert.deepEqual(redirected.map(({ url }) => url), [initial, ...[1, 2, 3].map((hop) => `https://public.example.invalid/${hop}`)]);
        redirected.forEach(({ options }) =>
        {
          assert.equal(options.redirect, 'manual');
          assert.equal(options.headers?.Authorization, stage === 'endpoint' ? 'secret' : undefined);
        });
      });
    }
  }
});

test('HTTP rejects credentialed/cross-origin targets and all POST redirects without forwarding secrets', async (context) =>
{
  for (const method of ['GET', 'POST'])
  {
    const targets = method === 'GET' ? [
      'https://other.example.invalid/secret',
      'http://hook.example.invalid/secret',
      'gemini://hook.example.invalid/secret',
      'https://user:password@hook.example.invalid/secret'
    ] : ['/same-origin'];
    for (const location of targets)
    {
      await context.test(`${method} ${location}`, async () =>
      {
        const calls = [];
        const fetch = async (url) =>
        {
          calls.push(url);
          return url.endsWith('/ready') ? new Response(expectedBody) : new Response(null, { status: 302, headers: { location } });
        };
        assert.deepEqual(await pingAfterDeployment({
          endpoints: [{ url: 'https://hook.example.invalid/start', method, headers: { Authorization: 'secret' } }],
          readyUrl: 'https://public.example.invalid/ready',
          expectedBody, fetch, logger,
          sleep: async () => assert.fail('Rejected redirects are permanent')
        }), { ready: true, sent: 0, failed: 1, skipped: 0 });
        assert.deepEqual(calls, ['https://public.example.invalid/ready', 'https://hook.example.invalid/start']);
      });
    }
  }
});
