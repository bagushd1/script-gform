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

// Test parseSourceData with full mock including Other option, Checkboxes, Date, Time, and Grid
const mockSource = `FB_PUBLIC_LOAD_DATA_ = [null,["t",[
  [1,"nama",null,0,[[888,null,0]]],
  [2,"senin",null,2,[[999,[["pagi",null,null,null,0],["sore",null,null,null,0]],0]]],
  [3,"tindakan",null,2,[[777,[["indikasi",null,null,null,0],["kontrol",null,null,null,0],["",null,null,null,1]],1]]],
  [4,"hobi",null,4,[[666,[["futsal",null,null,null,0],["renang",null,null,null,0],["",null,null,null,1]],1]]],
  [5,"tgl_lahir",null,9,[[555,null,0]]],
  [6,"jam_hadir",null,10,[[444,null,0]]],
  [7,"penilaian",null,7,[[331,[["bagus",null,null,null,0],["kurang",null,null,null,0]],0,"Pelayanan"],[332,[["bagus",null,null,null,0],["kurang",null,null,null,0]],0,"Kebersihan"]]]
]],null,null,null,null,null,null,null,null,null,null,null,null,"e/1FAIpQLScMockPath"];</script>
<input type="hidden" name="pageHistory" value="0,1,2">
<input type="hidden" name="fbzx" value="-123456789">
<input type="hidden" name="fvv" value="1">`;

const parsed = parseSourceData(mockSource);

assert.strictEqual(parsed.formPath, "e/1FAIpQLScMockPath");
assert.strictEqual(parsed.pageHistory, "0,1,2");
assert.strictEqual(parsed.fbzx, "-123456789");
assert.strictEqual(parsed.fvv, "1");
assert.strictEqual(parsed.fields.length, 8);

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
assert.deepStrictEqual(parsed.fields[2].options, ["indikasi", "kontrol"]);
assert.strictEqual(parsed.fields[2].hasOther, true);

assert.strictEqual(parsed.fields[3].id, "entry.666");
assert.strictEqual(parsed.fields[3].title, "hobi");
assert.strictEqual(parsed.fields[3].type, "checkbox");
assert.deepStrictEqual(parsed.fields[3].options, ["futsal", "renang"]);
assert.strictEqual(parsed.fields[3].hasOther, true);

assert.strictEqual(parsed.fields[4].id, "entry.555");
assert.strictEqual(parsed.fields[4].title, "tgl_lahir");
assert.strictEqual(parsed.fields[4].type, "date");

assert.strictEqual(parsed.fields[5].id, "entry.444");
assert.strictEqual(parsed.fields[5].title, "jam_hadir");
assert.strictEqual(parsed.fields[5].type, "time");

assert.strictEqual(parsed.fields[6].id, "entry.331");
assert.strictEqual(parsed.fields[6].title, "penilaian [Pelayanan]");
assert.strictEqual(parsed.fields[6].type, "choice");

assert.strictEqual(parsed.fields[7].id, "entry.332");
assert.strictEqual(parsed.fields[7].title, "penilaian [Kebersihan]");
assert.strictEqual(parsed.fields[7].type, "choice");

// Test payload generation logic
function mockGetEntries(fields, domValues) {
  const entries = [];
  for (const f of fields) {
    if (f.type === "checkbox") {
      const checkedArr = domValues[`chk_${f.id}`] || [];
      checkedArr.forEach(v => entries.push([f.id, v]));
      if (domValues[`chk_other_${f.id}`]) {
        const otherVal = (domValues[`other_${f.id}`] || "").trim();
        if (otherVal !== "") {
          entries.push([f.id, "__other_option__"]);
          entries.push([`${f.id}.other_option_response`, otherVal]);
        }
      }
    } else if (f.type === "date") {
      const val = (domValues[f.id] || "").trim();
      if (val) {
        const [y, m, d] = val.split("-");
        entries.push([`${f.id}_year`, y]);
        entries.push([`${f.id}_month`, String(parseInt(m, 10))]);
        entries.push([`${f.id}_day`, String(parseInt(d, 10))]);
        entries.push([f.id, val]);
      }
    } else if (f.type === "time") {
      const val = (domValues[f.id] || "").trim();
      if (val) {
        const [hh, mm] = val.split(":");
        entries.push([`${f.id}_hour`, hh]);
        entries.push([`${f.id}_minute`, mm]);
        entries.push([f.id, val]);
      }
    } else {
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
  }
  return entries;
}

const testDom = {
  "entry.888": "Budi",
  "entry.999": "pagi",
  "entry.777": "__other__",
  "other_entry.777": "Operasi Kecil",
  "chk_entry.666": ["futsal", "renang"],
  "chk_other_entry.666": true,
  "other_entry.666": "Membaca",
  "entry.555": "2026-11-15",
  "entry.444": "08:30",
  "entry.331": "bagus",
  "entry.332": "kurang"
};
const resultEntries = mockGetEntries(parsed.fields, testDom);

assert.deepStrictEqual(resultEntries[0], ["entry.888", "Budi"]);
assert.deepStrictEqual(resultEntries[1], ["entry.999", "pagi"]);
assert.deepStrictEqual(resultEntries[2], ["entry.777", "__other_option__"]);
assert.deepStrictEqual(resultEntries[3], ["entry.777.other_option_response", "Operasi Kecil"]);
assert.deepStrictEqual(resultEntries[4], ["entry.666", "futsal"]);
assert.deepStrictEqual(resultEntries[5], ["entry.666", "renang"]);
assert.deepStrictEqual(resultEntries[6], ["entry.666", "__other_option__"]);
assert.deepStrictEqual(resultEntries[7], ["entry.666.other_option_response", "Membaca"]);
assert.deepStrictEqual(resultEntries[8], ["entry.555_year", "2026"]);
assert.deepStrictEqual(resultEntries[9], ["entry.555_month", "11"]);
assert.deepStrictEqual(resultEntries[10], ["entry.555_day", "15"]);
assert.deepStrictEqual(resultEntries[11], ["entry.555", "2026-11-15"]);
assert.deepStrictEqual(resultEntries[12], ["entry.444_hour", "08"]);
assert.deepStrictEqual(resultEntries[13], ["entry.444_minute", "30"]);
assert.deepStrictEqual(resultEntries[14], ["entry.444", "08:30"]);
assert.deepStrictEqual(resultEntries[15], ["entry.331", "bagus"]);
assert.deepStrictEqual(resultEntries[16], ["entry.332", "kurang"]);

// Test native email collection detection
const mockEmailSource = `FB_PUBLIC_LOAD_DATA_ = [null,["t",[[1,"nama",null,0,[[888,null,0]]]]],null,null,null,null,null,null,null,null,null,null,null,null,"e/mockPath"];</script>
<input type="email" autocomplete="email" aria-label="Email Anda">`;
const parsedEmail = parseSourceData(mockEmailSource);
assert.strictEqual(parsedEmail.fields.length, 2);
assert.strictEqual(parsedEmail.fields[0].id, "emailAddress");
assert.strictEqual(parsedEmail.fields[0].title, "Email");
assert.strictEqual(parsedEmail.fields[0].type, "email");
assert.strictEqual(parsedEmail.fields[1].id, "entry.888");

const emailDom = { "emailAddress": "user@example.com", "entry.888": "Budi" };
const emailEntries = mockGetEntries(parsedEmail.fields, emailDom);
assert.deepStrictEqual(emailEntries[0], ["emailAddress", "user@example.com"]);
assert.deepStrictEqual(emailEntries[1], ["entry.888", "Budi"]);

console.log("All unit tests, Other-option checks, and Email-field checks passed!");
