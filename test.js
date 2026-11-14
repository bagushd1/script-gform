const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseForm } = require("./server");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const { normalizeUrl, parseEntries, extractPrefilled } = eval(`(function() {
  ${script}
  return { normalizeUrl, parseEntries, extractPrefilled };
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

// Test backend parseForm with mock response
async function testBackendParser() {
  const mockUrl = "https://docs.google.com/forms/d/e/1FAIpQLScMpr-ItNg3q2RW54_zLyF9T5hfy6IYFTHmq49YtUEPa1Maeg/viewform";
  const fields = await parseForm(mockUrl);
  assert.strictEqual(fields.length, 3);
  assert.strictEqual(fields[0].id, "entry.89984691");
  assert.strictEqual(fields[0].title, "nama");
  assert.strictEqual(fields[0].type, "text");

  assert.strictEqual(fields[1].id, "entry.1326919576");
  assert.strictEqual(fields[1].title, "senin");
  assert.strictEqual(fields[1].type, "choice");
  assert.deepStrictEqual(fields[1].options, ["pagi", "sore"]);

  console.log("All unit and integration tests passed!");
}

testBackendParser().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
