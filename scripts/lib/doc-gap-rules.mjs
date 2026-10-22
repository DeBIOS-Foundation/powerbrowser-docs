// Shared doc-gap form facts: field ids and labels, gap types, dedupe key, label names and the form parity check.
// Read by the triage workflow and by scripts/file-doc-gap.mjs. This module has no imports and must stay dependency-free.

export const FORM = '.github/ISSUE_TEMPLATE/doc-gap.yml';
// The doc-gap form's field ids and labels, in form order; the self-test checks them against FORM.
export const FIELDS = [
  ['gap-type', 'Gap type'],
  ['doc', 'Doc'],
  ['task', 'Task'],
  ['evidence', 'Evidence'],
  ['pb-commit', 'PB commit'],
];
export const TYPES = ['guessed', 'wrong-fact', 'missing-topic', 'drift'];
export const NO_RESPONSE = '_No response_';
export const LABEL_MAX = 50;
export const LABELS = {
  docGap: 'doc-gap',
  duplicate: 'duplicate',
  needsRedaction: 'needs-redaction',
  gap: (type) => `gap:${type}`,
  doc: (rel) => `doc:${rel}`,
};

export const isDocPath = (doc) => typeof doc === 'string'
  && /^docs\/[A-Za-z0-9._/-]+\.md$/.test(doc) && !doc.split('/').includes('..');
export const dedupeKey = (doc, type) => `doc-gap:${doc}:${type}`;
export const keyLine = (doc, type) => `<!-- ${dedupeKey(doc, type)} -->`;
export const titleOf = (doc, type) => `[doc-gap] ${doc}: ${type}`;

// ---- form parity: the single copy, used by the triage workflow and by the filing script ----

// Problems between FIELDS/TYPES and the form text, read by fixed line patterns (no YAML library).
export function parityProblems(yml) {
  const grab = (re) => [...yml.matchAll(re)].map((m) => m[1].trim());
  const ids = grab(/^ +id: (.+)$/gm);
  if (!ids.length) return [`found no "id:" lines in ${FORM}; the form format changed, update FIELDS and TYPES in scripts/lib/doc-gap-rules.mjs`];
  const want = [
    ['ids', ids, FIELDS.map((f) => f[0])],
    ['labels', grab(/^ +label: (.+)$/gm), FIELDS.map((f) => f[1])],
    ['gap types', grab(/^ +- ([a-z-]+)$/gm), TYPES],
  ];
  return want.filter(([, got, exp]) => JSON.stringify(got) !== JSON.stringify(exp))
    .map(([what, got, exp]) => `${FORM} ${what} ${JSON.stringify(got)} differ from the rules module's ${JSON.stringify(exp)}`);
}

// Refusal table: the single copy, used by the triage workflow and by scripts/file-doc-gap.mjs.
// A line that matches one rule is refused; the matched text is never printed.
const entropy = (s) => {
  const n = new Map();
  for (const ch of s) n.set(ch, (n.get(ch) ?? 0) + 1);
  return -[...n.values()].reduce((a, c) => a + (c / s.length) * Math.log2(c / s.length), 0);
};
// shortcut: a URL whose path holds a home-directory segment is refused too; PB has no such segment today (P-02), relax if one appears.
const absPath = (l) => /\/(home|Users|root)\//.test(l) || /(^|[\s`"'(<=:])~[\w.-]*\//.test(l) || /(^|[^A-Za-z0-9])[A-Za-z]:\\/.test(l);
// Hex runs over 40 are refused (a commit id is 7-40 hex); other 40+ runs with a digit and a letter at >= 4.2 bits per character.
// shortcut: a 40-hex secret passes as a commit id; tighten if hex secrets show up in reports.
const highEntropy = (l) => (l.match(/[A-Za-z0-9+/=_-]{40,}/g) ?? []).some((run) =>
  (/^[0-9a-fA-F]+$/.test(run) ? run.length > 40 : /[0-9]/.test(run) && /[A-Za-z]/.test(run) && entropy(run) >= 4.2));
// A 0x prefix or _ or - separators mark hex that is not a commit id; refuse it at 32 or more hex digits.
const splitHex = (l) => (l.match(/(?:0x)?[0-9a-fA-F]+(?:[_-][0-9a-fA-F]+)*/g) ?? []).some((m) =>
  /^0x|[_-]/i.test(m) && m.replace(/^0x/i, '').replace(/[_-]/g, '').length >= 32);
const hiddenComment = (l) => l.includes('<!--');
// One entry per line: [rule id, RegExp or function, reason words].
const REFUSALS = [
  ['abs-path', absPath, 'home-directory, root, tilde or drive path'],
  ['token-prefix', /(?<![A-Za-z0-9_])(gh[pousr]_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|sk-[A-Za-z0-9_-]{8,}|sk_(?:live|test)_[A-Za-z0-9]{8,}|glpat-[A-Za-z0-9_-]{8,}|(?:AKIA|ASIA)[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[a-z]-[A-Za-z0-9-]{8,})/, 'access-token prefix'],
  ['private-key', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY/, 'private-key block'],
  // key=value always; key: value, key = value and JSON "key": "value" when the value is quoted or holds a digit (const token = readCookie() passes).
  ['assignment', /(password|passwd|secret|token|api_?key|authorization)["']?(=(?![\s<$]|$)|\s*[:=]\s*(["'][^"'\s<$]|[^\s"'<$(;,]*\d))/i, 'password, secret, token or API key assignment'],
  ['bearer', /\bBearer\s+(?!<)\S{8,}/, 'bearer token'],
  ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, 'UUID, the form of the PowerBrowser session cookie'],
  ['split-hex', splitHex, 'hex string with 0x or separators'],
  ['high-entropy', highEntropy, 'random-looking string of 40 or more characters'],
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/, 'email address'],
  ['hidden-comment', hiddenComment, 'HTML comment'],
  ['heading', /^ {0,3}#{1,6}([ \t]|$)/, 'Markdown heading line, which can start a form section'],
];

// Hits for one text: one object per matching rule per line, with the 1-based line number in that text.
export function refuseHits(text) {
  return text.replace(/\r\n?/g, "\n").split("\n").flatMap((l, i) => REFUSALS
    .filter(([, test]) => (typeof test === "function" ? test(l) : test.test(l)))
    .map(([id, , words]) => ({ line: i + 1, id, words })));
}
