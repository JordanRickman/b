function _b(strings, ...substitutions) {
  const quoted = substitutions.map((s) => `"${s}"`);
  return strings.reduce((acc, s, i) => acc + s + (quoted[i] || ''), '');
}

module.exports = {
  _b,
};
