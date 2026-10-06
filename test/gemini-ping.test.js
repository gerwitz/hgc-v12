import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { geminiRequest, loadEndpoints, pingAfterDeployment } from '../scripts/gemini-ping.mjs';

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
  const directory = await mkdtemp(join(tmpdir(), 'gemini-ping-test-'));
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
      fileURLToPath(new URL('../scripts/gemini-ping.mjs', import.meta.url)),
      filePath,
    ], { env: {} });
    assert.match(stdout, /No Gemini ping endpoints configured; nothing to do\./);
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
    JSON.stringify(['https://example.invalid/ping']),
    JSON.stringify(['http://example.invalid/ping']),
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
      }), { message: error.message });
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
