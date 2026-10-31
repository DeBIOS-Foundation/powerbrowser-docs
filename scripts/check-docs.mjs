#!/usr/bin/env node
// check-docs: checks docs/ and the entry files against docs/CONVENTIONS.md (the spec); names file, line and rule.
// Usage: node scripts/check-docs.mjs [--self-test] [--no-pb] [file ...]   (no file: the whole doc set)
// --no-pb: skip the pb-path and pb-symbol rules and the PB checkout requirement (for CI, which has no PB checkout).
// Exit: 0 clean; 1 violations; 2 usage error, missing file, no PB checkout (set PB_REPO) or git failure (not with --no-pb).
// Output: <file>:<line>: <rule>: <message> on stdout, one summary line on stderr.
// This is this repo's doc tool; AGENTS.md's "one driver, verify-platform.sh" rule governs PB core, not here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// shortcut: the stamp date and sha are pattern-checked only (2026-99-99 passes; check-drift finds an unknown sha). Upgrade if bad dates appear.
const STAMP_RE = /^> Verified against PB [0-9a-f]{7,40} on [0-9]{4}-[0-9]{2}-[0-9]{2}\. Level: (source-read|run)$/;
const PLACEHOLDER = '> Verified against PB {sha} on {YYYY-MM-DD}. Level: {source-read|run}';
// The hard-rules pointer line of docs/_templates/*.md; recipes and subsystem references copy it unchanged.
const POINTER = '**PB hard rules apply.** Read them in [docs/_shared/RULES.md](../_shared/RULES.md#hard-rules) before you change anything.';
const ENTRY_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.agents/skills/powerbrowser-extensions/SKILL.md',
  '.prompts/project-info.prompttemplate',
  '.agents/agents/pb-extension-builder/agent.md',
];

const posix = (p) => p.split(path.sep).join('/');
const lineList = (text) => text.replace(/\r?\n$/, '').split(/\r?\n/);

// PB reads: argument arrays, no shell, no optional index writes; git grep gets --literal-pathspecs so a doc string is never pathspec magic.
const pbGit = (pb, args) => spawnSync('git', ['--no-optional-locks', '-C', pb, ...args], { stdio: 'ignore' }).status === 0;
const pbPresent = (pb) => pbGit(pb, ['rev-parse', '--git-dir']);
const pbGitOut = (pb, args) => {
  const r = spawnSync('git', ['--no-optional-locks', '-C', pb, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return r.status === 0 ? r.stdout.trim() : null;
};

// ---- rules: each takes the per-file context and calls c.add(line, rule, message) ----

function stamp(c) {
  if (!c.isDoc) return;
  const l = c.lines[2] ?? '';
  if (c.isTemplate) {
    if (l !== PLACEHOLDER) c.add(3, 'stamp', 'template line 3 must be the placeholder stamp from docs/CONVENTIONS.md');
  } else if (!STAMP_RE.test(l)) {
    c.add(3, 'stamp', 'line 3 is not "> Verified against PB <sha> on <YYYY-MM-DD>. Level: <source-read|run>"');
  }
}

function header(c) {
  if (!c.isDoc) return;
  const L = c.lines;
  const bad = [
    [1, /^# \S/.test(L[0] ?? ''), 'line 1 must be "# <Title>"'],
    [2, L[1] === '', 'line 2 must be empty'],
    [4, L[3] === '', 'line 4 must be empty'],
    [5, L[4] === 'Source files:', 'line 5 must be "Source files:"'],
  ].find((r) => !r[1]);
  if (bad) c.add(bad[0], 'header', bad[2]);
}

// Template-derived docs (CONVENTIONS "Doc header" items 7-8, "Shared rule blocks"): 'subsystem' or 'recipe', else null.
const docKind = (rel) => /^docs\/(subsystem|recipe)s\/(?!README\.md$)[^/]+\.md$/.exec(rel)?.[1] ?? null;
const STATUS_RE = /^Status: (working|partly working|documented ahead of implementation)$/;

// Header items 7-8 after the Source files list; the template itself carries placeholders and is skipped.
function kindHeader(c) {
  const kind = docKind(c.rel);
  if (!kind) return;
  const L = c.lines;
  const at = c.listEnd + 1;
  if (kind === 'recipe') {
    const m = /^PB core edits: ([0-9]+)$/.exec(L[at] ?? '');
    if (!m) { c.add(at + 1, 'header', 'recipe: the line after the Source files list must be "PB core edits: <N>"'); return; }
    const steps = stripCode(L).filter((l) => /^\s*[0-9]+\.\s+\*\*PB core edit\*\*/.test(l)).length;
    if (Number(m[1]) !== steps) c.add(at + 1, 'header', `PB core edits: ${m[1]}, but ${steps} step(s) are labelled **PB core edit**`);
    return;
  }
  if (L[at] !== 'Not read:') { c.add(at + 1, 'header', 'subsystem reference: the line after the Source files list must be "Not read:"'); return; }
  let i = at + 1;
  if (L[i] === '' || i >= L.length) c.add(i + 1, 'header', '"Not read:" needs at least one "- NOT COVERED: " bullet');
  for (; i < L.length && L[i] !== ''; i++) {
    if (!L[i].startsWith('- NOT COVERED: ')) c.add(i + 1, 'header', 'a "Not read:" bullet must start "- NOT COVERED: "');
  }
  if (!STATUS_RE.test(L[i + 1] ?? '')) c.add(i + 2, 'header', 'after "Not read:" and an empty line: "Status: <working | partly working | documented ahead of implementation>"');
}

const SRC_BULLET_RE = /^- `\$PB_REPO\/[^` ]+`$/;
const SRC_BAD_CHARS = /[*?[{}:]/;

// The well-formed Source files paths of a doc: [{ n, p }]; malformed ones are reported here.
function sourceFiles(c) {
  if (!c.isDoc || c.isTemplate) return [];
  const list = c.lines.slice(5, c.listEnd);
  if (!list.length) { c.add(6, 'source-files', 'Source files list is empty; write "- none" or one bullet per PB path'); return []; }
  if (list.length === 1 && list[0] === '- none') return [];
  const ok = [];
  list.forEach((l, i) => {
    const n = 6 + i;
    if (!SRC_BULLET_RE.test(l)) { c.add(n, 'source-files', 'bullet is not "- `$PB_REPO/<path>`" (and "- none" must stand alone)'); return; }
    const p = l.slice('- `$PB_REPO/'.length, -1);
    if (SRC_BAD_CHARS.test(p) || p.split('/').includes('..')) {
      c.add(n, 'source-files', `path "${p}" has a glob, brace, colon or ".." segment`);
      return;
    }
    ok.push({ n, p });
  });
  return ok;
}

// 'blob' or 'dir' (in PB HEAD; a submodule counts as dir), 'ignored' (matched by PB ignore rules) or 'missing'; memoized per run.
function pathState(c, p) {
  const key = `${c.pbRepo}\0${p}`;
  if (!c.memo.has(key)) {
    const type = pbGitOut(c.pbRepo, ['cat-file', '-t', `HEAD:${p.replace(/\/$/, '')}`]);
    const st = type === 'blob' ? 'blob' : type ? 'dir'
      // shortcut: an ignored path is accepted without checking it exists on disk ($PB_REPO/upstream/typo passes).
      : pbGit(c.pbRepo, ['check-ignore', '-q', '--', p]) ? 'ignored' : 'missing';
    c.memo.set(key, st);
  }
  return c.memo.get(key);
}

const BODY_PATH_RE = /`\$PB_REPO\/([^`\s<>{}*]+)`/g;
const BODY_SYMBOL_RE = /`([^`]+)` in `\$PB_REPO\/([^`\s<>{}*]+)`/g;

function pbPath(c) {
  if (c.isTemplate) return;
  const sources = sourceFiles(c);
  if (!c.pbOk) return;
  for (const { n, p } of sources) {
    const st = pathState(c, p);
    if (st !== 'blob' && st !== 'dir') c.add(n, 'pb-path', `$PB_REPO/${p} is not in the PB HEAD tree`);
    else if ((st === 'dir') !== p.endsWith('/')) c.add(n, 'source-files', `$PB_REPO/${p}: a directory ends in "/", a file does not`);
  }
  c.lines.forEach((l, i) => {
    if (i < c.bodyStart) return;
    for (const m of l.matchAll(BODY_PATH_RE)) {
      if (pathState(c, m[1]) === 'missing') c.add(i + 1, 'pb-path', `$PB_REPO/${m[1]} is neither in the PB HEAD tree nor ignored by PB`);
    }
  });
}

// shortcut: grep -F is a substring match (open matches openThing; a.b passes if b is found) and only the
// "`sym` in `$PB_REPO/path`" form is extracted. Add -w for identifier-like symbols if false passes show up.
function pbSymbol(c) {
  if (c.isTemplate || !c.pbOk) return;
  c.lines.forEach((l, i) => {
    if (i < c.bodyStart) return;
    for (const m of l.matchAll(BODY_SYMBOL_RE)) {
      const sym = m[1].replace(/\(\)$/, '').replace(/^(["'])(.*)\1$/, '$2');
      if (!sym || pathState(c, m[2]) === 'missing') continue;
      const grep = (s) => pbGit(c.pbRepo, ['--literal-pathspecs', 'grep', '-q', '-F', '-e', s, 'HEAD', '--', m[2]]);
      if (!grep(sym) && !(sym.includes('.') && grep(sym.slice(sym.lastIndexOf('.') + 1)))) {
        c.add(i + 1, 'pb-symbol', `"${sym}" not found in $PB_REPO/${m[2]} at PB HEAD`);
      }
    }
  });
}

// Fenced code blocks (and, unless inline is false, inline code spans) blanked; line count is kept.
// CommonMark fences: a close is the same character, at least as long, with nothing after it but spaces;
// a backtick fence's info string has no backtick.
function stripCode(lines, inline = true) {
  let fence = null;
  return lines.map((l) => {
    if (fence) {
      const m = /^ {0,3}(`+|~+)\s*$/.exec(l);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      return '';
    }
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(l);
    if (m && !(m[1][0] === '`' && m[2].includes('`'))) { fence = m[1]; return ''; }
    return inline ? l.replace(/(`+).*?\1/g, (x) => ' '.repeat(x.length)) : l; // `x` and ``a `b` c`` spans
  });
}

const perLine = (rule, re, msg) => (c) => c.lines.forEach((l, i) => {
  const m = re.exec(l);
  if (m) c.add(i + 1, rule, msg(m));
});

// Only at a path start, so a URL path that holds a home segment and a token such as foo~/ are not flagged.
const absPath = perLine('abs-path', /(^|[\s`"'(<])(\/(home|Users)\/|~\/)/, () => 'home-directory or tilde path; write a repo-relative or $PB_REPO/ path');
// <file>.<ext>:<n> (ext starts with a letter, so 127.0.0.1:9 passes), #L<n>, or "line(s) N[-M | to M | and M] of/in $PB_REPO/...".
// shortcut: a "host.tld:443" in prose is flagged too; add a URL exception if a doc ever needs one.
const lineCite = perLine('line-cite', /\.[A-Za-z][A-Za-z0-9]{0,5}:[0-9]|#L[0-9]|\b[Ll]ines? [0-9]+(?:(?:[-–]|\s+to\s+|\s+and\s+)[0-9]+)? (?:of|in) `?\$PB_REPO\//, () => 'line number citation; cite symbol plus path');
const marker = perLine('marker', /\b(UNVERIFIED|GAP|NOT COVERED|ILLUSTRATIVE)\b(?!:|\.md\b)/, (m) => `marker ${m[1]} needs its colon: "${m[1]}:"`);

// shortcut: duplicate headings get no -1 suffix, non-ASCII letters are dropped, link syntax in a heading is kept and
// setext headings are ignored (GitHub differs on all four); lychee's anchor check is the second opinion. Upgrade if a doc links to one.
const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 _-]/g, '').replace(/ /g, '-');
function headingSlugs(c, abs) {
  if (!c.slugs.has(abs)) {
    const hs = stripCode(lineList(fs.readFileSync(abs, 'utf8')), false).map((l) => /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(l)).filter(Boolean);
    c.slugs.set(abs, new Set(hs.map((m) => slug(m[1]))));
  }
  return c.slugs.get(abs);
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]*)[^)]*\)/g;
// Reference definitions `[label]: target` (optionally <target>) obey the same rules as inline links.
const REF_DEF_RE = /^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/;

function link(c) {
  const self = path.join(c.root, c.rel);
  const docsDir = path.join(c.root, 'docs');
  stripCode(c.lines).forEach((l, i) => {
    const def = REF_DEF_RE.exec(l);
    for (const t of [...[...l.matchAll(LINK_RE)].map((m) => m[1]), ...(def ? [def[1]] : [])]) {
      if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('//')) continue;
      const hash = t.indexOf('#');
      const file = hash < 0 ? t : t.slice(0, hash);
      const anchor = hash < 0 ? '' : t.slice(hash + 1);
      const abs = file ? path.resolve(path.dirname(self), file) : self;
      const up = path.relative(docsDir, abs);
      if (c.isDoc && (up === '..' || up.startsWith(`..${path.sep}`))) { c.add(i + 1, 'link', `link ${t} leaves docs/; name the file as a backticked path`); continue; }
      if (!fs.existsSync(abs)) { c.add(i + 1, 'link', `link target ${t} does not exist`); continue; }
      if (anchor && abs.endsWith('.md') && fs.statSync(abs).isFile() && !headingSlugs(c, abs).has(anchor)) {
        c.add(i + 1, 'link', `no heading matches anchor #${anchor} in ${file || c.rel}`);
      }
    }
  });
}

export function parseBlocks(lines) {
  const out = [];
  lines.forEach((l, i) => {
    const m = /^<!-- BEGIN pb-rules:(\S+) -->$/.exec(l);
    if (!m) return;
    const e = lines.indexOf(`<!-- END pb-rules:${m[1]} -->`, i + 1);
    out.push({ name: m[1], b: i, e, inner: e < 0 ? [] : lines.slice(i + 1, e) });
  });
  return out;
}

function block(c) {
  for (const b of parseBlocks(c.lines)) {
    const canon = c.canon.get(b.name);
    if (b.e < 0) c.add(b.b + 1, 'block', `BEGIN pb-rules:${b.name} has no END line`);
    else if (!canon) c.add(b.b + 1, 'block', `pb-rules:${b.name} is not a block in docs/_shared/RULES.md`);
    else if (b.inner.join('\n') !== canon.join('\n')) c.add(b.b + 1, 'block', `pb-rules:${b.name} differs from docs/_shared/RULES.md`);
  }
}

// Recipes, subsystem references and their templates need the stop-and-ask block and the hard-rules pointer line.
function requiredBlocks(c) {
  if (!docKind(c.rel) && !/^docs\/_templates\/(subsystem|recipe)\.md$/.test(c.rel)) return;
  if (!parseBlocks(c.lines).some((b) => b.name === 'stop-and-ask')) c.add(1, 'block', 'missing the pb-rules:stop-and-ask block from docs/_shared/RULES.md');
  if (!c.lines.includes(POINTER)) c.add(1, 'block', 'missing the hard-rules pointer line; copy it unchanged from docs/_templates/');
}

function footer(c) {
  if (!c.isDoc && c.rel !== '.prompts/project-info.prompttemplate') return;
  const want = ['<!-- BEGIN pb-rules:footer -->', ...c.canon.get('footer'), '<!-- END pb-rules:footer -->'];
  if (c.lines.slice(-want.length).join('\n') !== want.join('\n')) {
    c.add(Math.max(1, c.lines.length - want.length + 1), 'footer', 'the file must end with the footer block from docs/_shared/RULES.md');
  }
}

function template(c) {
  if (c.isTemplate) return;
  stripCode(c.lines).forEach((l, i) => {
    if (/<!--\s*template:/.test(l)) c.add(i + 1, 'template', 'template comment left in a finished doc; delete it');
    else if (c.isDoc && /\{[^{}\s`][^{}`]*\}/.test(l)) c.add(i + 1, 'template', 'unreplaced {placeholder} in prose; replace it or put literal braces in backticks');
  });
}

const BYTE_LIMITS = { 'AGENTS.md': 8192, '.prompts/project-info.prompttemplate': 3072, 'docs/INDEX.md': 4096 };
function byteLimit(rel) {
  const m = /^docs\/(recipes|subsystems)\/([^/]+\.md)$/.exec(rel);
  if (m && m[2] !== 'README.md') return m[1] === 'recipes' ? 6144 : 25600;
  return BYTE_LIMITS[rel] ?? 0;
}

// SKILL.md: body line count (lines after the second ---) and the one-line description.
function skillMeta(lines) {
  let f = 0;
  let body = 0;
  let desc = null;
  lines.forEach((l, i) => {
    if (l === '---' && f < 2) { f++; return; }
    if (f === 2) body++;
    else if (f === 1 && !desc) {
      const m = /^description: *(.*)$/.exec(l);
      if (m) desc = { n: i + 1, value: m[1], next: lines[i + 1] ?? '' };
    }
  });
  return { body, desc };
}

function budget(c) {
  const limit = byteLimit(c.rel);
  const bytes = Buffer.byteLength(c.text);
  if (limit && bytes > limit) c.add(1, 'budget', `${bytes} bytes, ${bytes - limit} over the ${limit} byte budget`);
  if (path.basename(c.rel) !== 'SKILL.md') return;
  const { body, desc } = skillMeta(c.lines);
  if (body > 500) c.add(1, 'budget', `SKILL.md body is ${body} lines, over 500`);
  const chars = desc ? [...desc.value].length : 0;
  if (chars > 600) c.add(desc.n, 'budget', `description is ${chars} characters, over 600`);
}

function skillDescription(c) {
  if (path.basename(c.rel) !== 'SKILL.md') return;
  const { desc } = skillMeta(c.lines);
  if (!desc || !desc.value.trim()) c.add(desc?.n ?? 1, 'skill-description', 'description: line is missing or empty');
  else if (/^[>|]/.test(desc.value)) c.add(desc.n, 'skill-description', 'description must be one plain line, not a folded or block value');
  else if (/^\s+\S/.test(desc.next)) c.add(desc.n, 'skill-description', 'description continues on the next line; keep it on one line');
}

// IN-01 (plan 19 review): Theia 1.76 leaves template variables literal in these entry files.
const TEMPLATE_VAR_FILES = ['AGENTS.md', 'CLAUDE.md', '.agents/skills/powerbrowser-extensions/SKILL.md'];
function templateVar(c) {
  if (!TEMPLATE_VAR_FILES.includes(c.rel)) return;
  c.lines.forEach((l, i) => {
    if (/\{\{|~\{/.test(l)) c.add(i + 1, 'template-var', 'template variable opener "{{" or "~{" in an entry file; Theia 1.76 leaves it literal, so move it to .agents/agents/<id>/agent.md or a .prompttemplate file');
  });
}

// Count of "UNVERIFIED: " in docs/ (any depth), skipping _templates and _shared dirs, CONVENTIONS.md and UNVERIFIED.md.
// Same definition as the count command in docs/UNVERIFIED.md, reimplemented so no shell is needed.
function registryCount(c) {
  if (c.rel !== 'docs/UNVERIFIED.md') return;
  let markers = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '_templates') walk(abs); }
      else if (e.name.endsWith('.md') && e.name !== 'UNVERIFIED.md') {
        // CONVENTIONS.md quotes the marker in backticks to define it; only unquoted markers are counted there.
        const quoted = e.name === 'CONVENTIONS.md' ? /`UNVERIFIED: /g : null;
        for (const line of fs.readFileSync(abs, 'utf8').split('\n')) {
          if (quoted) markers += (line.replace(quoted, '').match(/UNVERIFIED: /g) ?? []).length;
          else markers += (line.match(/UNVERIFIED: /g) ?? []).length;
        }
      }
    }
  };
  walk(path.join(c.root, 'docs'));
  const rows = c.lines.filter((l) => /^\|\s*U-[0-9]{3}\s*\|/.test(l)).length;
  if (rows !== markers) c.add(1, 'registry-count', `${markers} UNVERIFIED: marker(s) in docs/ but ${rows} registry row(s); add or close rows until the counts match`);
}

// Link targets (resolved to absolute paths) of the Markdown links in text, read from base; code is ignored.
const linkTargets = (text, base) => stripCode(lineList(text))
  .flatMap((l) => [...l.matchAll(LINK_RE)].map((m) => path.resolve(base, m[1].split('#')[0])));

// docs/INDEX.md links every top-level doc, and each directory README; each directory README links every file in its directory.
function indexReach(c) {
  if (c.rel !== 'docs/INDEX.md') return;
  const docs = path.join(c.root, 'docs');
  const linked = new Set(linkTargets(c.text, docs));
  const mdIn = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);
  for (const f of mdIn(docs)) {
    if (f !== 'INDEX.md' && !linked.has(path.join(docs, f))) c.add(1, 'index-reach', `docs/${f} is not linked from docs/INDEX.md; add a link`);
  }
  for (const dir of ['recipes', 'subsystems']) {
    const readme = path.join(docs, dir, 'README.md');
    if (!fs.existsSync(readme)) { c.add(1, 'index-reach', `docs/${dir}/README.md is missing; the directory is indexed through it`); continue; }
    if (!linked.has(readme)) c.add(1, 'index-reach', `docs/${dir}/README.md is not linked from docs/INDEX.md; add a link`);
    const inReadme = new Set(linkTargets(fs.readFileSync(readme, 'utf8'), path.join(docs, dir)));
    for (const f of mdIn(path.join(docs, dir))) {
      if (f !== 'README.md' && !inReadme.has(path.join(docs, dir, f))) c.add(1, 'index-reach', `docs/${dir}/${f} is not linked from docs/${dir}/README.md; add a link`);
    }
  }
}

// docs/recipes/README.md lists each recipe once, and its PB core edits count equals the recipe's own header count.
function recipeCount(c) {
  if (c.rel !== 'docs/recipes/README.md') return;
  const dir = path.join(c.root, 'docs/recipes');
  const body = stripCode(c.lines);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.md') || e.name === 'README.md') continue;
    const own = /^PB core edits: ([0-9]+)$/m.exec(fs.readFileSync(path.join(dir, e.name), 'utf8'))?.[1];
    const hits = body.map((l, i) => [l, i]).filter(([l]) => [...l.matchAll(LINK_RE)].some((m) => path.resolve(dir, m[1]) === path.join(dir, e.name)));
    if (hits.length !== 1) { c.add(hits[0]?.[1] + 1 || 1, 'recipe-count', `${e.name} is listed ${hits.length} time(s) in docs/recipes/README.md; list it once`); continue; }
    const [line, i] = hits[0];
    const listed = /PB core edits: ([0-9]+)/.exec(line)?.[1];
    if (own !== undefined && listed !== own) c.add(i + 1, 'recipe-count', `${e.name} lists PB core edits ${listed ?? 'none'}, but its own header says ${own}`);
  }
}

// PB paths in docs/ and the entry files are written as $PB_REPO/<path>. Not checked: scripts/, docs/ and .planning/ paths,
// because this repo has the same directory names.
const BARE_PB_RE = /^(powerbrowser|theia|upstream|patches|brand|generated|inventory|ledger)\/|^(configuration\.toml|flake\.nix|defs\.mk|toolchain-baseline\.txt|\.mozconfig)$/;
function barePbPath(c) {
  if (!c.isDoc && !ENTRY_FILES.includes(c.rel)) return;
  stripCode(c.lines, false).forEach((l, i) => {
    for (const m of l.matchAll(/`([^`]+)`/g)) {
      if (!BARE_PB_RE.test(m[1]) || l.slice(0, m.index).endsWith('$PB_REPO/')) continue;
      c.add(i + 1, 'bare-pb-path', `${m[1]} is a PB path written bare; write it as $PB_REPO/${m[1]} (docs/CONVENTIONS.md, Paths and links)`);
    }
  });
}

const RULES = [stamp, header, kindHeader, pbPath, pbSymbol, absPath, lineCite, marker, link, block, requiredBlocks, footer, template, budget, skillDescription, templateVar, registryCount, indexReach, recipeCount, barePbPath];

// ---- run: pure over (root, pbRepo, files) ----

export function run({ root, pbRepo, files, noPb = false }) {
  const rulesPath = path.join(root, 'docs/_shared/RULES.md');
  if (!fs.existsSync(rulesPath)) throw new Error(`docs/_shared/RULES.md not found under ${root}`);
  const canon = new Map();
  for (const b of parseBlocks(lineList(fs.readFileSync(rulesPath, 'utf8')))) if (b.e >= 0 && !canon.has(b.name)) canon.set(b.name, b.inner);
  if (!canon.has('footer')) throw new Error('docs/_shared/RULES.md has no footer block');
  const pbOk = !noPb && pbPresent(pbRepo);
  const out = [];
  const memo = new Map();
  const slugs = new Map();
  for (const rel of files) {
    if (!fs.existsSync(path.join(root, rel))) { out.push(`${rel}:1: entry-file: required file is missing (docs/CONVENTIONS.md names it); restore or create it`); continue; }
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const lines = lineList(text);
    const found = [];
    let listEnd = 5;
    while (listEnd < lines.length && lines[listEnd] !== '') listEnd++;
    const c = {
      root, pbRepo, pbOk, rel, text, lines, memo, slugs, canon, listEnd,
      bodyStart: rel.startsWith('docs/') ? listEnd + 1 : 0,
      isDoc: rel.startsWith('docs/'),
      isTemplate: rel.startsWith('docs/_templates/'),
      add: (n, rule, msg) => found.push({ n, rule, msg }),
    };
    for (const rule of RULES) rule(c);
    found.sort((a, b) => a.n - b.n);
    for (const f of found) out.push(`${rel}:${f.n}: ${f.rule}: ${f.msg}`);
  }
  return { lines: out, pbOk, code: noPb ? (out.length ? 1 : 0) : !pbOk ? 2 : out.length ? 1 : 0 };
}

// ---- self-test: fixtures live under os.tmpdir(), fake PB is a throwaway git repo ----

const FIX_GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const FIX_GIT_OPTS = ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid',
  '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];

function fixtureGit(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...FIX_GIT_OPTS, ...args], { env: FIX_GIT_ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`fixture git ${args.join(' ')} failed: ${r.stderr}`);
}

function put(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}

function makeFakePb(dir) {
  put(dir, 'src/api.mjs', 'export function openThing() { return 1; }\n');
  put(dir, 'lib/one.txt', 'one\n');
  put(dir, '.gitignore', 'upstream/\n');
  fixtureGit(dir, ['init', '-q']);
  fixtureGit(dir, ['add', '-A']);
  fixtureGit(dir, ['commit', '-q', '-m', 'init']);
}

const GOOD_STAMP = '> Verified against PB abc1234 on 2026-01-01. Level: source-read';
const STOP = ['<!-- BEGIN pb-rules:stop-and-ask -->', '> Stop and ask first.', '<!-- END pb-rules:stop-and-ask -->'];
const HARD = ['<!-- BEGIN pb-rules:hard-rules -->', 'Hard rules text.', '<!-- END pb-rules:hard-rules -->'];
const FOOT = ['<!-- BEGIN pb-rules:footer -->', 'File a doc-gap issue.', '<!-- END pb-rules:footer -->'];
const RULES_MD = ['# Shared rule blocks', '', GOOD_STAMP, '', 'Source files:', '- none', '', ...STOP, '', '## Hard rules', '', ...HARD, '', ...FOOT, ''].join('\n');

// A conforming docs/ file; o overrides any part.
function doc(o = {}) {
  return [
    o.title ?? '# Thing', '', o.stamp ?? GOOD_STAMP, '', o.l5 ?? 'Source files:',
    ...(o.src ?? ['- `$PB_REPO/src/api.mjs`']), '',
    ...(o.extra ? [...o.extra, ''] : []),
    ...(o.stop ?? STOP), '',
    ...(o.body ?? ['Uses `openThing` in `$PB_REPO/src/api.mjs`.']), '',
    ...(o.foot ?? FOOT), '',
  ].join('\n');
}

const recipe = (o = {}) => doc({ extra: ['PB core edits: 1'], body: [POINTER, '1. **PB core edit** Change x.', '2. Run y.'], ...o });
const subsystem = (o = {}) => doc({ extra: ['Not read:', '- NOT COVERED: `$PB_REPO/lib/`', '', 'Status: partly working'], body: [POINTER, 'Text.'], ...o });
const skill = (desc) => ['---', 'name: x', `description: ${desc}`, '---', '# Body', ''].join('\n');
const registry = (rows) => doc({ title: '# Open unverified items', body: ['| ID | Claim |', '| --- | --- |', ...rows] });
const indexDoc = (links) => doc({ title: '# Index', body: links });

// Each case: subcases { files, scope?, expect: rule|null, min?, count?, want?: [substring], code?, pb? }.
// A rule subcase passes when it yields >= min violations and every one carries that rule id.
function cases(tmp) {
  return {
    clean: [{
      files: {
        'docs/thing.md': doc({ body: ['Uses `openThing` in `$PB_REPO/src/api.mjs`; see `$PB_REPO/lib/`.', 'See [other](other.md#heading-two).'] }),
        'docs/other.md': doc({ title: '# Other', body: ['## Heading Two'] }),
        'docs/recipes/r.md': recipe(),
        'docs/subsystems/s.md': subsystem(),
        'docs/_templates/t.md': doc({ stamp: PLACEHOLDER, src: ['- `$PB_REPO/{path}`'], body: ['<!-- template: fill in -->'] }),
        '.agents/skills/x/SKILL.md': skill('A one-line description.'),
      },
      scope: ['docs/thing.md', 'docs/other.md', 'docs/recipes/r.md', 'docs/subsystems/s.md', 'docs/_templates/t.md', '.agents/skills/x/SKILL.md'], expect: null,
    }],
    stamp: [
      { files: { 'docs/a.md': doc({ stamp: '> Verified against PB abc on 2026-01-01. Level: source-read' }) }, expect: 'stamp' },
      { files: { 'docs/_templates/t.md': doc({ stamp: GOOD_STAMP }) }, expect: 'stamp' },
    ],
    header: [
      { files: { 'docs/a.md': doc({ l5: 'Sources:' }) }, expect: 'header' },
      { files: { 'docs/subsystems/s.md': subsystem({ extra: ['Status: working'] }) }, expect: 'header' },
      { files: { 'docs/subsystems/s.md': subsystem({ extra: ['Not read:', '- `$PB_REPO/lib/`', '', 'Status: fine'] }) }, expect: 'header', min: 2 },
      { files: { 'docs/recipes/r.md': recipe({ extra: [] }) }, expect: 'header' },
      { files: { 'docs/recipes/r.md': recipe({ extra: ['PB core edits: 0'] }) }, expect: 'header' },
    ],
    'source-files': [
      {
        files: { 'docs/a.md': doc({ src: ['- `$PB_REPO/src/*.mjs`', '- `$PB_REPO/lib/../src/api.mjs`', '- `$PB_REPO/a:b`', '- src/api.mjs'] }) },
        expect: 'source-files', min: 4,
      },
      { files: { 'docs/a.md': doc({ src: ['- none', '- `$PB_REPO/src/api.mjs`'] }) }, expect: 'source-files' },
      { files: { 'docs/a.md': doc({ src: [] }) }, expect: 'source-files' },
      { files: { 'docs/a.md': doc({ src: ['- `$PB_REPO/lib`', '- `$PB_REPO/src/api.mjs/`'] }) }, expect: 'source-files', min: 2 },
    ],
    'pb-path': [
      {
        files: { 'docs/a.md': doc({ src: ['- `$PB_REPO/src/gone.mjs`'], body: ['See `$PB_REPO/missing/dir/`.'] }) },
        expect: 'pb-path', min: 2,
      },
      {
        files: { 'docs/a.md': doc({ body: ['See `$PB_REPO/upstream/`, `$PB_REPO/lib/` and `$PB_REPO/lib/one.txt`.'] }) },
        expect: null,
      },
    ],
    'pb-symbol': [
      { files: { 'docs/a.md': doc({ body: ['`noSuchThing` in `$PB_REPO/src/api.mjs`.'] }) }, expect: 'pb-symbol' },
      {
        files: { 'docs/a.md': doc({ body: ['`openThing` in `$PB_REPO/src/api.mjs`, `api.openThing` in `$PB_REPO/src/api.mjs`,',
          '`openThing()` in `$PB_REPO/src/api.mjs`, `\'openThing\'` in `$PB_REPO/src/api.mjs`.'] }) },
        expect: null,
      },
    ],
    'abs-path': [
      { files: { 'docs/a.md': doc({ body: ['Open ' + '/' + 'home/me/x.', 'Or ~/y.', '`' + '/' + 'Users/me/z`'] }) }, expect: 'abs-path', count: 3 },
      { files: { 'docs/a.md': doc({ body: ['See https://example.invalid/' + 'home/x and foo~/bar.'] }) }, expect: null },
    ],
    'line-cite': [
      { files: { 'docs/a.md': doc({ body: ['See api.mjs:12.', 'Or page#L40.', 'See foo.cpp:12.', 'Or x.h:3.', 'Read lines 10-20 of `$PB_REPO/src/api.mjs`.'] }) }, expect: 'line-cite', count: 5 },
      { files: { 'docs/a.md': doc({ body: ['Line 3 holds the stamp; see line 3 of this doc.', 'The server is 127.0.0.1:9.'] }) }, expect: null },
      { files: { 'docs/a.md': doc({ body: ['Read lines 174 to 186 of `$PB_REPO/src/api.mjs`.'] }) }, expect: 'line-cite' },
      { files: { 'docs/a.md': doc({ body: ['Read lines 91 and 92 of `$PB_REPO/src/api.mjs`.'] }) }, expect: 'line-cite' },
      { files: { 'docs/a.md': doc({ body: ['Lines 174 to 186 of this doc hold the stamp, and lines 91 and 92 hold the table.'] }) }, expect: null },
    ],
    marker: [
      { files: { 'docs/a.md': doc({ body: ['UNVERIFIED that claim.', 'GAP in the API.'] }) }, expect: 'marker', min: 2 },
      { files: { 'docs/a.md': doc({ body: ['UNVERIFIED: x.', 'GAPS exist.'] }) }, expect: null },
      // The registry file name is not a marker.
      { files: { 'docs/a.md': doc({ body: ['The list is in docs/UNVERIFIED.md.'] }) }, expect: null },
    ],
    link: [
      {
        files: {
          'docs/a.md': doc({ body: ['[x](nope.md) [y](other.md#nope) [z](../AGENTS.md)'] }),
          'docs/other.md': doc({ title: '# Other', body: ['## Heading Two'] }),
          'AGENTS.md': 'x\n',
        },
        expect: 'link', min: 3,
      },
      {
        files: { 'docs/a.md': doc({ body: ['[x][r] [y][s]', '', '[r]: nope.md', '[s]: <../AGENTS.md>'] }), 'AGENTS.md': 'x\n' },
        expect: 'link', count: 2, want: ['nope.md does not exist', 'link ../AGENTS.md leaves docs/'],
      },
      {
        files: {
          'docs/a.md': doc({ body: ['## Local', '`[x](nope.md)` [web](https://example.invalid/x) [self](#local)', '```', '[x](nope.md)', '```'] }),
        },
        expect: null,
      },
    ],
    fence: [{
      files: { 'docs/a.md': doc({ body: ['````md', '```', '[bad](nope.md)', '```', '````', '[bad2](nope2.md)'] }) },
      expect: 'link', count: 1, want: ['nope2.md'],
    }],
    block: [
      { files: { 'docs/a.md': doc({ stop: STOP.map((l) => l.replace('first', 'second')) }) }, expect: 'block' },
      { files: { 'docs/a.md': doc({ body: ['<!-- BEGIN pb-rules:nope -->', 'x', '<!-- END pb-rules:nope -->'] }) }, expect: 'block' },
      { files: { 'docs/a.md': doc({ body: ['<!-- BEGIN pb-rules:hard-rules -->'] }) }, expect: 'block' },
      { files: { 'docs/recipes/r.md': recipe({ stop: [] }) }, expect: 'block' },
      { files: { 'docs/subsystems/s.md': subsystem({ body: ['No pointer.'] }) }, expect: 'block' },
      { files: { 'docs/_templates/recipe.md': doc({ stamp: PLACEHOLDER, src: ['- `$PB_REPO/{path}`'], stop: [], body: ['x'] }) }, expect: 'block', min: 2 },
    ],
    footer: [{ files: { 'docs/a.md': doc({ foot: [] }) }, expect: 'footer' }],
    template: [
      { files: { 'docs/a.md': doc({ body: ['<!-- template: fill me -->'] }) }, expect: 'template' },
      { files: { 'docs/a.md': doc({ body: ['`<!-- template: x -->`'] }) }, expect: null },
      { files: { 'docs/a.md': doc({ body: ['Text <!-- template: fill me -->', 'Fill {name} here.'] }) }, expect: 'template', count: 2 },
    ],
    budget: [
      { files: { 'docs/recipes/big.md': recipe({ extra: ['PB core edits: 0'], body: [POINTER, 'x'.repeat(7000)] }) }, expect: 'budget' },
      { files: { 'S/SKILL.md': skill('é'.repeat(601)) }, expect: 'budget' },
      { files: { 'S/SKILL.md': skill('é'.repeat(600)) }, expect: null },
      { files: { 'S/SKILL.md': ['---', 'name: x', 'description: ok', '---', ...Array(501).fill('l'), ''].join('\n') }, expect: 'budget' },
    ],
    'skill-description': [
      { files: { 'S/SKILL.md': ['---', 'name: x', 'description: >', '  folded text', '---', 'body', ''].join('\n') }, expect: 'skill-description' },
      { files: { 'S/SKILL.md': ['---', 'name: x', '---', 'body', ''].join('\n') }, expect: 'skill-description' },
    ],
    'entry-file': [{ files: { 'docs/a.md': doc() }, scope: 'default', expect: 'entry-file', min: ENTRY_FILES.length }],
    'no-pb': [{
      files: { 'docs/a.md': doc({ l5: 'Sources:', src: ['- `$PB_REPO/src/gone.mjs`'], body: ['`noSuchThing` in `$PB_REPO/src/api.mjs`.'] }) },
      expect: 'header', code: 2, pb: path.join(tmp, 'no-such-pb'),
    }],
    'template-var': [{ files: { 'AGENTS.md': 'Use {{prompt:project-info}} here.\n' }, expect: 'template-var' }],
    'template-var-clean': [{ files: { 'AGENTS.md': 'Plain entry text, no variables.\n' }, expect: null }],
    'registry-count': [{
      files: {
        'docs/UNVERIFIED.md': registry(['| U-001 | one |', '| U-002 | two |']),
        'docs/a.md': doc({ body: ['UNVERIFIED: x.', 'UNVERIFIED: y.', 'UNVERIFIED: z.'] }),
      },
      expect: 'registry-count', want: ['3 UNVERIFIED: marker(s)'],
    }],
    'registry-count-clean': [{
      files: {
        'docs/UNVERIFIED.md': registry(['| U-001 | one |', '| U-002 | two |']),
        'docs/a.md': doc({ body: ['UNVERIFIED: x.', 'UNVERIFIED: y.'] }),
      },
      expect: null,
    }],
    'index-reach': [{
      files: {
        'docs/INDEX.md': indexDoc(['- [a](a.md)', '- [recipes](recipes/README.md)', '- [subsystems](subsystems/README.md)']),
        'docs/a.md': doc(), 'docs/b.md': doc({ title: '# B' }),
        'docs/recipes/README.md': doc({ title: '# Recipes', body: ['- [R](r.md), PB core edits: 1'] }), 'docs/recipes/r.md': recipe(),
        'docs/subsystems/README.md': doc({ title: '# Subsystems', body: ['- [S](s.md)'] }), 'docs/subsystems/s.md': subsystem(),
      },
      expect: 'index-reach', want: ['docs/b.md'],
    }],
    'index-reach-clean': [{
      files: {
        'docs/INDEX.md': indexDoc(['- [a](a.md)', '- [b](b.md)', '- [recipes](recipes/README.md)', '- [subsystems](subsystems/README.md)']),
        'docs/a.md': doc(), 'docs/b.md': doc({ title: '# B' }),
        'docs/recipes/README.md': doc({ title: '# Recipes', body: ['- [R](r.md), PB core edits: 1'] }), 'docs/recipes/r.md': recipe(),
        'docs/subsystems/README.md': doc({ title: '# Subsystems', body: ['- [S](s.md)'] }), 'docs/subsystems/s.md': subsystem(),
      },
      expect: null,
    }],
    'recipe-count': [{
      files: { 'docs/recipes/README.md': doc({ title: '# Recipes', body: ['- [R](r.md), PB core edits: 2'] }), 'docs/recipes/r.md': recipe() },
      expect: 'recipe-count', want: ['r.md'],
    }],
    'recipe-count-clean': [{
      files: { 'docs/recipes/README.md': doc({ title: '# Recipes', body: ['- [R](r.md), PB core edits: 1'] }), 'docs/recipes/r.md': recipe() },
      expect: null,
    }],
    'bare-pb-path': [{
      files: { 'docs/a.md': doc({ body: ['Edit `theia/lib/one.txt` first.'] }) },
      expect: 'bare-pb-path', want: ['$PB_REPO/'],
    }],
    'bare-pb-path-clean': [{
      files: { 'docs/a.md': doc({ body: ['Edit `$PB_REPO/lib/one.txt` first.'] }) },
      expect: null,
    }],
  };
}

function ruleOf(line) {
  return /^[^ ]+: ([a-z-]+): /.exec(line)?.[1];
}

function evalSub(tmp, pb, n, sub) {
  const root = fs.mkdtempSync(path.join(tmp, `root${n}-`));
  put(root, 'docs/_shared/RULES.md', RULES_MD);
  for (const [rel, text] of Object.entries(sub.files)) put(root, rel, text);
  const r = run({ root, pbRepo: sub.pb ?? pb, files: sub.scope === 'default' ? defaultScope(root) : sub.scope ?? [Object.keys(sub.files)[0]] });
  const want = sub.code ?? (sub.expect ? 1 : 0);
  const shown = r.lines.join(' | ');
  if (r.code !== want) return `exit ${r.code}, want ${want}: ${shown}`;
  if (!sub.expect) return r.lines.length ? shown : null;
  if (r.lines.length < (sub.min ?? 1)) return `got ${r.lines.length} violation(s), want >= ${sub.min ?? 1}: ${shown}`;
  if (sub.count !== undefined && r.lines.length !== sub.count) return `got ${r.lines.length} violation(s), want exactly ${sub.count}: ${shown}`;
  const absent = (sub.want ?? []).filter((w) => !shown.includes(w));
  if (absent.length) return `missing ${JSON.stringify(absent)}: ${shown}`;
  const wrong = r.lines.filter((l) => ruleOf(l) !== sub.expect);
  return wrong.length ? `unexpected rule: ${wrong.join(' | ')}` : null;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
  let passed = 0;
  let failed = 0;
  try {
    const pb = path.join(tmp, 'pb');
    makeFakePb(pb);
    let n = 0;
    for (const [name, subs] of Object.entries(cases(tmp))) {
      const bad = subs.map((s) => evalSub(tmp, pb, n++, s)).find((d) => d !== null);
      if (bad === undefined) { console.log(`ok ${name}`); passed++; } else { console.log(`FAIL ${name}: ${bad}`); failed++; }
    }
    // --no-pb: no PB checkout is needed, a PB-only rule is not run, and a non-PB violation is still reported.
    const noPbRoot = path.join(tmp, 'no-pb');
    put(noPbRoot, 'docs/_shared/RULES.md', RULES_MD);
    put(noPbRoot, 'docs/bad.md', doc({ src: ['- `$PB_REPO/src/gone.mjs`'], body: ['Uses `noSuchThing` in `$PB_REPO/src/api.mjs`, see [x](missing.md).'] }));
    put(noPbRoot, 'docs/good.md', doc({ src: ['- `$PB_REPO/src/gone.mjs`'] }));
    const bad = run({ root: noPbRoot, pbRepo: path.join(tmp, 'absent'), files: ['docs/bad.md'], noPb: true });
    const good = run({ root: noPbRoot, pbRepo: path.join(tmp, 'absent'), files: ['docs/good.md'], noPb: true });
    if (bad.code === 1 && bad.lines.length === 1 && / link: /.test(bad.lines[0]) && good.code === 0) { console.log('ok no-pb'); passed++; } else { console.log(`FAIL no-pb: code ${bad.code}/${good.code} lines ${JSON.stringify(bad.lines)}`); failed++; }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failed ? `check-docs self-test: ${failed} case(s) failed, ${passed} passed` : `check-docs self-test: ${passed} cases passed`);
  return failed ? 1 : 0;
}

// ---- CLI ----

function defaultScope(root = ROOT) {
  const found = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.md')) found.push(rel);
    }
  };
  walk('docs');
  return [...found, ...ENTRY_FILES]; // a missing entry file is an entry-file violation in run()
}

function main(argv) {
  const flags = argv.filter((a) => a.startsWith('--'));
  const args = argv.filter((a) => !a.startsWith('--'));
  const known = ['--self-test', '--no-pb'];
  if (flags.some((f) => !known.includes(f))) {
    console.error(`check-docs: unknown option ${flags.find((f) => !known.includes(f))}. Usage: node scripts/check-docs.mjs [--self-test] [--no-pb] [file ...]`);
    return 2;
  }
  if (flags.includes('--self-test')) return selfTest();
  const noPb = flags.includes('--no-pb');
  const files = [];
  for (const a of args) {
    const abs = path.resolve(a);
    const rel = posix(path.relative(ROOT, abs));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile() || rel.startsWith('..')) {
      console.error(`check-docs: ${a} is not a file inside this repo. Pass a repo file path or no argument.`);
      return 2;
    }
    files.push(rel);
  }
  const pbRepo = process.env.PB_REPO ? path.resolve(process.env.PB_REPO) : path.resolve(ROOT, '../Power-Browser');
  let r;
  try {
    r = run({ root: ROOT, pbRepo, noPb, files: files.length ? files : defaultScope() });
  } catch (e) {
    console.error(`check-docs: ${e.message}`);
    return 2;
  }
  for (const l of r.lines) console.log(l);
  const nFiles = new Set(r.lines.map((l) => l.split(':')[0])).size;
  console.error(r.lines.length ? `check-docs: ${r.lines.length} violation(s) in ${nFiles} file(s)` : 'check-docs: no violations');
  if (!noPb && !r.pbOk) {
    console.error(`check-docs: no PB git checkout at ${pbRepo}; PB path and symbol checks did not run. Set PB_REPO to a PowerBrowser git checkout and rerun.`);
  }
  return r.code;
}

process.exitCode = main(process.argv.slice(2));
