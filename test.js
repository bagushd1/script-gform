const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const { normalizeUrl, parseEntries, extractPrefilled, parseSourceEntries } = eval(`(function() {
  ${script}
  return { normalizeUrl, parseEntries, extractPrefilled, parseSourceEntries };
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

// Test parseEntries with comments and multiple equals
const sample = `entry.123=Budi
entry.456=Senin Siang = Opsi 1
entry.789=Nilai // ini komentar
invalid_line`;

const parsed = parseEntries(sample);
assert.strictEqual(parsed.length, 3);
assert.deepStrictEqual(parsed[0], ["entry.123", "Budi"]);
assert.deepStrictEqual(parsed[1], ["entry.456", "Senin Siang = Opsi 1"]);
assert.deepStrictEqual(parsed[2], ["entry.789", "Nilai"]);

// Test extractPrefilled
const prefilled = "https://docs.google.com/forms/d/e/xxx/viewform?usp=pp_url&entry.111=Andi&entry.222=Pagi";
const ext = extractPrefilled(prefilled);
assert.strictEqual(ext.cleanUrl, "https://docs.google.com/forms/d/e/xxx/viewform");
assert.strictEqual(ext.entriesText, "entry.111=Andi\nentry.222=Pagi");

// Test parseSourceEntries
const mockSource = `FB_PUBLIC_LOAD_DATA_ = [null,["t",[[1,"nama",null,0,[[888,null,0]]]]]];</script>`;
const srcEntries = parseSourceEntries(mockSource);
assert.strictEqual(srcEntries, "entry.888= // nama");

console.log("All self-checks passed!");