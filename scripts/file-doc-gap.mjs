#!/usr/bin/env node
// file-doc-gap: files a doc-gap issue built from the doc-gap form fields through gh, with a dedupe key.
// Usage: node scripts/file-doc-gap.mjs --type <gap type> --doc docs/<file>.md --pb-commit <sha|none> --task-file <file> --evidence-file <file> [--dry-run]
//        node scripts/file-doc-gap.mjs --self-test
// Exit: 0 filed, commented, saved, appended or dry-run; 1 refused, the report could not be saved, or not run from a docs checkout; 2 usage error.
// Output: the first stdout line is "filed: <url>", "commented: <url>", "saved: doc-gaps/<file>" or "appended: doc-gaps/<file>";
// errors go to stderr and end with a next step. When gh cannot file, the report goes to doc-gaps/ (docs/FEEDBACK.md Route 2).
// Refusals name the field, line and rule, never the text; nothing is filed when one fires.
// This is this repo's doc tool; AGENTS.md's "one driver, verify-platform.sh" rule governs PB core, not here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { FORM, FIELDS, TYPES, keyLine, titleOf, isDocPath, refuseHits, parityProblems, parseForm } from './lib/doc-gap-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'node scripts/file-doc-gap.mjs --type <gap type> --doc docs/<file>.md --pb-commit <sha|none> --task-file <file> --evidence-file <file>';
// The only repository a Route 1 issue is filed to (WR-05; docs/FEEDBACK.md names it). The self-test patches this line in its fixture copies.
const TARGET = 'DeBIOS-Foundation/powerbrowser-docs';

// ---- report: title, key line, body ----

function buildReport({ type, doc, task, evidence, pbCommit }) {
  const values = [type, doc, task, evidence, pbCommit];
  const body = `${keyLine(doc, type)}\n\n${FIELDS.map(([, label], i) => `### ${label}\n\n${values[i]}\n`).join('\n')}`;
  const title = titleOf(doc, type);
  return { type, doc, task, evidence, pbCommit, title, body, fileText: `# ${title}\n\n${body}` };
}

// ---- mentions and references ----

// An @mention, an owner/repo#N reference or a GitHub issue, pull or discussion URL; group 1 is the character before it.
const LINKS = /(^|[^A-Za-z0-9_`])(@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\/[A-Za-z0-9_.-]+)?|[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+#\d+|https?:\/\/github\.com\/[^\s`<>)]+\/(?:issues|pull|discussions)\/\d+[^\s`<>)]*)/g;

// Wraps LINKS outside code in backticks, so GitHub neither notifies an account nor adds a reference event to another repository.
// shortcut: code spans are found by splitting on single backticks; a double-backtick span or an escaped backtick can be misread.
function neutralise(text) {
  let fence = false;
  return text.split('\n').map((line) => {
    if (/^ {0,3}(```|~~~)/.test(line)) { fence = !fence; return line; }
    if (fence) return line;
    const parts = line.split('`');
    // An odd backtick count leaves the last one unmatched; escape it so it cannot pair with an added backtick.
    const odd = parts.length % 2 === 0;
    const out = parts.map((p, i) => (i % 2 === 0 || (odd && i === parts.length - 1) ? p.replace(LINKS, '$1`$2`') : p));
    return odd ? `${out.slice(0, -1).join('`')}\\\`${out[out.length - 1]}` : out.join('`');
  }).join('\n');
}

// ---- CLI validation ----

function usage(problem, fix) {
  console.error(`file-doc-gap: ${problem}. Next step: ${fix}; see docs/FEEDBACK.md Route 1.`);
  return 2;
}

// Returns the report, or the exit code of a usage error.
function readReport(o) {
  const missing = ['type', 'doc', 'pb-commit', 'task-file', 'evidence-file'].filter((k) => o[k] === undefined);
  if (missing.length) return usage(`missing ${missing.map((k) => `--${k}`).join(', ')}`, `run ${USAGE}`);
  if (!TYPES.includes(o.type)) return usage(`--type must be one of ${TYPES.join(', ')}`, 'pick the gap type from docs/FEEDBACK.md');
  const doc = o.doc;
  if (!isDocPath(doc)) {
    return usage('--doc must be a repo-relative path docs/<file>.md', 'pass the path of the doc that has the gap, for example docs/09-tabs-reference.md');
  }
  if (!fs.statSync(path.join(ROOT, doc), { throwIfNoEntry: false })?.isFile()) {
    return usage(`--doc ${doc} is not a file in this repo`, 'pass the path of an existing doc under docs/');
  }
  if (!/^([0-9a-f]{7,40}|none)$/.test(o['pb-commit'])) {
    return usage('--pb-commit must be a 7 to 40 character lowercase hex sha or none', 'pass the output of git -C "$PB_REPO" rev-parse --short HEAD, or none without a PB checkout');
  }
  const text = {};
  for (const k of ['task', 'evidence']) {
    try {
      // A lone CR ends a line on GitHub too, so normalise before the line-based refusals.
      text[k] = neutralise(fs.readFileSync(o[`${k}-file`], 'utf8').replace(/\r\n?/g, '\n').replace(/\s+$/, ''));
    } catch {
      return usage(`cannot read the --${k}-file file`, `write the ${k} text to a file and pass its path`);
    }
    if (!text[k]) return usage(`the --${k}-file file is empty`, `write the ${k} text into it`);
  }
  return buildReport({ type: o.type, doc, task: text.task, evidence: text.evidence, pbCommit: o['pb-commit'] });
}

// ---- refusals: run on task and evidence before any output, git or gh call; refuse, never redact ----

// The rule table lives in scripts/lib/doc-gap-rules.mjs; the messages below are unchanged.
// One stderr line per hit; the line text and the match are never printed.
const refuseLines = (field, text) => refuseHits(text)
  .map((h) => `file-doc-gap: refused: ${field} line ${h.line}: ${h.words} [${h.id}]`);
const refusals = (r) => ['task', 'evidence'].flatMap((field) => refuseLines(field, r[field]));

// The ### sections of a report file as { label: value }.
function sections(text) {
  const out = {};
  let cur = null;
  for (const l of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^### (.+)$/.exec(l);
    if (m) out[cur = m[1].trim()] = [];
    else if (cur) out[cur].push(l);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n').trim()]));
}

// ---- git and gh: argument arrays, never a shell ----

// --no-optional-locks: the PB checkout is read-only, so git must not refresh and rewrite its .git/index.
const git = (cwd, args) => {
  const r = spawnSync('git', ['--no-optional-locks', '-C', cwd, ...args], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};
// A stalled network must not hang the run; 500 issue bodies can pass the default 1 MiB buffer.
const gh = (args) => spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
const lastLine = (s) => (s ?? '').trim().split('\n').pop().trim();
// Why a gh call failed: the spawn error code or gh's last stderr line, dropped when it repeats report text or trips a refusal.
function ghWhy(res, r) {
  if (res.error) return ` (${res.error.code ?? 'gh did not run'})`;
  const l = lastLine(res.stderr).slice(0, 200);
  const echoes = `${r.task}\n${r.evidence}`.split('\n').some((x) => x.trim().length >= 4 && l.includes(x.trim()));
  return l && !echoes && !refuseLines('gh', l).length ? ` (gh: ${l})` : '';
}

// owner/repo of a GitHub remote URL, else null. Never print the URL itself: it can hold credentials.
function slugOf(url) {
  const m = /^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url ?? '');
  return m ? `${m[1]}/${m[2]}` : null;
}

const today = () => new Date().toISOString().slice(0, 10);

// '/' becomes '__' so docs/a/b.md and docs/a-b.md get different files; findLocal also checks the Doc section.
const slugOfDoc = (r) => `${r.doc.slice('docs/'.length, -'.md'.length).replaceAll('/', '__')}-${r.type}`;
// Writes an existing file without following a symbolic link (doc-gaps/ is tracked, so a link could be committed).
const REWRITE = fs.constants.O_WRONLY | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0);

// The doc-gaps/ file for this doc and gap type as { name, p, text }, or null.
// Throws when doc-gaps/ or a candidate is a symbolic link or another non-plain entry: never read or write through one.
function findLocal(r) {
  const dir = path.join(ROOT, 'doc-gaps');
  const st = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (!st) return null;
  if (!st.isDirectory()) throw new Error('doc-gaps is not a plain directory');
  const names = fs.readdirSync(dir).filter((f) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}-/.test(f) && f.slice(11) === `${slugOfDoc(r)}.md`).sort();
  for (const name of names) {
    const p = path.join(dir, name);
    if (!fs.lstatSync(p).isFile()) throw new Error(`doc-gaps/${name} is not a plain file`);
    const text = fs.readFileSync(p, 'utf8');
    if (sections(text).Doc === r.doc) return { name, p, text };
  }
  return null;
}

// An appended report keeps its own PB commit and Task, so its evidence is not read as checked at the file's commit.
const appendBlock = (r) => `Further report at PB commit ${r.pbCommit}.\n\nTask: ${r.task}\n\n${r.evidence}`;

// Route 2 fallback: write doc-gaps/<UTC date>-<slug>.md, or add the evidence to an existing file for the same doc and type.
function notFiled(r, reason) {
  const dir = path.join(ROOT, 'doc-gaps');
  let result;
  try {
    const old = findLocal(r);
    if (old) {
      const lines = old.text.split('\n');
      const at = lines.lastIndexOf('### PB commit');
      if (at >= 0) {
        lines.splice(at, 0, ...appendBlock(r).split('\n'), '');
        fs.writeFileSync(old.p, lines.join('\n'), { flag: REWRITE });
      } else {
        fs.writeFileSync(old.p, `${old.text.replace(/\n*$/, '\n')}\n${appendBlock(r)}\n`, { flag: REWRITE });
      }
      result = `appended: doc-gaps/${old.name}`;
    } else {
      fs.mkdirSync(dir, { recursive: true });
      const name = `${today()}-${slugOfDoc(r)}.md`;
      fs.writeFileSync(path.join(dir, name), r.fileText, { flag: 'wx' });
      result = `saved: doc-gaps/${name}`;
    }
  } catch (e) {
    process.stdout.write(r.fileText);
    console.error(`file-doc-gap: could not write doc-gaps/: ${e.message}. Next step: paste the text above into the doc-gap issue form.`);
    return 1;
  }
  console.log(result);
  console.error(`file-doc-gap: not filed on GitHub: ${reason}. Next step: tell the user the path; they file it as an issue, or commit and push it (docs/FEEDBACK.md Route 2).`);
  return 0;
}

function file(r) {
  const top = git(ROOT, ['rev-parse', '--show-toplevel']);
  const real = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
  if (!top || real(top) !== real(ROOT) || !['docs/FEEDBACK.md', FORM].every((f) => fs.existsSync(path.join(top, f)))) {
    // Route 2 writes only in a checkout of this repo; anywhere else the report is printed for Route 3.
    process.stdout.write(r.fileText);
    console.error('file-doc-gap: not filed and not saved: this is not a checkout of the docs repository. Next step: give the user the text above as docs/FEEDBACK.md Route 3 describes.');
    return 1;
  }
  const slug = slugOf(git(ROOT, ['remote', 'get-url', 'origin']));
  if (!slug) return notFiled(r, 'no GitHub remote named origin');
  if (slug.toLowerCase() !== TARGET.toLowerCase()) return notFiled(r, `origin is ${slug}, not the docs repository ${TARGET}`);
  // --active: an expired token on another account must not hide a working active login.
  const auth = gh(['auth', 'status', '--hostname', 'github.com', '--active']);
  if (auth.error?.code === 'ENOENT') return notFiled(r, 'gh is not installed');
  if (auth.status !== 0) return notFiled(r, `gh is not logged in or cannot reach github.com${ghWhy(auth, r)}`);
  const view = gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
  const resolved = view.status === 0 ? lastLine(view.stdout) : '';
  if (resolved.toLowerCase() !== slug.toLowerCase()) return notFiled(r, `gh resolves ${resolved || 'no repository'}, but origin is ${slug}${resolved ? '' : ghWhy(view, r)}`);
  const pbRepo = process.env.PB_REPO ? path.resolve(process.env.PB_REPO) : path.resolve(ROOT, '../Power-Browser');
  // Defence in depth: the TARGET pin above already refuses PowerBrowser's own repository; this guards a changed pin.
  const pbSlug = slugOf(git(pbRepo, ['remote', 'get-url', 'origin']));
  if (pbSlug && pbSlug.toLowerCase() === slug.toLowerCase()) return notFiled(r, "the repository is PowerBrowser's own repository");
  // Fail closed without a PB checkout too: the target must hold this repo's issue form.
  const form = gh(['api', '--hostname', 'github.com', `repos/${slug}/contents/${FORM}`, '--jq', '.path']);
  if (form.status !== 0 || lastLine(form.stdout) !== FORM) return notFiled(r, `cannot confirm that ${slug} holds ${FORM}, so it may not be the docs repository${ghWhy(form, r)}`);
  // github.com/ in -R: the origin check accepts only github.com, so GH_HOST must not move the target to another host.
  const target = `github.com/${slug}`;
  const labels = gh(['label', 'list', '-R', target, '--search', 'doc-gap', '--json', 'name', '-q', '.[].name']);
  if (labels.status !== 0) return notFiled(r, `gh label list failed${ghWhy(labels, r)}`);
  if (!labels.stdout.split('\n').some((l) => l.trim() === 'doc-gap')) {
    return notFiled(r, `the doc-gap label is missing in ${slug}; a maintainer of this repo creates it`);
  }
  // shortcut: only the 500 newest open doc-gap issues are checked (P-08); page through them if the tracker grows past that.
  const list = gh(['issue', 'list', '-R', target, '--label', 'doc-gap', '--state', 'open', '--limit', '500', '--json', 'number,body']);
  let issues = null;
  try { issues = JSON.parse(list.stdout); } catch { /* not JSON: handled below */ }
  if (list.status !== 0 || !Array.isArray(issues)) return notFiled(r, `gh issue list failed${ghWhy(list, r)}`);
  // WR-08: a match needs the same form test as triage (parseForm, rule S6). A body that is not a form never matches, so a
  // third-party issue with a matching title or key line cannot capture the report.
  const dup = issues.find((it) => {
    if (typeof it?.body !== 'string') return false;
    const form = parseForm(it.body);
    return form.kind === 'form' && form.values.Doc === r.doc && form.values['Gap type'] === r.type;
  });
  // An unfiled doc-gaps/ report for the same key goes into this issue or comment, so it is not filed twice later.
  let local;
  try { local = findLocal(r); } catch (e) { return notFiled(r, e.message); }
  let send = r;
  if (local) {
    const sec = sections(local.text);
    if (!sec.Evidence) return notFiled(r, `doc-gaps/${local.name} has no Evidence section to merge into the filed report`);
    const old = { task: neutralise(sec.Task ?? ''), evidence: neutralise(sec.Evidence), pb: sec['PB commit'] ?? '' };
    // The file is tracked in git and may be hand-written, so its text passes the same refusals as --task-file and --evidence-file.
    const hits = Object.entries(old).flatMap(([k, v]) => refuseLines(`doc-gaps/${local.name} ${k}`, v));
    if (hits.length) {
      for (const h of hits) console.error(h);
      console.error(`file-doc-gap: nothing was filed. Next step: rewrite each named line of doc-gaps/${local.name} within the Evidence rules in docs/FEEDBACK.md, then rerun.`);
      return 1;
    }
    send = buildReport({ ...r, evidence: `${r.evidence}\n\nUnfiled report doc-gaps/${local.name}, PB commit ${old.pb}.\n\nTask: ${old.task}\n\n${old.evidence}` });
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-gap-'));
  try {
    const bodyFile = path.join(dir, 'body.md');
    fs.writeFileSync(bodyFile, send.body, { mode: 0o600 });
    const res = dup
      ? gh(['issue', 'comment', String(dup.number), '-R', target, '--body-file', bodyFile])
      : gh(['issue', 'create', '-R', target, '--title', r.title, '--label', 'doc-gap', '--body-file', bodyFile]);
    if (res.status !== 0) return notFiled(r, `${dup ? 'gh issue comment failed' : 'gh issue create failed'}${ghWhy(res, r)}`);
    console.log(`${dup ? 'commented' : 'filed'}: ${lastLine(res.stdout)}`);
    if (local) console.error(`file-doc-gap: the report in doc-gaps/${local.name} is included. Next step: tell the user they can delete doc-gaps/${local.name}.`);
    return 0;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---- self-test ----

const FIX_GIT_ENV = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
function fixGit(cwd, ...args) {
  const r = spawnSync('git', ['--no-optional-locks', '-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, ...FIX_GIT_ENV } });
  if (r.status !== 0) throw new Error(`fixture git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// The fake gh: answers from FAKE_GH_STATE and logs each call, with the --body-file content, to FAKE_GH_LOG.
const FAKE_GH = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
const st = JSON.parse(fs.readFileSync(process.env.FAKE_GH_STATE, 'utf8'));
const i = argv.indexOf('--body-file');
const bodyFile = i < 0 ? null : argv[i + 1];
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ argv, bodyFile, body: bodyFile ? fs.readFileSync(bodyFile, 'utf8') : null }) + '\\n');
const cmd = argv[0] === 'api' ? 'api' : argv.slice(0, 2).join(' ');
// The flags each call may use (checked against gh 2.102.0 --help); anything else is a typo in the script.
const FLAGS = { 'auth status': ['--hostname', '--active'], 'repo view': ['--json', '-q'], api: ['--hostname', '--jq'],
  'label list': ['-R', '--search', '--json', '-q'], 'issue list': ['-R', '--label', '--state', '--limit', '--json'],
  'issue comment': ['-R', '--body-file'], 'issue create': ['-R', '--title', '--label', '--body-file'] };
if (!FLAGS[cmd] || argv.some((a) => a.startsWith('-') && !FLAGS[cmd].includes(a))) { process.stderr.write('fake gh: unknown command or flag\\n'); process.exit(64); }
if ((st.fail || []).includes(cmd)) { process.stderr.write('HTTP 502: fake failure\\n'); process.exit(1); }
const out = (s) => { process.stdout.write(s + '\\n'); process.exit(0); };
if (cmd === 'auth status') process.exit(st.auth ? 0 : 1);
if (cmd === 'repo view') out(st.repo);
if (cmd === 'api') { if (st.form) out('.github/ISSUE_TEMPLATE/doc-gap.yml'); process.stderr.write('HTTP 404: Not Found\\n'); process.exit(1); }
if (cmd === 'label list') out((st.labels || []).join('\\n'));
if (cmd === 'issue list') out(st.issuesRaw ?? JSON.stringify(st.issues || []));
if (cmd === 'issue comment') { const it = (st.issues || []).find((x) => String(x.number) === argv[2]); if (it) out(it.url + '#issuecomment-1'); }
if (cmd === 'issue create') out('https://github.com/acme/docs/issues/99');
process.exit(1);
`;

const findOnPath = (name) => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
  .map((d) => path.join(d, name)).find((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });

const CHILD_ENV_KEYS = ['FAKE_GH_LOG', 'FAKE_GH_STATE', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'HOME', 'PATH', 'PB_REPO', 'TMPDIR'];
const DEFAULT_STATE = { auth: true, repo: 'acme/docs', form: true, labels: ['doc-gap'], issues: [] };
const TASK = 'Adding a panel that needed the group write call.';
const EVIDENCE = 'The doc names `openGroup` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.\nThe source has no such member.';
const DOC = 'docs/09-tabs-reference.md';

// The S2 body, written out literally so the test does not reuse buildReport.
const expectedBody = (ev = EVIDENCE, sha = '1ba359e', task = TASK) => [
  '<!-- doc-gap:docs/09-tabs-reference.md:wrong-fact -->', '',
  '### Gap type', '', 'wrong-fact', '',
  '### Doc', '', DOC, '',
  '### Task', '', task, '',
  '### Evidence', '', ev, '',
  '### PB commit', '', sha, '',
].join('\n');
const expectedFile = (...a) => `# [doc-gap] docs/09-tabs-reference.md: wrong-fact\n\n${expectedBody(...a)}`;
const KEY = '<' + '!-- doc-gap:docs/09-tabs-reference.md:wrong-fact -->';
// A complete form body, as a web-form issue or a report filed by this script has it (WR-08: only a form body can match).
const formBody = (type = 'wrong-fact', doc = DOC) => `${KEY}\n\n${FIELDS.map(([, label]) => `### ${label}\n\n${{ 'Gap type': type, Doc: doc }[label] ?? 'Old text.'}\n`).join('\n')}`;

// Refusal samples, built by concatenation so this file holds no contiguous secret-shaped literal: [case, rule id, line, refused line number (default 2)].
const X = 'Zq9'.repeat(12);
const H = createHash('sha256').update('file-doc-gap sample').digest('hex');
const SAMPLES = [
  ['refuse-home', 'abs-path', '/ho' + 'me/someone/notes.txt'],
  ['refuse-users', 'abs-path', 'See /Us' + 'ers/someone/notes.txt'],
  ['refuse-windows', 'abs-path', 'C:' + '\\Users\\someone\\notes.txt'],
  ['refuse-tilde', 'abs-path', 'See ~' + '/notes.txt'],
  ['refuse-ghp', 'token-prefix', 'gh' + 'p_' + X],
  ['refuse-github-pat', 'token-prefix', 'github' + '_pat_' + X],
  ['refuse-sk', 'token-prefix', 'sk' + '-' + X],
  ['refuse-akia', 'token-prefix', 'AK' + 'IA' + 'ZQ9'.repeat(5) + 'Z'],
  ['refuse-xox', 'token-prefix', 'xo' + 'xb-' + X],
  ['refuse-private-key', 'private-key', '-----BEGIN RSA PRIV' + 'ATE KEY-----'],
  ['refuse-password', 'assignment', 'pass' + 'word=' + X],
  ['refuse-token', 'assignment', 'export TOK' + 'EN=' + X],
  // P-03: a 48-character slice of a sha512 base64 digest scores 4.6-4.95 bits per character.
  ['refuse-entropy', 'high-entropy', createHash('sha512').update('file-doc-gap').digest('base64').slice(0, 48)],
  ['refuse-long-hex', 'high-entropy', createHash('sha256').update('file-doc-gap').digest('hex').slice(0, 41)],
  ['refuse-password-colon', 'assignment', 'pass' + 'word: hunter2' + 'hunter2'],
  ['refuse-password-spaced', 'assignment', 'pass' + 'word = hunter2'],
  ['refuse-secret-colon', 'assignment', 'sec' + "ret: 'value'"],
  ['refuse-token-json', 'assignment', '{"to' + 'ken": "abcd1234efgh"}'],
  ['refuse-bearer', 'bearer', 'Authorization: Bea' + 'rer ' + X],
  ['refuse-sk-live', 'token-prefix', 'sk' + '_live_' + X],
  ['refuse-glpat', 'token-prefix', 'gl' + 'pat-' + X],
  ['refuse-asia', 'token-prefix', 'AS' + 'IA' + 'ZQ9'.repeat(5) + 'Z'],
  ['refuse-aiza', 'token-prefix', 'AI' + 'za' + X.slice(0, 35)],
  ['refuse-uuid', 'uuid', [8, 4, 4, 4, 12].map((len, i) => H.slice(i * 8, i * 8 + len)).join('-')],
  ['refuse-0x-hex', 'split-hex', '0' + 'x' + H.slice(0, 40)],
  ['refuse-split-hex', 'split-hex', [0, 16, 32].map((i) => H.slice(i, i + 16)).join('_')],
  ['refuse-email', 'email', 'Mail someone' + '@example.com'],
  ['refuse-html-comment', 'hidden-comment', '<' + '!-- hidden note --' + '>'],
  ['refuse-heading', 'heading', '#' + '## Doc'],
  ['refuse-indented-heading', 'heading', '   #' + '## Doc'],
  ['refuse-tab-heading', 'heading', '#' + '##\tDoc'],
  ['refuse-bare-cr-heading', 'heading', 'ok line\r#' + '## PB commit', 3],
];

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'file-doc-gap-'));
  let passed = 0;
  let failed = 0;
  try {
    const formText = fs.readFileSync(path.join(ROOT, FORM), 'utf8');
    const self = fs.readFileSync(fileURLToPath(import.meta.url));
    const TARGET_LINE = /^const TARGET = '[^']*';$/m;
    const sharedRules = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'doc-gap-rules.mjs'));
    const realGit = findOnPath('git');
    if (!realGit) throw new Error('no git on PATH');
    const bin = path.join(tmp, 'bin');
    const binNoGh = path.join(tmp, 'bin-no-gh');
    for (const d of [bin, binNoGh]) { fs.mkdirSync(d); fs.symlinkSync(realGit, path.join(d, 'git')); }
    fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, { mode: 0o755 });
    const home = path.join(tmp, 'home');
    const tmpdir = path.join(tmp, 'tmp');
    fs.mkdirSync(home);
    fs.mkdirSync(tmpdir);
    const pb = path.join(tmp, 'pb');
    fs.mkdirSync(pb);
    fixGit(pb, 'init', '-q');
    fixGit(pb, 'remote', 'add', 'origin', 'https://github.com/acme/pb.git');

    let n = 0;
    // A fresh docs-repo fixture holding a copy of this script, so the copy's ROOT is the fixture.
    // target: the repository the copy's TARGET constant names (WR-05); null keeps the production constant.
    const fixture = ({ origin = 'git@github.com:acme/docs.git', feedback = true, target = 'acme/docs' } = {}) => {
      const fx = path.join(tmp, `case-${++n}`);
      const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(fx, rel)), { recursive: true }); fs.writeFileSync(path.join(fx, rel), text); };
      put('scripts/file-doc-gap.mjs', target === null ? self : self.toString().replace(TARGET_LINE, `const TARGET = '${target}';`));
      put('scripts/lib/doc-gap-rules.mjs', sharedRules);
      put(FORM, formText);
      put(DOC, '# Tabs\n');
      if (feedback) put('docs/FEEDBACK.md', '# Reporting doc gaps\n');
      fixGit(fx, 'init', '-q');
      if (origin) fixGit(fx, 'remote', 'add', 'origin', origin);
      return fx;
    };
    // pbRepo null leaves PB_REPO unset; the script then looks for ../Power-Browser, which the fixtures lack.
    const childEnv = (noGh, stateFile, logFile, pbRepo = pb) => ({
      PATH: noGh ? binNoGh : bin, HOME: home, TMPDIR: tmpdir, ...(pbRepo ? { PB_REPO: pbRepo } : {}), ...FIX_GIT_ENV,
      FAKE_GH_STATE: stateFile, FAKE_GH_LOG: logFile,
    });
    // Runs the fixture's copy; task and evidence files live outside the fixture.
    const cli = (fx, { args, task = TASK, evidence = EVIDENCE, state = {}, noGh = false, flags = {}, pbRepo = pb } = {}) => {
      const io = `${fx}-io`;
      fs.mkdirSync(io, { recursive: true });
      const tf = path.join(io, 'task.txt');
      const ef = path.join(io, 'evidence.txt');
      fs.writeFileSync(tf, `${task}\n`);
      fs.writeFileSync(ef, `${evidence}\n`);
      const stateFile = path.join(io, 'state.json');
      const logFile = path.join(io, 'gh.log');
      fs.writeFileSync(stateFile, JSON.stringify({ ...DEFAULT_STATE, ...state }));
      fs.writeFileSync(logFile, '');
      const base = { '--type': 'wrong-fact', '--doc': DOC, '--pb-commit': '1ba359e', '--task-file': tf, '--evidence-file': ef, ...flags };
      const argv = args ?? Object.entries(base).flatMap(([k, v]) => (v === null ? [] : v === true ? [k] : [k, v]));
      const r = spawnSync(process.execPath, [path.join(fx, 'scripts/file-doc-gap.mjs'), ...argv], { cwd: fx, encoding: 'utf8', env: childEnv(noGh, stateFile, logFile, pbRepo) });
      const calls = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
      return { code: r.status, out: r.stdout, err: r.stderr, calls, first: r.stdout.split('\n')[0], fx };
    };
    const want = (cond, detail) => (cond ? null : detail);
    const show = (r) => `code ${r.code}, stdout ${JSON.stringify(r.out)}, stderr ${JSON.stringify(r.err)}`;
    const usageCase = (flags, needle) => () => {
      const r = cli(fixture(), { flags });
      return want(r.code === 2 && r.err.includes('Next step:') && r.err.includes(needle) && !r.calls.length, `${show(r)}, ${r.calls.length} gh call(s)`);
    };
    const callsOf = (r, cmd) => r.calls.filter((c) => c.argv.slice(0, 2).join(' ') === cmd);
    // A run that cannot file: exit 0, saved: line, the S2 file text on disk, the reason and a next step on stderr.
    const fallbackCase = (fxOpts, runOpts, reason, { noCalls = false, creates = 0 } = {}) => () => {
      const r = cli(fixture(fxOpts), runOpts);
      const name = `${today()}-09-tabs-reference-wrong-fact.md`;
      const p = path.join(r.fx, 'doc-gaps', name);
      return want(r.code === 0 && r.first === `saved: doc-gaps/${name}`, show(r))
        ?? want(fs.existsSync(p) && fs.readFileSync(p, 'utf8') === expectedFile(), 'the saved file differs from the report text')
        ?? want(r.err.includes(reason) && r.err.includes('Next step:'), `stderr ${JSON.stringify(r.err)}`)
        ?? want(callsOf(r, 'issue create').length === creates, `${callsOf(r, 'issue create').length} issue create call(s)`)
        ?? want(!noCalls || !r.calls.length, `${r.calls.length} gh call(s), want none`);
    };
    const repoFlag = (c) => { const i = c.argv.indexOf('-R'); return i >= 0 && c.argv[i + 1] === 'github.com/acme/docs'; };

    const cases = [
      ['parity-form', () => { const p = parityProblems(formText); return p.length ? p.join('; ') : null; }],
      ['parity-detects-change', () => want(parityProblems(formText.replace(/label: Doc$/m, 'label: Document')).length > 0
        && parityProblems('name: x\n').some((p) => p.includes(FORM)), 'a changed label or a form without ids was not reported')],
      ['dry-run', () => {
        const r = cli(fixture(), { flags: { '--dry-run': true } });
        return want(r.code === 0 && r.out === expectedFile() && !r.calls.length && !fs.existsSync(path.join(r.fx, 'doc-gaps')), show(r));
      }],
      ['sha-40-accepted', () => {
        const sha = 'a'.repeat(20) + '0123456789abcdef0123';
        const ev = `Checked at ${sha} and 1ba359e.`;
        const r = cli(fixture(), { evidence: ev, flags: { '--dry-run': true, '--pb-commit': sha } });
        return want(r.code === 0 && r.out === expectedFile(ev, sha), show(r));
      }],
      ['pb-commit-none-accepted', () => {
        const r = cli(fixture(), { flags: { '--dry-run': true, '--pb-commit': 'none' } });
        const l = r.out.split('\n');
        return want(r.code === 0 && l[l.indexOf('### PB commit') + 2] === 'none', show(r));
      }],
      ['usage-missing-flag', usageCase({ '--doc': null }, '--doc')],
      ['usage-unknown-flag', usageCase({ '--colour': 'red' }, '--colour')],
      ['usage-bad-type', usageCase({ '--type': 'typo' }, '--type')],
      ['usage-doc-outside-docs', usageCase({ '--doc': 'README.md' }, '--doc')],
      ['usage-doc-dotdot', usageCase({ '--doc': 'docs/../AGENTS.md' }, '--doc')],
      ['usage-doc-missing', usageCase({ '--doc': 'docs/nope.md' }, '--doc')],
      ['usage-pb-commit-short', usageCase({ '--pb-commit': 'abcdef' }, '--pb-commit')],
      ['usage-pb-commit-41', usageCase({ '--pb-commit': 'a'.repeat(41) }, '--pb-commit')],
      ['usage-task-file-missing', usageCase({ '--task-file': path.join(tmp, 'no-such-file') }, '--task-file')],
      ['usage-evidence-empty', () => {
        const r = cli(fixture(), { evidence: ' \n\t ' });
        return want(r.code === 2 && r.err.includes('Next step:') && r.err.includes('--evidence-file') && !r.calls.length, show(r));
      }],
      ['file-new', () => {
        const r = cli(fixture());
        const creates = callsOf(r, 'issue create');
        const c = creates[0];
        const at = (flag) => c.argv[c.argv.indexOf(flag) + 1];
        const leaks = r.calls.flatMap((x) => x.argv).filter((a) => a.includes('panel that needed') || a.includes('openGroup') || a.includes('no such member'));
        return want(r.code === 0, show(r))
          ?? want(r.first === 'filed: https://github.com/acme/docs/issues/99', show(r))
          ?? want(creates.length === 1, `${creates.length} issue create calls`)
          ?? want(repoFlag(c) && at('--title') === '[doc-gap] docs/09-tabs-reference.md: wrong-fact' && at('--label') === 'doc-gap', `argv ${JSON.stringify(c.argv)}`)
          ?? want(c.body === expectedBody(), `body ${JSON.stringify(c.body)}`)
          ?? want(r.calls.filter((x) => ['issue', 'label'].includes(x.argv[0])).every(repoFlag), 'an issue or label call lacks -R github.com/acme/docs')
          ?? want(!leaks.length, `issue text in argv: ${JSON.stringify(leaks)}`)
          ?? want(!path.resolve(c.bodyFile).startsWith(r.fx + path.sep) && !fs.existsSync(c.bodyFile), `body file ${c.bodyFile} inside the fixture or left behind`);
      }],
      ['isolation', () => {
        const env = childEnv(false, 's', 'l');
        return want(JSON.stringify(fs.readdirSync(bin).sort()) === '["gh","git"]', `bin holds ${fs.readdirSync(bin)}`)
          ?? want(fs.readFileSync(path.join(bin, 'gh'), 'utf8') === FAKE_GH, 'bin/gh is not the fake gh')
          ?? want(JSON.stringify(fs.readdirSync(binNoGh)) === '["git"]', `bin-no-gh holds ${fs.readdirSync(binNoGh)}`)
          ?? want(JSON.stringify(Object.keys(env).sort()) === JSON.stringify(CHILD_ENV_KEYS), `child env keys ${Object.keys(env).sort()}`)
          ?? want(env.PATH === bin && childEnv(true, 's', 'l').PATH === binNoGh, 'child PATH is not the bin dir alone');
      }],
      ...SAMPLES.map(([name, rule, sample, line = 2]) => [name, () => {
        const r = cli(fixture(), { evidence: `Line one is fine.\n${sample}` });
        const all = r.out + r.err;
        return want(r.code === 1 && r.err.includes(`refused: evidence line ${line}: `) && r.err.includes(`[${rule}]`), show(r))
          ?? want(!all.includes(sample), 'the sample was echoed')
          ?? want(!r.calls.length && !fs.existsSync(path.join(r.fx, 'doc-gaps')), 'gh was called or a file was written');
      }]),
      ['refuse-task-field', () => {
        const r = cli(fixture(), { task: 'someone' + '@example.com' });
        return want(r.code === 1 && r.err.includes('refused: task line 1: ') && r.err.includes('[email]') && !r.calls.length, show(r));
      }],
      ['allow-safe-evidence', () => {
        const ev = [
          'Read `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and docs/09-tabs-reference.md.',
          `Checked at ${'0123456789abcdef'.repeat(2)}01234567 and 1ba359e.`,
          `Short sha ${'0123456789abcdef'.repeat(2)} also checked; const token = getToken();`,
          'Quote: const token = readCookie(); task-list; @powerbrowser/token-gate',
          'Symbol chrome_bar_frontend_module_v2_registration_handler; see https://github.com/acme/docs/issues/7',
        ].join('\n');
        const r = cli(fixture(), { evidence: ev, flags: { '--dry-run': true } });
        const shown = ev.replace('@powerbrowser/token-gate', '`@powerbrowser/token-gate`').replace('https://github.com/acme/docs/issues/7', '`https://github.com/acme/docs/issues/7`');
        return want(r.code === 0 && r.out === expectedFile(shown), show(r));
      }],
      ['neutralise-mentions', () => {
        const ev = ['* @param {string} uri', 'See acme/pb#12 and https://github.com/acme/pb/issues/12 for context.',
          'Quoted `@param` and `acme/pb#12` stay.', '```js', '@inside a fence', '```', 'Odd ` backtick then @someone'];
        const shown = ['* `@param` {string} uri', 'See `acme/pb#12` and `https://github.com/acme/pb/issues/12` for context.',
          'Quoted `@param` and `acme/pb#12` stay.', '```js', '@inside a fence', '```', 'Odd \\` backtick then `@someone`'];
        const r = cli(fixture(), { evidence: ev.join('\n'), task: 'Ask @someone.', flags: { '--dry-run': true } });
        return want(r.code === 0 && r.out === expectedFile(shown.join('\n'), '1ba359e', 'Ask `@someone`.'), show(r));
      }],
      ['dedupe-comment', () => {
        const issues = [{ number: 3, url: 'https://github.com/acme/docs/issues/3', body: 'unrelated' }, { number: 7, url: 'https://github.com/acme/docs/issues/7', body: formBody() }];
        const r = cli(fixture(), { state: { issues } });
        const c = callsOf(r, 'issue comment');
        return want(r.code === 0 && r.first === 'commented: https://github.com/acme/docs/issues/7#issuecomment-1', show(r))
          ?? want(c.length === 1 && JSON.stringify(c[0].argv.slice(0, 6)) === '["issue","comment","7","-R","github.com/acme/docs","--body-file"]' && c[0].body === expectedBody(), `comment calls ${JSON.stringify(c)}`)
          ?? want(!callsOf(r, 'issue create').length, 'an issue was created');
      }],
      ['dedupe-other-key', () => {
        const issues = [{ number: 7, url: 'https://github.com/acme/docs/issues/7', body: formBody('guessed') }];
        const r = cli(fixture(), { state: { issues } });
        return want(r.code === 0 && r.first === 'filed: https://github.com/acme/docs/issues/99', show(r))
          ?? want(callsOf(r, 'issue create').length === 1 && !callsOf(r, 'issue comment').length, 'expected one issue create and no comment');
      }],
      ['dedupe-non-form-ignored', () => {
        const body = `${KEY}\n\n### Gap type\n\nwrong-fact\n\n### Doc\n\n${DOC}\n`;
        const r = cli(fixture(), { state: { issues: [{ number: 7, url: 'https://github.com/acme/docs/issues/7', body }] } });
        return want(r.code === 0 && r.first.startsWith('filed: '), show(r))
          ?? want(callsOf(r, 'issue create').length === 1 && !callsOf(r, 'issue comment').length, 'a non-form body with a matching key line and sections was used as the match');
      }],
      ['dedupe-form-sections', () => {
        const body = formBody();
        const r = cli(fixture(), { state: { issues: [{ number: 7, url: 'https://github.com/acme/docs/issues/7', body }] } });
        const c = callsOf(r, 'issue comment');
        return want(r.code === 0 && r.first.startsWith('commented: '), show(r))
          ?? want(c.length === 1 && c[0].argv[2] === '7', `comment calls ${JSON.stringify(c)}`)
          ?? want(!callsOf(r, 'issue create').length, 'an issue was created');
      }],
      ['dedupe-form-other-type', () => {
        const body = formBody('guessed');
        const r = cli(fixture(), { state: { issues: [{ number: 7, url: 'https://github.com/acme/docs/issues/7', body }] } });
        return want(r.code === 0 && r.first.startsWith('filed: '), show(r))
          ?? want(callsOf(r, 'issue create').length === 1 && !callsOf(r, 'issue comment').length, 'expected one issue create and no comment');
      }],
      ['target-pin-refuses-other', fallbackCase({ target: null }, {}, 'origin is acme/docs, not the docs repository DeBIOS-Foundation/powerbrowser-docs', { noCalls: true })],
      ['target-pin-files-target', () => {
        const fx = fixture({ origin: 'git@github.com:DeBIOS-Foundation/powerbrowser-docs.git', target: null });
        const r = cli(fx, { state: { repo: 'DeBIOS-Foundation/powerbrowser-docs' } });
        const c = callsOf(r, 'issue create');
        return want(r.code === 0 && r.first.startsWith('filed: '), show(r))
          ?? want(c.length === 1 && c[0].argv[c[0].argv.indexOf('-R') + 1] === 'github.com/DeBIOS-Foundation/powerbrowser-docs', `create calls ${JSON.stringify(c)}`);
      }],
      ['fallback-no-gh', fallbackCase({}, { noGh: true }, 'gh is not installed')],
      ['fallback-unauthenticated', fallbackCase({}, { state: { auth: false } }, 'gh is not logged in')],
      ['gh-why-drops-echo', () => {
        const r = { task: TASK, evidence: EVIDENCE };
        return want(ghWhy({ stderr: 'x\nHTTP 502: fake failure\n' }, r) === ' (gh: HTTP 502: fake failure)', 'plain stderr line not shown')
          ?? want(ghWhy({ stderr: `error: ${TASK}` }, r) === '', 'stderr that repeats the task was shown')
          ?? want(ghWhy({ stderr: 'see /ho' + 'me/someone/x' }, r) === '', 'stderr with a home path was shown')
          ?? want(ghWhy({ error: { code: 'ETIMEDOUT' } }, r) === ' (ETIMEDOUT)', 'spawn error code not shown');
      }],
      ['fallback-no-remote', fallbackCase({ origin: null }, {}, 'no GitHub remote named origin', { noCalls: true })],
      ['fallback-non-github-remote', fallbackCase({ origin: 'https://gitlab.com/acme/docs.git' }, {}, 'no GitHub remote named origin', { noCalls: true })],
      ['fallback-other-repo', fallbackCase({}, { state: { repo: 'acme/other' } }, 'gh resolves acme/other, but origin is acme/docs')],
      ['fallback-pb-repo', fallbackCase({ origin: 'git@github.com:acme/pb.git', target: 'acme/pb' }, { state: { repo: 'acme/pb' } }, "PowerBrowser's own repository")],
      ['fallback-no-pb-checkout-no-form', fallbackCase({}, { pbRepo: null, state: { form: false } }, 'cannot confirm that acme/docs holds .github/ISSUE_TEMPLATE/doc-gap.yml')],
      ['file-no-pb-checkout', () => {
        const r = cli(fixture(), { pbRepo: null });
        const api = callsOf(r, 'api --hostname');
        return want(r.code === 0 && r.first === 'filed: https://github.com/acme/docs/issues/99', show(r))
          ?? want(api.length === 1 && api[0].argv.includes('repos/acme/docs/contents/.github/ISSUE_TEMPLATE/doc-gap.yml'), `api calls ${JSON.stringify(api)}`);
      }],
      ['not-docs-repo-prints', () => {
        const r = cli(fixture({ feedback: false }));
        return want(r.code === 1 && r.out === expectedFile() && r.err.includes('not a checkout of the docs repository') && r.err.includes('Route 3'), show(r))
          ?? want(!r.calls.length && !fs.existsSync(path.join(r.fx, 'doc-gaps')), 'gh was called or doc-gaps/ was written');
      }],
      ['nested-in-other-repo-prints', () => {
        const outer = path.join(tmp, `outer-${++n}`);
        const fx = fixture();
        fs.rmSync(path.join(fx, '.git'), { recursive: true });
        fs.mkdirSync(outer);
        fixGit(outer, 'init', '-q');
        for (const f of ['docs/FEEDBACK.md', FORM]) { fs.mkdirSync(path.dirname(path.join(outer, f)), { recursive: true }); fs.writeFileSync(path.join(outer, f), 'x\n'); }
        const sub = path.join(outer, 'vendored');
        fs.renameSync(fx, sub);
        const r = cli(sub);
        return want(r.code === 1 && r.err.includes('not a checkout of the docs repository') && !r.calls.length, show(r))
          ?? want(!fs.existsSync(path.join(sub, 'doc-gaps')) && !fs.existsSync(path.join(outer, 'doc-gaps')), 'doc-gaps/ was written');
      }],
      ['fallback-no-label', fallbackCase({}, { state: { labels: [] } }, 'the doc-gap label is missing in acme/docs')],
      ['fallback-create-fails', fallbackCase({}, { state: { fail: ['issue create'] } }, 'gh issue create failed (gh: HTTP 502: fake failure)', { creates: 1 })],
      ['fallback-label-list-fails', fallbackCase({}, { state: { fail: ['label list'] } }, 'gh label list failed')],
      ['fallback-issue-list-fails', fallbackCase({}, { state: { fail: ['issue list'] } }, 'gh issue list failed')],
      ['fallback-issue-list-not-json', fallbackCase({}, { state: { issuesRaw: 'not json' } }, 'gh issue list failed')],
      ['fallback-comment-fails', fallbackCase({}, { state: { fail: ['issue comment'], issues: [{ number: 7, body: formBody() }] } }, 'gh issue comment failed')],
      ['fake-gh-rejects-flags', () => {
        const st = path.join(tmp, 'fake-state.json');
        const log = path.join(tmp, 'fake-log');
        fs.writeFileSync(st, JSON.stringify(DEFAULT_STATE));
        const run = (...a) => spawnSync(path.join(bin, 'gh'), a, { encoding: 'utf8', env: { FAKE_GH_STATE: st, FAKE_GH_LOG: log } }).status;
        return want(run('auth', 'status', '--hostname', 'github.com', '--active') === 0, 'valid auth status call rejected')
          ?? want(run('auth', 'status', '--hostnme', 'github.com') === 64 && run('repo', 'delete') === 64, 'a bad flag or command was accepted');
      }],
      ['fallback-append', () => {
        const fx = fixture({ origin: null });
        const name = '2026-01-01-09-tabs-reference-wrong-fact.md';
        const p = path.join(fx, 'doc-gaps', name);
        fs.mkdirSync(path.dirname(p));
        fs.writeFileSync(p, expectedFile('Old evidence.', 'abc1234'));
        const r = cli(fx, { evidence: 'New evidence.' });
        return want(r.code === 0 && r.first === `appended: doc-gaps/${name}`, show(r))
          ?? want(JSON.stringify(fs.readdirSync(path.dirname(p))) === JSON.stringify([name]), `doc-gaps holds ${fs.readdirSync(path.dirname(p))}`)
          ?? want(fs.readFileSync(p, 'utf8') === expectedFile(`Old evidence.\n\nFurther report at PB commit 1ba359e.\n\nTask: ${TASK}\n\nNew evidence.`, 'abc1234'),
            `file ${JSON.stringify(fs.readFileSync(p, 'utf8'))}`);
      }],
      ['fallback-append-no-pb-section', () => {
        const fx = fixture({ origin: null });
        const p = path.join(fx, 'doc-gaps', '2026-01-01-09-tabs-reference-wrong-fact.md');
        fs.mkdirSync(path.dirname(p));
        fs.writeFileSync(p, '# x\n\n### Doc\n\ndocs/09-tabs-reference.md\n\n### Evidence\n\nOld\n\n');
        const r = cli(fx, { evidence: 'New evidence.' });
        const want2 = `# x\n\n### Doc\n\ndocs/09-tabs-reference.md\n\n### Evidence\n\nOld\n\nFurther report at PB commit 1ba359e.\n\nTask: ${TASK}\n\nNew evidence.\n`;
        return want(r.code === 0 && r.first === 'appended: doc-gaps/2026-01-01-09-tabs-reference-wrong-fact.md', show(r))
          ?? want(fs.readFileSync(p, 'utf8') === want2, `file ${JSON.stringify(fs.readFileSync(p, 'utf8'))}`);
      }],
      ['file-merges-local', () => {
        const fx = fixture();
        const name = '2026-01-01-09-tabs-reference-wrong-fact.md';
        const p = path.join(fx, 'doc-gaps', name);
        fs.mkdirSync(path.dirname(p));
        fs.writeFileSync(p, expectedFile('Old evidence.', 'abc1234', 'Old task.'));
        const r = cli(fx);
        const c = callsOf(r, 'issue create');
        const ev = `${EVIDENCE}\n\nUnfiled report doc-gaps/${name}, PB commit abc1234.\n\nTask: Old task.\n\nOld evidence.`;
        return want(r.code === 0 && r.first === 'filed: https://github.com/acme/docs/issues/99', show(r))
          ?? want(c.length === 1 && c[0].body === expectedBody(ev), `create calls ${JSON.stringify(c)}`)
          ?? want(fs.existsSync(p) && r.err.includes(`can delete doc-gaps/${name}`), `local file kept: ${fs.existsSync(p)}; stderr ${JSON.stringify(r.err)}`);
      }],
      ['refuse-local-secret', () => {
        const fx = fixture();
        const p = path.join(fx, 'doc-gaps', '2026-01-01-09-tabs-reference-wrong-fact.md');
        fs.mkdirSync(path.dirname(p));
        fs.writeFileSync(p, expectedFile('Mail someone' + '@example.com'));
        const r = cli(fx);
        return want(r.code === 1 && r.err.includes('refused: doc-gaps/2026-01-01-09-tabs-reference-wrong-fact.md evidence line 1: ') && r.err.includes('[email]'), show(r))
          ?? want(!callsOf(r, 'issue create').length && !callsOf(r, 'issue comment').length, 'an issue or comment was sent');
      }],
      ['nested-doc-slug', () => {
        const fx = fixture({ origin: null });
        fs.mkdirSync(path.join(fx, 'docs/recipes'));
        fs.writeFileSync(path.join(fx, 'docs/recipes/x.md'), '# x\n');
        const r = cli(fx, { flags: { '--doc': 'docs/recipes/x.md' } });
        return want(r.code === 0 && r.first === `saved: doc-gaps/${today()}-recipes__x-wrong-fact.md`, show(r));
      }],
      ['append-checks-doc', () => {
        const fx = fixture({ origin: null });
        const p = path.join(fx, 'doc-gaps', '2026-01-01-09-tabs-reference-wrong-fact.md');
        fs.mkdirSync(path.dirname(p));
        const other = expectedFile('Old evidence.').replace('\n### Doc\n\ndocs/09-tabs-reference.md\n', '\n### Doc\n\ndocs/09/tabs-reference.md\n');
        fs.writeFileSync(p, other);
        const r = cli(fx);
        return want(r.code === 0 && r.first === `saved: doc-gaps/${today()}-09-tabs-reference-wrong-fact.md`, show(r))
          ?? want(fs.readFileSync(p, 'utf8') === other, 'the file of another doc was appended to');
      }],
      ['refuse-symlink-file', () => {
        const fx = fixture({ origin: null });
        const outside = `${fx}-outside.txt`;
        fs.writeFileSync(outside, 'keep\n');
        fs.mkdirSync(path.join(fx, 'doc-gaps'));
        fs.symlinkSync(outside, path.join(fx, 'doc-gaps', '2026-01-01-09-tabs-reference-wrong-fact.md'));
        const r = cli(fx);
        return want(r.code === 1 && !r.out.includes('appended:') && r.err.includes('is not a plain file') && r.err.includes('Next step:'), show(r))
          ?? want(fs.readFileSync(outside, 'utf8') === 'keep\n', 'the symlink target was written');
      }],
      ['refuse-symlink-dir', () => {
        const fx = fixture({ origin: null });
        const outside = `${fx}-outside`;
        fs.mkdirSync(outside);
        fs.symlinkSync(outside, path.join(fx, 'doc-gaps'));
        const r = cli(fx);
        return want(r.code === 1 && !r.out.includes('saved:') && r.err.includes('not a plain directory'), show(r))
          ?? want(!fs.readdirSync(outside).length, 'a file was written through the doc-gaps link');
      }],
      ['origin-slug', () => {
        const good = ['https://github.com/acme/docs', 'https://github.com/acme/docs.git', 'https://github.com/acme/docs/',
          'https://user:pass@github.com/acme/docs.git', 'git@github.com:acme/docs.git', 'ssh://git@github.com/acme/docs.git'];
        const bad = ['https://gitlab.com/acme/docs.git', 'git@github.com:acme/docs/extra.git', '', null];
        const wrong = [...good.filter((u) => slugOf(u) !== 'acme/docs'), ...bad.filter((u) => slugOf(u) !== null)];
        return wrong.length ? `wrong slug for ${JSON.stringify(wrong)}` : null;
      }],
    ];
    for (const [name, check] of cases) {
      let bad;
      try { bad = check(); } catch (e) { bad = e.message; }
      if (bad) { console.log(`FAIL ${name}: ${bad}`); failed++; } else { console.log(`ok ${name}`); passed++; }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failed ? `file-doc-gap self-test: ${failed} case(s) failed, ${passed} passed` : `file-doc-gap self-test: ${passed} cases passed`);
  return failed ? 1 : 0;
}

// ---- CLI ----

function main(argv) {
  let o;
  try {
    o = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        type: { type: 'string' }, doc: { type: 'string' }, 'pb-commit': { type: 'string' },
        'task-file': { type: 'string' }, 'evidence-file': { type: 'string' },
        'dry-run': { type: 'boolean' }, 'self-test': { type: 'boolean' },
      },
    }).values;
  } catch (e) {
    const problem = e.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' ? e.message.split('. ')[0] : 'unexpected argument or an option without a value';
    return usage(problem, `run ${USAGE}`);
  }
  if (o['self-test']) return Object.keys(o).length > 1 ? usage('--self-test takes no other option', 'run node scripts/file-doc-gap.mjs --self-test') : selfTest();
  const r = readReport(o);
  if (typeof r === 'number') return r;
  const hits = refusals(r);
  if (hits.length) {
    for (const h of hits) console.error(h);
    console.error('file-doc-gap: nothing was filed. Next step: rewrite each named line within the Evidence rules in docs/FEEDBACK.md, then rerun.');
    return 1;
  }
  if (o['dry-run']) { process.stdout.write(r.fileText); return 0; }
  return file(r);
}

process.exitCode = main(process.argv.slice(2));
