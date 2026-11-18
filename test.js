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

// Test form WITHOUT mandatory email (user's exact form scenario)
const mockUserFormWithoutEmail = `FB_PUBLIC_LOAD_DATA_ = [null,["TESTING YAA BUAT INTROSPEKSI",[[1264001826,"NAMA",null,0,[[275845556,null,0]],null,null,null,null,null,null,[null,"NAMA"]],[680201235,"APAKAH ANDA PERLU INTROSPEKSI?",null,2,[[22182892,[["YA",null,null,null,0],["TIDAK",null,null,null,0],["",null,null,null,1]],0,null,null,null,null,null,0]],null,null,null,null,null,null,[null,"APAKAH ANDA PERLU INTROSPEKSI?"]],[1371850537,"senin",null,2,[[53080948,[["pagi",null,null,null,0],["siang",null,null,null,0]],0,null,null,null,null,null,0]],null,null,null,null,null,null,[null,"senin"]],[1689090906,"selasa",null,2,[[1726004270,[["pagi",null,null,null,0],["siang",null,null,null,0]],0,null,null,null,null,null,0]],null,null,null,null,null,null,[null,"selasa"]]],null,null,null,null,null,null,"TESTING LAINNYA",76,[null,null,null,2,null,null,1],null,null,null,null,[2],null,null,null,null,null,null,null,null,[null,"TESTING YAA BUAT INTROSPEKSI"],[null,"TESTING LAINNYA"]],"/forms","Formulir tanpa judul",null,null,null,"",null,0,0,null,"",0,"e/1FAIpQLSfmK5RqFe6XYSp2RK5DP5FcpswXYBSm-N1wpGIAvh24nnKMuA",0,"[]",0,0,1];</script>
<span class="EbMsme">bagushd123@gmail.com</span>
<div class="Q99PAd">Tidak dibagikan</div>
<input type="hidden" name="pageHistory" value="0">
<input type="hidden" name="fbzx" value="-6852217254300239888">
<input type="hidden" name="fvv" value="1">`;

const parsedUserForm = parseSourceData(mockUserFormWithoutEmail);
assert.strictEqual(parsedUserForm.fields.length, 4, "Must only have 4 fields, no false positive email!");
assert.strictEqual(parsedUserForm.fields.some(f => f.id === "emailAddress"), false, "Must NOT contain emailAddress field!");
assert.strictEqual(parsedUserForm.fields[0].title, "NAMA");
assert.strictEqual(parsedUserForm.fields[1].title, "APAKAH ANDA PERLU INTROSPEKSI?");
assert.strictEqual(parsedUserForm.fields[2].title, "senin");
assert.strictEqual(parsedUserForm.fields[3].title, "selasa");

// Test form WITH mandatory email collection (name="emailAddress")
const mockFormWithMandatoryEmail = `FB_PUBLIC_LOAD_DATA_ = [null,["Form Dengan Email",[
  [1,"Nama Lengkap",null,0,[[1111,null,0]]]
]],null,null,null,null,null,null,null,null,null,null,null,null,"e/1FAIpQLScWithEmail"];</script>
<input type="email" name="emailAddress" class="whsOnd" required>
<input type="hidden" name="pageHistory" value="0">
<input type="hidden" name="fbzx" value="999888">`;

const parsedWithEmail = parseSourceData(mockFormWithMandatoryEmail);
assert.strictEqual(parsedWithEmail.fields.length, 2, "Must have 2 fields (email + nama)");
assert.strictEqual(parsedWithEmail.fields[0].id, "emailAddress", "First field must be emailAddress");
assert.strictEqual(parsedWithEmail.fields[0].type, "email");
assert.strictEqual(parsedWithEmail.fields[0].required, true);
assert.strictEqual(parsedWithEmail.fields[1].id, "entry.1111");

// Test payload generation when emailAddress is present
const testEmailDom = {
  "emailAddress": "peserta@gmail.com",
  "entry.1111": "Bagus"
};
const emailEntries = [];
for (const f of parsedWithEmail.fields) {
  const val = testEmailDom[f.id];
  if (val) emailEntries.push([f.id, val]);
}
assert.deepStrictEqual(emailEntries[0], ["emailAddress", "peserta@gmail.com"]);
assert.deepStrictEqual(emailEntries[1], ["entry.1111", "Bagus"]);

// Test with live Google Form if available
if (fs.existsSync("/tmp/live_form.html")) {
  const liveFormSource = fs.readFileSync("/tmp/live_form.html", "utf8");
  const parsedLiveForm = parseSourceData(liveFormSource);
  assert(parsedLiveForm !== null, "Live form must parse successfully");
  assert.strictEqual(parsedLiveForm.fields.length, 4, "Live form must have exactly 4 fields");
  assert.strictEqual(parsedLiveForm.fields.some(f => f.id === "emailAddress"), false, "Live form must not have emailAddress");
}

console.log("All unit tests and Other-option checks passed!");
