const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const { normalizeUrl, parseSourceData } = eval(`(function() {
  ${script}
  return { normalizeUrl, parseSourceData };
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

// Test parseSourceData with full mock including Other option
const mockSource = `FB_PUBLIC_LOAD_DATA_ = [null,["t",[[1,"nama",null,0,[[888,null,0]]],[2,"senin",null,2,[[999,[["pagi",null,null,null,0],["sore",null,null,null,0]],0]]],[3,"tindakan",null,2,[[777,[["indikasi",null,null,null,0],["kontrol",null,null,null,0],["",null,null,null,1]],1]]]]],null,null,null,null,null,null,null,null,null,null,null,null,"e/1FAIpQLScMockPath"];</script>`;
const parsed = parseSourceData(mockSource);

assert.strictEqual(parsed.formPath, "e/1FAIpQLScMockPath");
assert.strictEqual(parsed.fields.length, 3);

assert.strictEqual(parsed.fields[0].id, "entry.888");
assert.strictEqual(parsed.fields[0].title, "nama");
assert.strictEqual(parsed.fields[0].type, "text");
assert.strictEqual(parsed.fields[0].hasOther, false);

assert.strictEqual(parsed.fields[1].id, "entry.999");
assert.strictEqual(parsed.fields[1].title, "senin");
assert.strictEqual(parsed.fields[1].type, "choice");
assert.deepStrictEqual(parsed.fields[1].options, ["pagi", "sore"]);
assert.strictEqual(parsed.fields[1].hasOther, false);

assert.strictEqual(parsed.fields[2].id, "entry.777");
assert.strictEqual(parsed.fields[2].title, "tindakan");
assert.strictEqual(parsed.fields[2].type, "choice");
assert.deepStrictEqual(parsed.fields[2].options, ["indikasi", "kontrol"]); // empty string filtered out
assert.strictEqual(parsed.fields[2].hasOther, true);

// Test Other option payload generation logic
function mockGetEntries(fields, domValues) {
  const entries = [];
  for (const f of fields) {
    const val = domValues[f.id] || "";
    const isOther = val === "__other__" || /^(?:lainnya|other|yang\s*lain)/i.test(val.trim());
    if (isOther) {
      const otherVal = (domValues[`other_${f.id}`] || "").trim();
      if (otherVal !== "") {
        entries.push([f.id, "__other_option__"]);
        entries.push([`${f.id}.other_option_response`, otherVal]);
      }
    } else if (val.trim() !== "") {
      entries.push([f.id, val.trim()]);
    }
  }
  return entries;
}

const testDom = {
  "entry.888": "Budi",
  "entry.999": "pagi",
  "entry.777": "__other__",
  "other_entry.777": "Operasi Kecil"
};
const resultEntries = mockGetEntries(parsed.fields, testDom);
assert.strictEqual(resultEntries.length, 4);
assert.deepStrictEqual(resultEntries[0], ["entry.888", "Budi"]);
assert.deepStrictEqual(resultEntries[1], ["entry.999", "pagi"]);
assert.deepStrictEqual(resultEntries[2], ["entry.777", "__other_option__"]);
assert.deepStrictEqual(resultEntries[3], ["entry.777.other_option_response", "Operasi Kecil"]);

console.log("All unit tests and Other-option checks passed!");
