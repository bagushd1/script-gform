const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const { normalizeUrl, parseEntries, extractPrefilled, parseSourceData } = eval(`(function() {
  ${script}
  return { normalizeUrl, parseEntries, extractPrefilled, parseSourceData };
})()`);

// Test normalizeUrl
assert.strictEqual(
  normalizeUrl("https://docs.google.com/forms/d/e/1FAIpQLSc/viewform"),
  "https://docs.google.com/forms/d/e/1FAIpQLSc/formResponse"
);

// Test parseEntries
const sample = `entry.123=Budi
entry.456=Senin Siang = Opsi 1
entry.789=Nilai // komentar`;

const parsed = parseEntries(sample);
assert.strictEqual(parsed.length, 3);
assert.deepStrictEqual(parsed[0], ["entry.123", "Budi"]);
assert.deepStrictEqual(parsed[1], ["entry.456", "Senin Siang = Opsi 1"]);
assert.deepStrictEqual(parsed[2], ["entry.789", "Nilai"]);

// Test extractPrefilled
const prefilled = "https://docs.google.com/forms/d/e/xxx/viewform?usp=pp_url&entry.111=Andi&entry.222=Pagi";
const ext = extractPrefilled(prefilled);
assert.strictEqual(ext.entriesText, "entry.111=Andi\nentry.222=Pagi");

// Test parseSourceData (offline client-side parsing)
const mockSource = `FB_PUBLIC_LOAD_DATA_ = [null,["t",[[1,"nama",null,0,[[888,null,0]]],[2,"senin",null,2,[[999,[["pagi",null,null,null,0]],0]]]]],null,null,null,null,null,null,null,null,null,null,null,null,"e/1FAIpQLScMockPath"];</script>`;
const offlineParsed = parseSourceData(mockSource);
assert.strictEqual(offlineParsed.formPath, "e/1FAIpQLScMockPath");
assert.strictEqual(offlineParsed.fields.length, 2);
assert.strictEqual(offlineParsed.fields[0].id, "entry.888");
assert.strictEqual(offlineParsed.fields[0].title, "nama");
assert.strictEqual(offlineParsed.fields[0].type, "text");
assert.strictEqual(offlineParsed.fields[1].id, "entry.999");
assert.strictEqual(offlineParsed.fields[1].title, "senin");
assert.strictEqual(offlineParsed.fields[1].type, "choice");
assert.deepStrictEqual(offlineParsed.fields[1].options, ["pagi"]);

console.log("All client-side tests passed successfully!");
