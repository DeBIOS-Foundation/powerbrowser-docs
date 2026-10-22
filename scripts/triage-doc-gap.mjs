// Triage for one doc-gap issues event: labels from the form sections, written through the GitHub REST API.
// The workflow runs it with no argument. Run it with --self-test to check the module; the self-test makes no network call except to loopback.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORM, FIELDS, TYPES, NO_RESPONSE, LABEL_MAX, LABELS, dedupeKey, keyLine, isDocPath, parityProblems, refuseHits } from './lib/doc-gap-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Detail of the listing error at the cap (more than 1000 open issues); the duplicate step skips on it.
const CAP_DETAIL = 'more than 1000 open issues';

// Label colours and descriptions (fixed text).
const STYLE = {
  'doc-gap': ['1d76db', 'Doc gap report (docs/FEEDBACK.md)'],
  duplicate: ['cfd3d7', 'Same doc and gap type as an earlier open doc-gap issue'],
  'needs-redaction': ['d93f0b', 'Task or Evidence matched a redaction rule; maintainer review'],
};
const styleOf = (name) => {
  if (name.startsWith('gap:')) return ['c5def5', 'Gap type from the doc-gap form'];
  if (name.startsWith('doc:')) return ['bfd4f2', 'Doc named in a doc-gap report'];
  return STYLE[name];
};

// A failed GitHub call. It holds the operation name and the status only; response bodies are never kept.
export class TriageError extends Error {
  constructor(operation, status, detail = '') {
    super(`${operation} failed`);
    this.operation = operation;
    this.status = status;
    this.detail = detail;
  }
}

const nameOf = (l) => (typeof l === 'string' ? l : l?.name);
const namesOf = (list) => (list ?? []).map(nameOf).filter((n) => typeof n === 'string');
const has = (names, name) => names.some((n) => n.toLowerCase() === name.toLowerCase());
const isDocGap = (issue) => has(namesOf(issue.labels), LABELS.docGap) || String(issue.title ?? '').startsWith('[doc-gap]');

// ---- transport: the GitHub REST API through the global fetch ----

// Seconds from a Retry-After header, or null when it is absent, not a whole number, or over 60 (the wait is bounded).
const retryAfterSeconds = (value) => {
  if (value === null || !/^\d+$/.test(value.trim())) return null;
  const seconds = Number(value);
  return seconds <= 60 ? seconds : null;
};

export function makeGitHubApi({ token, repo, apiUrl = 'https://api.github.com', timeoutMs = 10000 }) {
  const base = apiUrl.replace(/\/+$/, '');
  // One request, bounded by timeoutMs. A network error or a timeout is status 0.
  const attempt = async (operation, method, route, body) => {
    try {
      return await fetch(`${base}/repos/${repo}${route}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new TriageError(operation, 0, 'could not reach the API');
    }
  };
  // IN-05: one retry after Retry-After, only on 403 or 429 with a wait of 60 seconds or less. Any other answer is final.
  const call = async (operation, method, route, body) => {
    let res = await attempt(operation, method, route, body);
    const wait = res.status === 403 || res.status === 429 ? retryAfterSeconds(res.headers.get('retry-after')) : null;
    if (wait !== null) {
      res.body?.cancel().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      res = await attempt(operation, method, route, body);
    }
    if (!res.ok) {
      if (res.body) res.body.cancel().catch(() => {});
      throw new TriageError(operation, res.status);
    }
    return res.json();
  };
  // Pages of 100; a short page ends the list. A full page 10 needs page 11 to tell 1000 from more: any item there is an error, not a partial list.
  const listAll = async (operation, route, noun) => {
    const items = [];
    for (let page = 1; ; page += 1) {
      const sep = route.includes('?') ? '&' : '?';
      const batch = await call(operation, 'GET', `${route}${sep}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new TriageError(operation, 0, 'unexpected response');
      if (page > 10 && batch.length) throw new TriageError(operation, 0, `more than 1000 ${noun}`);
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  };
  return {
    listLabels: () => listAll('list labels', '/labels', 'labels'),
    listOpenIssues: () => listAll('list open issues', '/issues?state=open', 'open issues'),
    createLabel: (name, color, description) => call('create label', 'POST', '/labels', { name, color, description }),
    addLabels: (number, labels) => call('add labels', 'POST', `/issues/${number}/labels`, { labels }),
    listComments: (number) => listAll('list comments', `/issues/${number}/comments`, 'comments'),
    comment: (number, body) => call('post comment', 'POST', `/issues/${number}/comments`, { body }),
  };
}

// ---- form parse: rules S1 to S4 and S6 ----

// Kind none: no heading. Kind form: the five labels in form order, each once. Kind ambiguous: any other heading set.
export function parseForm(body) {
  const lines = String(body ?? '').replace(/\r\n?/g, '\n').split('\n');
  const heads = [];
  lines.forEach((line, index) => {
    const m = /^### (.+?)\s*$/.exec(line);
    if (m) heads.push({ label: m[1], index });
  });
  if (heads.length === 0) return { kind: 'none', lines };
  const want = FIELDS.map(([, label]) => label);
  const inOrder = heads.length === want.length && heads.every((h, i) => h.label === want[i]);
  if (!inOrder) return { kind: 'ambiguous', lines };
  const values = {};
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : lines.length;
    const text = lines.slice(h.index + 1, end).join('\n').trim();
    values[h.label] = text === NO_RESPONSE ? '' : text;
  });
  return { kind: 'form', values, lines, preamble: lines.slice(0, heads[0].index) };
}

const isRegularFile = (p) => {
  try {
    return fs.lstatSync(p).isFile();
  } catch {
    return false;
  }
};

// Redaction hits for the scanned texts, each reported under its field name (rule S5).
const hitsOf = (scanned) => scanned.flatMap(([field, text]) => refuseHits(text ?? '').map((h) => ({ field, line: h.line, id: h.id })));

// Derived values (rules T5, S5 and CR-01). A missing value is '' and adds nothing.
// Scanned: the title, the text before the first heading (minus the CLI dedupe key line) and the free-text sections.
function factsOf(parsed, root, title) {
  if (parsed.kind === 'ambiguous') return { kind: 'ambiguous', gapType: null, doc: null, missing: [], hits: hitsOf([['title', title]]), redact: true };
  if (parsed.kind === 'none') {
    const hits = hitsOf([['title', title], ['body', parsed.lines.join('\n')]]);
    return { kind: 'none', gapType: null, doc: null, missing: [], hits, redact: hits.length > 0 };
  }
  const v = parsed.values;
  const key = keyLine(v.Doc, v['Gap type']);
  const preamble = parsed.preamble.filter((l) => l.trim() !== key).join('\n');
  const hits = hitsOf([['title', title], ['preamble', preamble], ['Task', v.Task], ['Evidence', v.Evidence], ['PB commit', v['PB commit']]]);
  return {
    kind: 'form',
    gapType: TYPES.includes(v['Gap type']) ? v['Gap type'] : null,
    doc: isDocPath(v.Doc) && isRegularFile(path.join(root, v.Doc)) ? v.Doc : null,
    missing: FIELDS.map(([, label]) => label).filter((label) => v[label] === ''),
    hits,
    redact: hits.length > 0,
  };
}

// The doc label is doc: plus the path under docs/ (rule CD-2).
const docLabel = (doc) => LABELS.doc(doc.slice('docs/'.length));

// Pure plan (rule T6): the facts labels to add (case-insensitive) and the ones to create. The duplicate label is not here.
export function planTriage({ labels, repoLabels, facts }) {
  const wanted = [LABELS.docGap];
  if (facts.gapType) wanted.push(LABELS.gap(facts.gapType));
  if (facts.doc && docLabel(facts.doc).length <= LABEL_MAX) wanted.push(docLabel(facts.doc));
  if (facts.redact) wanted.push(LABELS.needsRedaction);
  const toAdd = wanted.filter((name) => !has(labels, name));
  const toCreate = toAdd.filter((name) => !has(repoLabels, name));
  return { toAdd, toCreate };
}

// Dedupe key of an issue from its form sections (rule S6): the doc needs the path check only; nothing when a part is missing.
function dedupeKeyOf(issue) {
  const parsed = parseForm(issue.body);
  if (parsed.kind !== 'form') return null;
  const type = parsed.values['Gap type'];
  const doc = parsed.values.Doc;
  return TYPES.includes(type) && isDocPath(doc) ? dedupeKey(doc, type) : null;
}

// Fixed comment text (rule T12). The hidden marker lets the workflow recognise its own comment (WR-03).
const DUP_MARK = '<!-- doc-gap-triage:duplicate -->';
const duplicateComment = (n) => `Possible duplicate of #${n}: an open doc-gap issue has the same doc and gap type. Add new evidence there as a comment instead. See docs/FEEDBACK.md.\n\n${DUP_MARK}`;

// WR-03: comment before the label, so a failed comment is retried on the next run. A bot comment with the marker means the
// reporter was told already: no repeat comment and no label, so a maintainer who removed the label keeps it removed.
// shortcut: a label write that fails after the comment leaves no label, and the marker then blocks the retry; a maintainer adds duplicate by hand. Upgrade: record the label state in the marker comment.
async function duplicateStep(api, number, duplicateOf, repoLabels) {
  const notified = (await api.listComments(number)).some((c) => c?.user?.type === 'Bot' && String(c.body ?? '').includes(DUP_MARK));
  if (notified) return `duplicate of #${duplicateOf}; already notified, no repeat`;
  if (!has(repoLabels, LABELS.duplicate)) await createLabelIfMissing(api, LABELS.duplicate);
  await api.comment(number, duplicateComment(duplicateOf));
  await api.addLabels(number, [LABELS.duplicate]);
  return `duplicate of #${duplicateOf}; comment posted`;
}

// Create one label if the repo lacks it; 422 means it exists already (a race or a stale list).
async function createLabelIfMissing(api, name) {
  const [color, description] = styleOf(name);
  try {
    await api.createLabel(name, color, description);
  } catch (e) {
    if (!(e instanceof TriageError && e.status === 422)) throw e;
  }
}

// One stderr line for a failed call: the operation and the status, never a response body.
const failureLine = (e) => `triage: ${e.operation} failed: ${e.status ? `HTTP ${e.status}` : e.detail}. Next step: rerun the workflow from the Actions tab; the labels already applied stay.`;

// Earliest open doc-gap issue below this number with the same key (rule CD-3); pull requests are not candidates.
// WR-04: a candidate carries the doc-gap label, has the form sections (dedupeKeyOf) and no needs-redaction label,
// so an early junk issue cannot become the target of later reports.
function duplicateTarget(number, key, openIssues) {
  if (key === null) return null;
  const earlier = openIssues
    .filter((o) => o && Number.isInteger(o.number) && o.number < number && o.pull_request == null)
    .filter((o) => has(namesOf(o.labels), LABELS.docGap) && !has(namesOf(o.labels), LABELS.needsRedaction))
    .filter((o) => dedupeKeyOf(o) === key)
    .map((o) => o.number);
  return earlier.length ? Math.min(...earlier) : null;
}

// ---- run: one issues event (rules T2 to T9) ----

export async function runTriage(env, io = {}) {
  const out = io.out ?? ((line) => console.log(line));
  const err = io.err ?? ((line) => console.error(line));
  const root = io.root ?? ROOT;
  for (const name of ['GITHUB_EVENT_PATH', 'GITHUB_REPOSITORY', 'GITHUB_TOKEN']) {
    if (!env[name]) {
      err(`triage: ${name} is not set. Next step: run this from the doc-gap workflow, which sets it, or set ${name} for a local run.`);
      return 2;
    }
  }
  let event;
  try {
    event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  } catch {
    err('triage: cannot read the event file. Next step: run this only from an issues event.');
    return 1;
  }
  const issue = event?.issue;
  if (!issue) {
    out('triage: skipped: no issue in the event');
    return 0;
  }
  if (issue.pull_request != null) {
    out('triage: skipped: a pull request');
    return 0;
  }
  if (!isDocGap(issue)) {
    out('triage: skipped: not a doc-gap issue');
    return 0;
  }
  // WR-01: a renamed form label would send every report to ambiguous. Stop before any write instead.
  let formText = '';
  try {
    formText = fs.readFileSync(path.join(root, FORM), 'utf8');
  } catch {
    // parityProblems reports the missing form below
  }
  const parity = parityProblems(formText);
  if (parity.length) {
    err(`triage: the doc-gap form does not match the triage rules: ${parity.join('; ')}. Next step: make FIELDS and TYPES in scripts/lib/doc-gap-rules.mjs match ${FORM}, then rerun from the Actions tab.`);
    return 1;
  }
  const number = issue.number;
  if (!Number.isInteger(number) || number < 1) {
    err('triage: cannot read the event file. Next step: run this only from an issues event.');
    return 1;
  }
  const log = (line) => out(`triage: #${number} ${line}`);
  const api = io.api ?? makeGitHubApi({
    token: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    apiUrl: env.GITHUB_API_URL || 'https://api.github.com',
  });
  try {
    const facts = factsOf(parseForm(issue.body), root, issue.title);
    if (facts.kind === 'ambiguous') log('body headings do not match the form; flagged for redaction');
    for (const h of facts.hits) log(`redaction: ${h.field} line ${h.line} [${h.id}]`);
    for (const field of facts.missing) log(`missing: ${field}`);
    if (facts.kind === 'form' && !facts.gapType && !facts.missing.includes('Gap type')) log('Gap type: not in the fixed set; no gap label');
    if (facts.kind === 'form' && !facts.doc && !facts.missing.includes('Doc')) log('Doc: not a regular file under docs/; no doc label');
    if (facts.doc && docLabel(facts.doc).length > LABEL_MAX) log('Doc: the doc label would be longer than 50 characters; no doc label');
    // Facts labels first (WR-02): a failed or capped duplicate lookup never blocks them.
    const repoLabels = namesOf(await api.listLabels());
    const plan = planTriage({ labels: namesOf(issue.labels), repoLabels, facts });
    for (const name of plan.toCreate) await createLabelIfMissing(api, name);
    if (plan.toAdd.length) {
      await api.addLabels(number, plan.toAdd);
      log(`labels added: ${plan.toAdd.join(', ')}`);
    }
    const key = facts.kind === 'form' && facts.gapType && facts.doc ? dedupeKey(facts.doc, facts.gapType) : null;
    let duplicateOf = null;
    let dupFailure = null;
    if (key !== null) {
      try {
        duplicateOf = duplicateTarget(number, key, await api.listOpenIssues());
      } catch (e) {
        if (!(e instanceof TriageError)) throw e;
        if (e.detail === CAP_DETAIL) log(`duplicate check skipped: ${CAP_DETAIL}`);
        else dupFailure = e;
      }
    }
    if (duplicateOf !== null && !has(namesOf(issue.labels), LABELS.duplicate)) {
      try {
        log(await duplicateStep(api, number, duplicateOf, repoLabels));
      } catch (e) {
        if (!(e instanceof TriageError)) throw e;
        dupFailure = e;
      }
    }
    if (dupFailure) {
      err(failureLine(dupFailure));
      return 1;
    }
    log('done');
    return 0;
  } catch (e) {
    if (!(e instanceof TriageError)) {
      err('triage: unexpected error. Next step: rerun the workflow from the Actions tab.');
      return 1;
    }
    err(failureLine(e));
    return 1;
  }
}

// ---- self-test: fixtures in a temporary root; the real docs are never written ----

const DOC = 'docs/09-tabs-reference.md';
const REPO = 'acme/docs';
const CANARY = 'canary-token-7f3a';
const TASK = 'Adding a panel that needed the group write call.';
const EVIDENCE = 'The doc names openGroup in the shell actor.\nThe source has no such member.';
const ALL = ['doc-gap', 'gap:wrong-fact', 'doc:09-tabs-reference.md'];
const lab = (...names) => names.map((name) => ({ name }));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (xs) => [...xs].sort();
// Redaction samples, assembled by concatenation so the module holds no secret-shaped literal.
const ABS = ["/", "home/", "chris/notes/tabs.md"].join("");
const PW = ["pass", "word=hunter2x"].join("");
const MAIL = ["dev", "@", "example", ".", "org"].join("");
const MARK = "INJECT-MARK-7f3a";
const TOK = ["gh", "p_", "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"].join("");
const dupText = (n) => `Possible duplicate of #${n}: an open doc-gap issue has the same doc and gap type. Add new evidence there as a comment instead. See docs/FEEDBACK.md.\n\n<!-- doc-gap-triage:duplicate -->`;

function formBody({ type = 'wrong-fact', doc = DOC, task = TASK, evidence = EVIDENCE, pb = '1ba359e', key = false, crlf = false } = {}) {
  const sections = [['Gap type', type], ['Doc', doc], ['Task', task], ['Evidence', evidence], ['PB commit', pb]];
  const head = key ? `<!-- doc-gap:${doc}:${type} -->\n\n` : '';
  const text = head + sections.map(([label, value]) => `### ${label}\n\n${value}\n`).join('\n');
  return crlf ? text.replace(/\n/g, '\r\n') : text;
}
const issueOf = (over = {}) => ({ number: 5, title: `[doc-gap] ${DOC}: wrong-fact`, body: formBody(), labels: [], ...over });
const eventOf = (issue) => ({ action: 'opened', issue });
const createdOf = (calls) => calls.filter((c) => c[0] === 'createLabel');
const addedOf = (calls) => calls.filter((c) => c[0] === 'addLabels').flatMap((c) => c[2]);
// The token must be flagged under the named field, and must not reach any output line or API call.
const redactedAt = (r, field) => {
  if (r.code !== 0) return `exit ${r.code}`;
  if (!addedOf(r.calls).includes('needs-redaction')) return 'needs-redaction is not added';
  if (!r.out.some((l) => l.startsWith(`triage: #5 redaction: ${field} line `))) return `no redaction line for ${field}`;
  return JSON.stringify([r.out, r.err, r.calls]).includes(TOK) ? 'the token reached an output or a call' : null;
};
const expectOut = (r, line) => {
  if (r.code !== 0) return `exit ${r.code}`;
  if (r.out.length !== 1 || r.out[0] !== line) return `unexpected output of ${r.out.length} line(s)`;
  return null;
};

// Fake API: records each call; fail maps an operation to an HTTP status; createStatus answers every create.
function fakeApi({ labels = [], open = [], comments = [], fail = {}, createStatus = 0 } = {}) {
  const calls = [];
  const gate = (op) => {
    if (fail[op]) throw new TriageError(op, fail[op]);
  };
  return {
    calls,
    async listLabels() {
      calls.push(['listLabels']);
      gate('list labels');
      return labels.map((name) => ({ name }));
    },
    async createLabel(name, color, description) {
      calls.push(['createLabel', name, color, description]);
      gate('create label');
      if (createStatus) throw new TriageError('create label', createStatus);
    },
    async addLabels(number, names) {
      calls.push(['addLabels', number, names]);
      gate('add labels');
    },
    async listOpenIssues() {
      calls.push(['listOpenIssues']);
      gate('list open issues');
      return open;
    },
    async listComments(number) {
      calls.push(['listComments', number]);
      gate('list comments');
      return comments;
    },
    async comment(number, body) {
      calls.push(['comment', number, body]);
      gate('post comment');
    },
  };
}

// Loopback server; answer(method, pathname) returns [status, json] or null for a 404.
// answer returns [status, json, headers?, delayMs?]; a delayed answer finishes before close() returns.
async function loopback(answer) {
  const reqs = [];
  const inflight = [];
  const handle = async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const url = new URL(req.url, 'http://127.0.0.1');
    reqs.push({ method: req.method, path: url.pathname, query: url.searchParams, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
    const [status, json, headers = {}, delayMs = 0] = answer(req.method, url.pathname, url.searchParams) ?? [404, { message: 'not found' }];
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (res.destroyed) return;
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(json));
  };
  const server = http.createServer((req, res) => {
    inflight.push(handle(req, res));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    reqs,
    close: async () => {
      await Promise.allSettled(inflight);
      await new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      });
    },
  };
}

// Paged open issues for the boundary cases: pages of 100, the first page holding the candidate CANDIDATE_7.
const PAGED_NUMBER = 5000;
const CANDIDATE_7 = { number: 7, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') };
const issuePages = (count) => Array.from({ length: count }, (_, p) => Array.from({ length: 100 }, (__, i) => ({ number: 1000 + p * 100 + i, title: 'filler', body: '', labels: [] })));

async function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-doc-gap-'));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, DOC), '# Tabs\n');
  fs.mkdirSync(path.join(root, path.dirname(FORM)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, FORM), path.join(root, FORM));
  const readForm = () => fs.readFileSync(path.join(ROOT, FORM), 'utf8');
  const run = async (name, issue, api, env = {}) => {
    const eventPath = path.join(root, `event-${name}.json`);
    fs.writeFileSync(eventPath, JSON.stringify(eventOf(issue)));
    const out = [];
    const err = [];
    const code = await runTriage({ GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: CANARY, ...env }, {
      root, api, out: (l) => out.push(l), err: (l) => err.push(l),
    });
    return { code, out, err, calls: api?.calls ?? [] };
  };
  // One doc-gap issue (PAGED_NUMBER, no labels) against a loopback API that serves the given open-issue pages.
  const pagedRun = async (name, pages) => {
    const srv = await loopback((method, p, q) => {
      if (method === 'GET' && p === `/repos/${REPO}/labels`) return [200, []];
      if (method === 'GET' && p === `/repos/${REPO}/issues`) return [200, pages[Number(q.get('page')) - 1] ?? []];
      if (method === 'GET' && p === `/repos/${REPO}/issues/${PAGED_NUMBER}/comments`) return [200, []];
      if (method === 'POST' && p === `/repos/${REPO}/labels`) return [201, {}];
      if (method === 'POST' && p === `/repos/${REPO}/issues/${PAGED_NUMBER}/labels`) return [200, []];
      if (method === 'POST' && p === `/repos/${REPO}/issues/${PAGED_NUMBER}/comments`) return [201, {}];
      return null;
    });
    try {
      const r = await run(name, issueOf({ number: PAGED_NUMBER }), undefined, { GITHUB_API_URL: srv.url });
      return { ...r, reqs: srv.reqs };
    } finally {
      await srv.close();
    }
  };
  const cases = [
    ['parity-form', () => (parityProblems(readForm()).length ? 'the real form differs from FIELDS and TYPES' : null)],
    ['parity-detects-change', () => {
      const changed = readForm().replace(/^( +)label: Doc$/m, '$1label: Document');
      if (!parityProblems(changed).length) return 'a changed label was not reported';
      if (!parityProblems('no ids here').some((p) => p.includes(FORM))) return 'the missing-ids problem does not name the form path';
      return null;
    }],
    ['form-parity-no-writes', async () => {
      const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-parity-'));
      try {
        fs.mkdirSync(path.join(bad, path.dirname(FORM)), { recursive: true });
        fs.writeFileSync(path.join(bad, FORM), readForm().replace(/^( +)label: Doc$/m, '$1label: Document'));
        const eventPath = path.join(bad, 'event.json');
        fs.writeFileSync(eventPath, JSON.stringify(eventOf(issueOf())));
        const api = fakeApi();
        const err = [];
        const code = await runTriage({ GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: CANARY }, {
          root: bad, api, out: () => {}, err: (l) => err.push(l),
        });
        if (code !== 1) return `exit ${code}`;
        if (api.calls.length) return 'an API call was made';
        return err.some((l) => l.includes(FORM) && l.includes('Next step:')) ? null : 'stderr does not name the form and a next step';
      } finally {
        fs.rmSync(bad, { recursive: true, force: true });
      }
    }],
    ['skip-pull-request', async () => {
      const api = fakeApi();
      const r = await run('skip-pr', issueOf({ pull_request: { url: 'https://example.invalid/pull/1' } }), api);
      return expectOut(r, 'triage: skipped: a pull request') ?? (r.calls.length ? 'an API call was made' : null);
    }],
    ['skip-not-doc-gap', async () => {
      const api = fakeApi();
      const r = await run('skip-other', issueOf({ title: 'Bug report about tabs' }), api);
      return expectOut(r, 'triage: skipped: not a doc-gap issue') ?? (r.calls.length ? 'an API call was made' : null);
    }],
    ['title-only-trigger', async () => {
      const r = await run('title-only', issueOf(), fakeApi({ labels: ALL }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (createdOf(r.calls).length) return 'a create call was recorded';
      return addedOf(r.calls).includes('doc-gap') ? null : 'doc-gap is not in the add call';
    }],
    ['labels-web-form', async () => {
      const r = await run('web-form', issueOf({ labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] }));
      if (r.code !== 0) return `exit ${r.code}`;
      const created = createdOf(r.calls);
      if (!same(sorted(created.map((c) => c[1])), ['doc:09-tabs-reference.md', 'gap:wrong-fact'])) return 'create calls differ';
      const style = Object.fromEntries(created.map((c) => [c[1], [c[2], c[3]]]));
      if (!same(style['gap:wrong-fact'], ['c5def5', 'Gap type from the doc-gap form'])) return 'gap label colour or description differs';
      if (!same(style['doc:09-tabs-reference.md'], ['bfd4f2', 'Doc named in a doc-gap report'])) return 'doc label colour or description differs';
      const adds = r.calls.filter((c) => c[0] === 'addLabels');
      if (adds.length !== 1 || !same(sorted(adds[0][2]), ['doc:09-tabs-reference.md', 'gap:wrong-fact'])) return 'add call differs';
      return null;
    }],
    ['cli-body-key-line', async () => {
      const base = await run('web-form-b', issueOf({ labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] }));
      const keyed = await run('cli-key', issueOf({ labels: lab('doc-gap'), body: formBody({ key: true }) }), fakeApi({ labels: ['doc-gap'] }));
      if (keyed.code !== 0) return `exit ${keyed.code}`;
      if (addedOf(keyed.calls).includes('needs-redaction')) return 'a clean CLI-filed issue was flagged';
      return same(base.calls, keyed.calls) ? null : 'calls differ from the body without the key line';
    }],
    ['redaction-title', async () => redactedAt(await run('redact-title', issueOf({ title: `[doc-gap] ${DOC}: wrong-fact ${TOK}`, labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] })), 'title')],
    ['redaction-pb-commit', async () => redactedAt(await run('redact-pb', issueOf({ body: formBody({ pb: TOK }), labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] })), 'PB commit')],
    ['redaction-preamble', async () => redactedAt(await run('redact-pre', issueOf({ body: `Note ${TOK}\n\n${formBody()}`, labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] })), 'preamble')],
    ['crlf-body', async () => {
      const base = await run('web-form-c', issueOf({ labels: lab('doc-gap') }), fakeApi({ labels: ['doc-gap'] }));
      const crlf = await run('crlf', issueOf({ labels: lab('doc-gap'), body: formBody({ crlf: true }) }), fakeApi({ labels: ['doc-gap'] }));
      if (crlf.code !== 0) return `exit ${crlf.code}`;
      return same(base.calls, crlf.calls) ? null : 'calls differ from the LF body';
    }],
    ['missing-event-path', async () => {
      const out = [];
      const err = [];
      const code = await runTriage({ GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: CANARY }, {
        root, api: fakeApi(), out: (l) => out.push(l), err: (l) => err.push(l),
      });
      if (code !== 2) return `exit ${code}`;
      return err.some((l) => l.includes('GITHUB_EVENT_PATH') && l.includes('Next step:')) ? null : 'stderr does not name GITHUB_EVENT_PATH with a next step';
    }],
    ['http-transport', async () => {
      const srv = await loopback((method, p) => {
        if (method === 'GET' && p === `/repos/${REPO}/labels`) return [200, []];
        if (method === 'GET' && p === `/repos/${REPO}/issues`) return [200, []];
        if (method === 'POST' && p === `/repos/${REPO}/labels`) return [201, {}];
        if (method === 'POST' && p === `/repos/${REPO}/issues/5/labels`) return [200, []];
        return null;
      });
      try {
        const r = await run('http', issueOf(), undefined, { GITHUB_API_URL: srv.url });
        if (r.code !== 0) return `exit ${r.code}`;
        if (!srv.reqs.length || !srv.reqs.every((q) => q.auth === `Bearer ${CANARY}`)) return 'a request lacked the bearer token';
        const posted = srv.reqs.filter((q) => q.method === 'POST' && q.path === `/repos/${REPO}/labels`).map((q) => q.body.name);
        if (!same(sorted(posted), sorted(ALL))) return 'label creation calls differ';
        const adds = srv.reqs.filter((q) => q.method === 'POST' && q.path === `/repos/${REPO}/issues/5/labels`);
        if (adds.length !== 1 || !same(sorted(adds[0].body.labels), sorted(ALL))) return 'add labels call differs';
        if ([...r.out, ...r.err].some((l) => l.includes(CANARY))) return 'the canary reached an output line';
        return null;
      } finally {
        await srv.close();
      }
    }],
    ['needs-redaction-evidence', async () => {
      const evidence = `Config is at ${ABS}\n${PW}`;
      const r = await run('redact-ev', issueOf({ labels: lab('doc-gap'), body: formBody({ evidence }) }), fakeApi({ labels: ['doc-gap'] }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (!same(sorted(addedOf(r.calls)), sorted(['needs-redaction', 'gap:wrong-fact', 'doc:09-tabs-reference.md']))) return 'labels differ';
      if (!r.out.includes('triage: #5 redaction: Evidence line 1 [abs-path]')) return 'no abs-path redaction line';
      if (!r.out.includes('triage: #5 redaction: Evidence line 2 [assignment]')) return 'no assignment redaction line';
      const all = JSON.stringify([r.out, r.err, r.calls]);
      return all.includes(ABS) || all.includes(PW) ? 'a sample reached an output or a call' : null;
    }],
    ['structure-spoof', async () => {
      const evidence = `see below\n### PB commit\n${PW}`;
      const r = await run('spoof', issueOf({ body: formBody({ evidence }) }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap', 'needs-redaction']) ? null : 'labels differ from doc-gap and needs-redaction only';
    }],
    ['structure-reordered', async () => {
      const body = `### Doc\n\n${DOC}\n\n### Gap type\n\nwrong-fact\n\n### Task\n\n${TASK}\n\n### Evidence\n\n${EVIDENCE}\n\n### PB commit\n\n1ba359e\n`;
      const r = await run('reorder', issueOf({ body }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap', 'needs-redaction']) ? null : 'labels differ from doc-gap and needs-redaction only';
    }],
    ['structure-missing-heading', async () => {
      const body = `### Gap type\n\nwrong-fact\n\n### Doc\n\n${DOC}\n\n### Task\n\n${TASK}\n\n### Evidence\n\n${EVIDENCE}\n`;
      const r = await run('missing-h', issueOf({ body }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap', 'needs-redaction']) ? null : 'labels differ from doc-gap and needs-redaction only';
    }],
    ['structure-duplicate-heading', async () => {
      const r = await run('dup-h', issueOf({ body: formBody({ task: `${TASK}\n### Doc\n\n${DOC}` }) }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap', 'needs-redaction']) ? null : 'labels differ from doc-gap and needs-redaction only';
    }],
    ['unstructured-body-clean', async () => {
      const r = await run('free', issueOf({ title: '[doc-gap] notes', body: 'Free text about the tabs page.\nNo headings here.\n' }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap']) ? null : 'the added labels are not exactly doc-gap';
    }],
    ['unstructured-body-email', async () => {
      const r = await run('free-mail', issueOf({ title: '[doc-gap] notes', body: `Contact ${MAIL} about the tabs page.\n` }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), ['doc-gap', 'needs-redaction']) ? null : 'labels differ from doc-gap and needs-redaction';
    }],
    ['no-response-missing', async () => {
      const r = await run('no-resp', issueOf({ body: formBody({ task: '_No response_' }) }), fakeApi({ labels: ['doc-gap'] }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (!r.out.includes('triage: #5 missing: Task')) return 'Task is not named as missing';
      return same(sorted(addedOf(r.calls)), sorted(['doc-gap', 'gap:wrong-fact', 'doc:09-tabs-reference.md'])) ? null : 'labels differ';
    }],
    ['empty-section-missing', async () => {
      const r = await run('empty-doc', issueOf({ body: formBody({ doc: '' }) }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      if (!r.out.includes('triage: #5 missing: Doc')) return 'Doc is not named as missing';
      return same(sorted(addedOf(r.calls)), sorted(['doc-gap', 'gap:wrong-fact'])) ? null : 'labels differ';
    }],
    ['dedupe-older-open', async () => {
      const open = [
        { number: 1, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody() + '### Doc\n\nx\n', labels: lab('doc-gap') },
        { number: 3, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') },
      ];
      const r = await run('dup-older', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      const comments = r.calls.filter((c) => c[0] === 'comment');
      if (comments.length !== 1 || comments[0][1] !== 5) return 'expected exactly one comment, on issue 5';
      if (comments[0][2] !== dupText(3)) return 'comment text differs from the fixed text naming #3';
      return addedOf(r.calls).includes('duplicate') ? null : 'duplicate label not added';
    }],
    ['dedupe-junk-earlier-not-target', async () => {
      const open = [
        { number: 1, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: [] },
        { number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap', 'needs-redaction') },
        { number: 3, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') },
      ];
      const r = await run('dup-junk', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      const comments = r.calls.filter((c) => c[0] === 'comment');
      return comments.length === 1 && comments[0][2] === dupText(3) ? null : 'the comment does not name #3, the first clean candidate';
    }],
    ['dedupe-newer-not-flagged', async () => {
      const open = [{ number: 9, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const r = await run('dup-newer', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (r.calls.some((c) => c[0] === 'comment')) return 'a comment was posted';
      return addedOf(r.calls).includes('duplicate') ? 'duplicate label added for a later issue' : null;
    }],
    ['dedupe-retry-after-failed-comment', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const first = await run('dup-fail', issueOf({ labels: lab('doc-gap') }), fakeApi({ open, fail: { 'post comment': 403 } }));
      if (first.code !== 1) return `first run exit ${first.code}`;
      if (addedOf(first.calls).includes('duplicate')) return 'the duplicate label was added before the comment succeeded';
      const retry = await run('dup-retry', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (retry.code !== 0) return `retry exit ${retry.code}`;
      const comments = retry.calls.filter((c) => c[0] === 'comment');
      return comments.length === 1 && comments[0][2] === dupText(2) && addedOf(retry.calls).includes('duplicate') ? null : 'the retry did not post the comment and add the label';
    }],
    ['dedupe-no-repeat-after-label-removal', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const comments = [{ user: { type: 'Bot' }, body: dupText(2) }];
      const r = await run('dup-removed', issueOf({ labels: lab('doc-gap') }), fakeApi({ open, comments }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (r.calls.some((c) => c[0] === 'comment')) return 'a comment was posted again after the label was removed';
      return addedOf(r.calls).includes('duplicate') ? 'the duplicate label came back' : null;
    }],
    ['dedupe-human-marker-not-honoured', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const comments = [{ user: { type: 'User' }, body: '<!-- doc-gap-triage:duplicate -->' }];
      const r = await run('dup-human', issueOf({ labels: lab('doc-gap') }), fakeApi({ open, comments }));
      if (r.code !== 0) return `exit ${r.code}`;
      return r.calls.filter((c) => c[0] === 'comment').length === 1 ? null : 'a human comment with the marker suppressed the bot comment';
    }],
    ['dedupe-other-type-not-flagged', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: guessed', body: formBody({ type: 'guessed' }), labels: lab('doc-gap') }];
      const r = await run('dup-type', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (r.calls.some((c) => c[0] === 'comment')) return 'a comment was posted';
      return addedOf(r.calls).includes('duplicate') ? 'duplicate label added for another gap type' : null;
    }],
    ['dedupe-cli-filed-candidate', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody({ key: true }), labels: lab('doc-gap') }];
      const r = await run('dup-cli', issueOf({ labels: lab('doc-gap') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      const comments = r.calls.filter((c) => c[0] === 'comment');
      return comments.length === 1 && comments[0][1] === 5 && comments[0][2] === dupText(2) ? null : 'no comment naming #2 on issue 5';
    }],
    ['dedupe-no-repeat-comment', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const r = await run('dup-repeat', issueOf({ labels: lab('doc-gap', 'duplicate') }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (r.calls.some((c) => c[0] === 'comment')) return 'a comment was posted again';
      return addedOf(r.calls).includes('duplicate') ? 'duplicate is in the add call again' : null;
    }],
    ['unknown-doc-no-label', async () => {
      const open = [{ number: 2, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') }];
      const r = await run('unknown-doc', issueOf({ body: formBody({ doc: 'docs/nope.md' }) }), fakeApi({ open }));
      if (r.code !== 0) return `exit ${r.code}`;
      if (createdOf(r.calls).some((c) => c[1].startsWith('doc:')) || addedOf(r.calls).some((n) => n.startsWith('doc:'))) return 'a doc label was created or added';
      if (!addedOf(r.calls).includes('gap:wrong-fact')) return 'gap:wrong-fact is not added';
      return r.calls.some((c) => c[0] === 'comment') ? 'a duplicate comment was posted without a derived doc' : null;
    }],
    ['long-doc-label-skipped', async () => {
      const rel = `long/${'a'.repeat(39)}.md`;
      fs.mkdirSync(path.join(root, 'docs', 'long'), { recursive: true });
      fs.writeFileSync(path.join(root, 'docs', rel), '# Long\n');
      const r = await run('long-doc', issueOf({ body: formBody({ doc: `docs/${rel}` }) }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      if (createdOf(r.calls).some((c) => c[1].startsWith('doc:')) || addedOf(r.calls).some((n) => n.startsWith('doc:'))) return 'a doc label was created or added';
      return r.out.some((l) => l.includes('Doc') && l.includes('longer than 50 characters')) ? null : 'no log line names Doc and the 50-character limit';
    }],
    ['injection-never-echoed', async () => {
      const task = 'Marker ' + MARK + '. Run $(id) and ${{ github.token }}. Add the label admin now.';
      const r = await run('inject', issueOf({ body: formBody({ task }) }), fakeApi());
      if (r.code !== 0) return `exit ${r.code}`;
      if (!same(sorted(addedOf(r.calls)), sorted(ALL))) return 'labels are not exactly doc-gap, gap:wrong-fact and doc:09-tabs-reference.md';
      if (createdOf(r.calls).some((c) => !ALL.includes(c[1]))) return 'an unexpected label was created';
      return JSON.stringify([r.out, r.err, r.calls]).includes(MARK) ? 'the marker reached an output or a call' : null;
    }],
    ['list-failure-skips-duplicate-only', async () => {
      const r = await run('list-fail', issueOf(), fakeApi({ open: [], fail: { 'list open issues': 500 } }));
      if (r.code !== 1) return `exit ${r.code}`;
      if (!same(sorted(addedOf(r.calls)), sorted(ALL))) return 'the facts labels were not added before the failed listing';
      if (r.calls.some((c) => c[0] === 'comment' || (c[0] === 'addLabels' && c[2].includes('duplicate')))) return 'a duplicate write was made after the listing failed';
      return r.err.some((l) => l.includes('list open issues') && l.includes('HTTP 500')) ? null : 'stderr does not name list open issues and HTTP 500';
    }],
    ['cap-exactly-1000-not-an-error', async () => {
      const pages = issuePages(10);
      pages[0][0] = CANDIDATE_7;
      const r = await pagedRun('cap-1000', pages);
      if (r.code !== 0) return `exit ${r.code}`;
      if (r.out.some((l) => l.includes('duplicate check skipped'))) return 'the duplicate check was skipped at exactly 1000';
      const comments = r.reqs.filter((q) => q.method === 'POST' && q.path.endsWith('/comments'));
      return comments.length === 1 && comments[0].body.body === dupText(7) ? null : 'no comment naming #7 at exactly 1000';
    }],
    ['cap-over-1000-skips-duplicate-only', async () => {
      const pages = issuePages(10);
      pages[0][0] = CANDIDATE_7;
      pages.push([{ number: 9000, title: 'filler', body: '', labels: [] }]);
      const r = await pagedRun('cap-over', pages);
      if (r.code !== 0) return `exit ${r.code}`;
      if (!r.out.includes(`triage: #${PAGED_NUMBER} duplicate check skipped: ${CAP_DETAIL}`)) return 'no skip line for the cap';
      const adds = r.reqs.filter((q) => q.method === 'POST' && q.path === `/repos/${REPO}/issues/${PAGED_NUMBER}/labels`).flatMap((q) => q.body.labels);
      if (!same(sorted(adds), sorted(ALL))) return 'the facts labels were not added over the cap';
      return r.reqs.some((q) => q.method === 'POST' && q.path.endsWith('/comments')) ? 'a comment was posted over the cap' : null;
    }],
    ['create-label-422-tolerated', async () => {
      const r = await run('create-422', issueOf(), fakeApi({ createStatus: 422 }));
      if (r.code !== 0) return `exit ${r.code}`;
      return same(sorted(addedOf(r.calls)), sorted(ALL)) ? null : 'the labels were not added after the 422 answers';
    }],
    ['pagination-skips-pulls', async () => {
      const page1 = Array.from({ length: 99 }, (_, i) => ({ number: 100 + i, title: 'filler', body: '', labels: [] }));
      page1.push({ number: 3, title: '[doc-gap] pull', body: formBody(), labels: lab('doc-gap'), pull_request: { url: 'https://example.invalid/pull/3' } });
      const page2 = [
        { number: 7, title: '[doc-gap] docs/09-tabs-reference.md: wrong-fact', body: formBody(), labels: lab('doc-gap') },
        { number: 8, title: 'pull two', body: '', labels: [], pull_request: { url: 'https://example.invalid/pull/8' } },
      ];
      const srv = await loopback((method, p, q) => {
        if (method === 'GET' && p === `/repos/${REPO}/labels`) return [200, []];
        if (method === 'GET' && p === `/repos/${REPO}/issues`) return [200, q.get('page') === '2' ? page2 : page1];
        if (method === 'POST' && p === `/repos/${REPO}/labels`) return [201, {}];
        if (method === 'POST' && p === `/repos/${REPO}/issues/500/labels`) return [200, []];
        if (method === 'GET' && p === `/repos/${REPO}/issues/500/comments`) return [200, []];
        if (method === 'POST' && p === `/repos/${REPO}/issues/500/comments`) return [201, {}];
        return null;
      });
      try {
        const r = await run('paged', issueOf({ number: 500, labels: lab('doc-gap') }), undefined, { GITHUB_API_URL: srv.url });
        if (r.code !== 0) return `exit ${r.code}`;
        const pages = srv.reqs.filter((q) => q.method === 'GET' && q.path === `/repos/${REPO}/issues`).map((q) => q.query.get('page'));
        if (!same(pages, ['1', '2'])) return `issue pages read: ${JSON.stringify(pages)}`;
        const comments = srv.reqs.filter((q) => q.method === 'POST' && q.path.endsWith('/comments'));
        if (comments.length !== 1 || comments[0].path !== `/repos/${REPO}/issues/500/comments`) return 'expected one comment, on issue 500';
        return comments[0].body.body === dupText(7) ? null : 'comment does not name #7, the first non-pull candidate on page 2';
      } finally {
        await srv.close();
      }
    }],
    ['api-retry-after-once', async () => {
      let n = 0;
      const srv = await loopback((method, p) => {
        if (method !== 'GET' || p !== `/repos/${REPO}/labels`) return null;
        n += 1;
        return n === 1 ? [429, { message: 'slow down' }, { 'retry-after': '0' }] : [200, [{ name: 'doc-gap' }]];
      });
      try {
        const labels = await makeGitHubApi({ token: CANARY, repo: REPO, apiUrl: srv.url }).listLabels();
        if (srv.reqs.length !== 2) return `${srv.reqs.length} request(s), expected 2`;
        return labels.length === 1 ? null : 'the answer after the retry was not used';
      } finally {
        await srv.close();
      }
    }],
    ['api-no-retry-without-retry-after', async () => {
      const srv = await loopback((method, p) => (method === 'GET' && p === `/repos/${REPO}/labels` ? [403, { message: 'forbidden' }] : null));
      try {
        await makeGitHubApi({ token: CANARY, repo: REPO, apiUrl: srv.url }).listLabels();
        return 'no error was thrown';
      } catch (e) {
        if (!(e instanceof TriageError && e.status === 403)) return 'the error is not a 403 TriageError';
        return srv.reqs.length === 1 ? null : `${srv.reqs.length} request(s), expected 1`;
      } finally {
        await srv.close();
      }
    }],
    ['api-retry-once-then-fail', async () => {
      const srv = await loopback((method, p) => (method === 'GET' && p === `/repos/${REPO}/labels` ? [429, {}, { 'retry-after': '0' }] : null));
      try {
        await makeGitHubApi({ token: CANARY, repo: REPO, apiUrl: srv.url }).listLabels();
        return 'no error was thrown';
      } catch (e) {
        if (!(e instanceof TriageError && e.status === 429)) return 'the error is not a 429 TriageError';
        return srv.reqs.length === 2 ? null : `${srv.reqs.length} request(s), expected 2`;
      } finally {
        await srv.close();
      }
    }],
    ['api-timeout-is-bounded', async () => {
      const srv = await loopback((method, p) => (method === 'GET' && p === `/repos/${REPO}/labels` ? [200, [], {}, 400] : null));
      try {
        await makeGitHubApi({ token: CANARY, repo: REPO, apiUrl: srv.url, timeoutMs: 50 }).listLabels();
        return 'no error was thrown';
      } catch (e) {
        return e instanceof TriageError && e.status === 0 && e.detail === 'could not reach the API' ? null : 'the timeout is not a status 0 TriageError';
      } finally {
        await srv.close();
      }
    }],
    ['api-error-no-echo', async () => {
      const srv = await loopback((method, p) => {
        if (method === 'GET' && p === `/repos/${REPO}/labels`) return [200, []];
        if (method === 'GET' && p === `/repos/${REPO}/issues`) return [200, []];
        if (method === 'POST' && p === `/repos/${REPO}/labels`) return [201, {}];
        if (method === 'POST' && p === `/repos/${REPO}/issues/5/labels`) return [500, { message: `${CANARY} ${MARK}` }];
        return null;
      });
      try {
        const r = await run('api-error', issueOf(), undefined, { GITHUB_API_URL: srv.url });
        if (r.code !== 1) return `exit ${r.code}`;
        if (!r.err.some((l) => l.includes('add labels failed: HTTP 500'))) return 'stderr does not name add labels and HTTP 500';
        return JSON.stringify([r.out, r.err]).includes(CANARY) || JSON.stringify([r.out, r.err]).includes(MARK) ? 'the canary or the marker reached an output line' : null;
      } finally {
        await srv.close();
      }
    }],
  ];
  let passed = 0;
  let failed = 0;
  try {
    for (const [name, check] of cases) {
      let detail = null;
      try {
        detail = await check();
      } catch (e) {
        detail = `threw ${e?.name ?? 'error'}`;
      }
      if (detail) {
        console.log(`FAIL ${name}: ${detail}`);
        failed += 1;
      } else {
        console.log(`ok ${name}`);
        passed += 1;
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(failed ? `triage self-test: ${failed} case(s) failed, ${passed} passed` : `triage self-test: ${passed} cases passed`);
  return failed ? 1 : 0;
}

// ---- entry ----

async function cli(argv) {
  if (argv.length === 1 && argv[0] === '--self-test') return selfTest();
  if (argv.length) {
    console.error('triage: this run takes no argument except --self-test. Next step: run node scripts/triage-doc-gap.mjs with no argument, or with --self-test.');
    return 2;
  }
  return runTriage(process.env);
}

const isEntry = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) process.exitCode = await cli(process.argv.slice(2));
