#!/usr/bin/env node
// check-drift: per doc, lists the cited PB files (its "Source files:") changed between the doc's stamp commit and PB HEAD.
// Usage: node scripts/check-drift.mjs [--self-test] [file ...]   (no file: every docs/**/*.md except docs/_templates/)
// Exit: 0 no cited file changed and every doc checked; 1 drift or a doc that could not be checked;
//       2 usage error, missing file, no PB checkout (set PB_REPO) or git failure.
// An uncommitted change in a cited PB file is reported but advisory (exit code unchanged): docs verify against HEAD:<path>.
// This is this repo's doc tool; AGENTS.md's "one driver, verify-platform.sh" rule governs PB core, not here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_RE = /^> Verified against PB [0-9a-f]{7,40} on [0-9]{4}-[0-9]{2}-[0-9]{2}\. Level: (source-read|run)$/;
const SRC_BULLET_RE = /^- `\$PB_REPO\/[^` ]+`$/;
const SRC_BAD_CHARS = /[*?[{}:]/;

const posix = (p) => p.split(path.sep).join('/');

// git runs with an argument array, never a shell; the only doc-derived argument is a stamp sha already matched by STAMP_RE.
// --no-optional-locks: PB is read-only here, so `git status` must not refresh and rewrite PB's .git/index.
const git = (pb, args) => {
  const r = spawnSync('git', ['--no-optional-locks', '-C', pb, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr || r.error?.message || '').trim() };
};

// `git diff --name-status -M -z` output -> [{ s, paths }]: "S\0path\0", R/C carry old and new path.
// -z gives raw paths; without it git C-quotes non-ASCII, tab, quote and backslash and no cited path matches.
function parseNameStatus(out) {
  const t = out.split('\0');
  const res = [];
  for (let i = 0; i < t.length && t[i]; ) {
    const s = t[i++][0];
    const n = s === 'R' || s === 'C' ? 2 : 1;
    res.push({ s, paths: t.slice(i, i + n) });
    i += n;
  }
  return res;
}

// A bullet matches its own path and anything under it, with or without a trailing "/":
// check-docs enforces the "/" for directories, this keeps drift correct if one slips through.
const cites = (cited, p) => cited.some((c) => {
  const base = c.replace(/\/+$/, '');
  return p === base || p.startsWith(`${base}/`);
});

// Cited PB paths of a doc (line 5 "Source files:", bullets from line 6 to the first empty line).
// Returns { paths } or { bad: reason }; only a lone "- none" means "cites nothing".
function citedPaths(lines) {
  if (lines[4] !== 'Source files:') return { bad: 'line 5 is not "Source files:"' };
  const end = lines.indexOf('', 5);
  const list = lines.slice(5, end < 0 ? lines.length : end);
  if (!list.length) return { bad: 'the list is empty' };
  if (list.length === 1 && list[0] === '- none') return { paths: [] };
  const paths = [];
  for (const [i, l] of list.entries()) {
    const p = l.slice('- `$PB_REPO/'.length, -1);
    if (!SRC_BULLET_RE.test(l) || SRC_BAD_CHARS.test(p) || p.split('/').includes('..')) return { bad: `line ${6 + i} is not a "- \`$PB_REPO/<path>\`" bullet without globs or ".."` };
    paths.push(p);
  }
  return { paths };
}

// Paths with uncommitted changes in PB (`status --porcelain -z`: "XY path", plus the old path after a rename or copy).
function dirtyPaths(out) {
  const parts = out.split('\0').filter(Boolean);
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    paths.push(parts[i].slice(3));
    if (/[RC]/.test(parts[i].slice(0, 2))) paths.push(parts[++i]);
  }
  return paths;
}

export function run({ root, pbRepo, files }) {
  if (!git(pbRepo, ['rev-parse', '--git-dir']).ok) {
    return { lines: [`check-drift: no PB git checkout at ${pbRepo}. Drift was not checked: treat every doc fact as \`UNVERIFIED:\` until it is. Next step: set PB_REPO to a PowerBrowser git checkout and rerun.`], code: 2 };
  }
  const headRes = git(pbRepo, ['rev-parse', '--short', 'HEAD']);
  if (!headRes.ok) return { lines: [`check-drift: git failed in ${pbRepo}: ${headRes.err}`], code: 2 };
  const h = headRes.out.trim();
  const lines = [`PB HEAD ${h} at ${pbRepo}`];
  const st = git(pbRepo, ['status', '--porcelain', '-z']);
  if (!st.ok) return { lines: [...lines, `check-drift: git status failed in ${pbRepo}: ${st.err}`], code: 2 };
  const dirty = dirtyPaths(st.out);
  if (dirty.length) lines.push(`WARNING: PB working tree has ${dirty.length} uncommitted paths; drift below compares committed HEAD ${h} only.`);
  const diffs = new Map();
  let code = 0;
  for (const doc of files) {
    const L = fs.readFileSync(path.join(root, doc), 'utf8').replace(/\r?\n$/, '').split(/\r?\n/);
    if (!STAMP_RE.test(L[2] ?? '')) {
      lines.push(`${doc}: no valid stamp on line 3; drift not checked. Next step: node scripts/check-docs.mjs ${doc}`);
      code = Math.max(code, 1);
      continue;
    }
    const sha = L[2].split(' ')[4];
    const { paths: cited, bad } = citedPaths(L);
    if (bad) {
      lines.push(`${doc}: Source files list could not be parsed (${bad}); drift not checked. Next step: node scripts/check-docs.mjs ${doc}`);
      code = Math.max(code, 1);
      continue;
    }
    if (!cited.length) { lines.push(`${doc}: cites no PB files; nothing to check.`); continue; }
    if (!git(pbRepo, ['cat-file', '-e', `${sha}^{commit}`]).ok) {
      lines.push(`${doc}: stamp commit ${sha} is not in PB history (PB was rebased, the clone is shallow, or the sha is wrong); drift not checked. Next step: re-verify the doc's Source files against PB HEAD ${h}, then re-stamp.`);
      code = Math.max(code, 1);
      continue;
    }
    if (!diffs.has(sha)) diffs.set(sha, git(pbRepo, ['diff', '--name-status', '-M', '-z', sha, 'HEAD']));
    const d = diffs.get(sha);
    if (!d.ok) return { lines: [...lines, `check-drift: git diff failed in ${pbRepo}: ${d.err}`], code: 2 };
    const hits = parseNameStatus(d.out).filter((e) => e.paths.some((p) => cites(cited, p)));
    if (hits.length) {
      code = 1;
      lines.push(`${doc}: cited PB files changed between ${sha} and ${h}:`);
      for (const e of hits) {
        lines.push(e.s === 'R' ? `- R $PB_REPO/${e.paths[0]} -> $PB_REPO/${e.paths[1]}` : `- ${e.s} $PB_REPO/${e.paths[0]}`);
      }
    } else {
      lines.push(`${doc}: no cited PB file changed between ${sha} and ${h}.`);
    }
    for (const p of dirty.filter((x) => cites(cited, x))) lines.push(`- uncommitted $PB_REPO/${p} (advisory, exit code unchanged: verify facts against HEAD:${p}, not the working copy)`);
  }
  return { lines, code };
}

// ---- self-test: fake PB git repo and fake docs under the OS temp dir ----

const FIX_GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const FIX_GIT_OPTS = ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid',
  '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];

function fixGit(cwd, ...args) {
  const r = spawnSync('git', [...FIX_GIT_OPTS, ...args], { cwd, env: FIX_GIT_ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`fixture git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

// Commit A: a.txt, dir/b.txt, dir/café.txt, d.txt, keep.txt. Commit B: edit a.txt and dir/café.txt, rename d.txt -> e.txt.
function makeFakePb(pb) {
  fs.mkdirSync(pb, { recursive: true });
  fixGit(pb, 'init', '-q');
  for (const f of ['a.txt', 'dir/b.txt', 'dir/café.txt', 'd.txt', 'keep.txt']) put(pb, f, `${f}\n`);
  fixGit(pb, 'add', '-A');
  fixGit(pb, 'commit', '-q', '-m', 'A');
  const A = fixGit(pb, 'rev-parse', 'HEAD');
  put(pb, 'a.txt', 'a.txt changed\n');
  put(pb, 'dir/café.txt', 'changed\n');
  fixGit(pb, 'mv', 'd.txt', 'e.txt');
  fixGit(pb, 'add', '-A');
  fixGit(pb, 'commit', '-q', '-m', 'B');
  return { A, B: fixGit(pb, 'rev-parse', 'HEAD') };
}

// A doc with the exact header; `stamp` is the whole line 3, `bullets` the Source files lines.
const fixDoc = (stamp, bullets) => `# Fixture\n\n${stamp}\n\nSource files:\n${bullets.join('\n')}\n\nBody.\n`;
const goodStamp = (sha) => `> Verified against PB ${sha} on 2026-10-21. Level: source-read`;
const cite = (...ps) => ps.map((p) => `- \`$PB_REPO/${p}\``);

function selfTest() {
  // run() uses the caller's git config; pin it so core.quotePath and friends are git defaults.
  Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-drift-'));
  let passed = 0;
  let failed = 0;
  try {
    const pb = path.join(tmp, 'pb');
    const { A, B } = makeFakePb(pb);
    const root = path.join(tmp, 'root');
    let idx;
    const readIndex = () => fs.readFileSync(path.join(pb, '.git/index')).toString('base64');
    const cli = (arg) => {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), arg], { encoding: 'utf8', env: { ...process.env, PB_REPO: pb } });
      return { code: r.status, lines: [r.stdout, r.stderr] };
    };
    const has = (r, code, ...needles) => {
      const text = r.lines.join('\n');
      const miss = needles.filter((n) => !text.includes(n));
      return r.code === code && !miss.length ? null : `code ${r.code} (want ${code}), missing ${JSON.stringify(miss)}: ${r.lines.join(' | ')}`;
    };
    const none = '- none';
    // [name, doc text, check(result), options]; the dirty cases run last because they dirty the shared fake PB.
    const cases = [
      ['changed', fixDoc(goodStamp(A), cite('a.txt')), (r) => has(r, 1, '- M $PB_REPO/a.txt')],
      ['quoted-path', fixDoc(goodStamp(A), cite('dir/café.txt')), (r) => has(r, 1, '- M $PB_REPO/dir/café.txt')],
      ['dir-no-slash', fixDoc(goodStamp(A), cite('dir')), (r) => has(r, 1, '- M $PB_REPO/dir/café.txt')],
      ['file-slash', fixDoc(goodStamp(A), cite('a.txt/')), (r) => has(r, 1, '- M $PB_REPO/a.txt')],
      ['renamed', fixDoc(goodStamp(A), cite('d.txt')), (r) => has(r, 1, '- R $PB_REPO/d.txt -> $PB_REPO/e.txt')],
      ['clean', fixDoc(goodStamp(B), cite('keep.txt')), (r) => has(r, 0, 'no cited PB file changed') || (r.lines.some((l) => l.startsWith('WARNING')) ? 'unexpected WARNING on a clean tree' : null)],
      ['missing-commit', fixDoc(goodStamp('deadbee'), cite('a.txt')), (r) => has(r, 1, 'stamp commit deadbee is not in PB history', 'drift not checked')],
      ['no-stamp', fixDoc('> Verified against PB soon.', cite('a.txt')), (r) => has(r, 1, 'no valid stamp on line 3', 'node scripts/check-docs.mjs docs/x.md')],
      ['no-sources', fixDoc(goodStamp(B), [none]), (r) => has(r, 0, 'docs/x.md: cites no PB files; nothing to check.')],
      ['bad-bullet', fixDoc(goodStamp(A), ['- $PB_REPO/a.txt']), (r) => has(r, 1, 'docs/x.md: Source files list could not be parsed', 'node scripts/check-docs.mjs docs/x.md')],
      ['empty-list', fixDoc(goodStamp(A), []), (r) => has(r, 1, 'docs/x.md: Source files list could not be parsed')],
      ['glob', fixDoc(goodStamp(A), cite('dir/*.txt')), (r) => has(r, 1, 'docs/x.md: Source files list could not be parsed')],
      ['no-checkout', fixDoc(goodStamp(B), cite('a.txt')), (r) => has(r, 2, 'check-drift: no PB git checkout at', 'UNVERIFIED:', 'PB_REPO') || (r.lines.length === 1 ? null : 'expected exactly one line'), { pbRepo: path.join(tmp, 'missing') }],
      ['dir-arg', '', (r) => has(r, 2, 'is not a file inside this repo') || (r.lines.join('').includes('    at ') ? 'stack trace printed' : null), { exec: () => cli(path.join(ROOT, 'docs')) }],
      ['outside-arg', '', (r) => has(r, 2, 'is not a file inside this repo'), { exec: () => cli(path.join(tmp, 'root/docs/x.md')) }],
      ['read-only-pb', fixDoc(goodStamp(B), cite('a.txt')), (r) => has(r, 0) || (r.index === readIndex() ? null : 'git rewrote the PB index'),
        { prep: () => { const t = Date.now() / 1000 + 100; fs.utimesSync(path.join(pb, 'a.txt'), t, t); idx = readIndex(); } }],
      ['dirty', fixDoc(goodStamp(B), cite('dir/')), (r) => has(r, 0, 'WARNING: PB working tree', '- uncommitted $PB_REPO/dir/b.txt'), { prep: () => put(pb, 'dir/b.txt', 'edited\n') }],
      ['dirty-rename', fixDoc(goodStamp(B), cite('keep.txt')), (r) => has(r, 0, '- uncommitted $PB_REPO/keep.txt'), { prep: () => fixGit(pb, 'mv', 'keep.txt', 'kept.txt') }],
    ];
    for (const [name, text, check, opt = {}] of cases) {
      put(root, 'docs/x.md', text);
      opt.prep?.();
      let bad;
      try { bad = check(opt.exec ? opt.exec() : { ...run({ root, pbRepo: opt.pbRepo ?? pb, files: ['docs/x.md'] }), index: idx }); } catch (e) { bad = e.message; }
      if (bad) { console.log(`FAIL ${name}: ${bad}`); failed++; } else { console.log(`ok ${name}`); passed++; }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failed ? `check-drift self-test: ${failed} case(s) failed, ${passed} passed` : `check-drift self-test: ${passed} cases passed`);
  return failed ? 1 : 0;
}

// ---- CLI ----

function defaultScope() {
  const found = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (rel !== 'docs/_templates') walk(rel); } else if (e.name.endsWith('.md')) found.push(rel);
    }
  };
  walk('docs');
  return found;
}

function main(argv) {
  const flags = argv.filter((a) => a.startsWith('--'));
  const args = argv.filter((a) => !a.startsWith('--'));
  const bad = flags.find((f) => f !== '--self-test');
  if (bad) { console.error(`check-drift: unknown option ${bad}. Usage: node scripts/check-drift.mjs [--self-test] [file ...]`); return 2; }
  if (flags.length) return selfTest();
  const pbRepo = process.env.PB_REPO ? path.resolve(process.env.PB_REPO) : path.resolve(ROOT, '../Power-Browser');
  const files = [];
  for (const a of args) {
    const abs = path.resolve(a);
    const rel = posix(path.relative(ROOT, abs));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile() || rel.startsWith('..')) {
      console.error(`check-drift: ${a} is not a file inside this repo. Pass a repo file path or no argument.`);
      return 2;
    }
    files.push(rel);
  }
  let r;
  try {
    r = run({ root: ROOT, pbRepo, files: files.length ? files : defaultScope() });
  } catch (e) {
    console.error(`check-drift: ${e.message}`);
    return 2;
  }
  console.log(r.lines.join('\n'));
  return r.code;
}

process.exitCode = main(process.argv.slice(2));
