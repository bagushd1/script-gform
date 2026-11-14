const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const { normalizeUrl, parseEntries } = eval(`(function() {
  ${script}
  return { normalizeUrl, parseEntries };
})()`);

// Test normalizeUrl
assert.strictEqual(
  normalizeUrl("https://docs.google.com/forms/d/e/1FAIpQLSc/viewform"),
  "https://docs.google.com/forms/d/e/1FAIpQLSc/formResponse"
);
assert.strictEqual(
  normalizeUrl("https://docs.google.com/forms/d/e/1FAIpQLSc/viewform?usp=sf_link"),
  "https://docs.google.com/forms/d/e/1FAIpQLSc/formResponse"
);

// Test parseEntries
const sample = `entry.123=Budi
entry.456=Senin Siang = Opsi 1
invalid_line`;

const parsed = parseEntries(sample);
assert.strictEqual(parsed.length, 2);
assert.deepStrictEqual(parsed[0], ["entry.123", "Budi"]);
assert.deepStrictEqual(parsed[1], ["entry.456", "Senin Siang = Opsi 1"]);

console.log("All self-checks passed!");
