#!/usr/bin/env node
/**
 * War GForm - High-Precision Headless Submitter for Node.js & Google Cloud Shell
 * Zero dependencies (Node.js standard library only: https, fs, path, readline)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// Persistent HTTP Agent for socket pre-warming and TLS keep-alive
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  keepAliveMsecs: 30000
});

function parseTargetTime(timeStr) {
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) {
    throw new Error(`Format jam salah: "${timeStr}". Gunakan format HH:MM:SS (contoh: 08:00:00)`);
  }
  const [hh, mm, ss = 0] = parts;
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss, 0);

  // Jika jam target sudah lewat hari ini, jadwalkan untuk besok
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

function preWarmConnection(targetUrl) {
  try {
    const url = new URL(targetUrl);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      agent: keepAliveAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, res => {
      res.resume(); // Discard data
    });
    req.on('error', () => {});
    req.end();
  } catch (e) {}
}

function sendPayload(targetUrl, payloadParams) {
  return new Promise((resolve, reject) => {
    const postData = payloadParams.toString();
    const url = new URL(targetUrl);
    const startTime = process.hrtime.bigint();

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      agent: keepAliveAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number((endTime - startTime) / 1000000n);
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          durationMs,
          bodySnippet: body.substring(0, 300)
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

function runScheduler(config) {
  const targetDate = parseTargetTime(config.targetTime);
  const targetMs = targetDate.getTime();
  const searchParams = new URLSearchParams();

  if (config.pageHistory) searchParams.append('pageHistory', config.pageHistory);
  if (config.fbzx) searchParams.append('fbzx', config.fbzx);
  if (config.fvv) searchParams.append('fvv', config.fvv);

  if (Array.isArray(config.entries)) {
    config.entries.forEach(([k, v]) => searchParams.append(k, v));
  } else if (config.answers && typeof config.answers === 'object') {
    for (const [k, v] of Object.entries(config.answers)) {
      if (Array.isArray(v)) {
        v.forEach(val => searchParams.append(k, val));
      } else {
        searchParams.append(k, v);
      }
    }
  }

  console.log('\n=============================================');
  console.log('   WAR GFORM RUNNER (Google Cloud Shell)    ');
  console.log('=============================================');
  console.log(`URL Target  : ${config.targetUrl}`);
  console.log(`Waktu Target: ${targetDate.toLocaleTimeString()} (${targetDate.toISOString()})`);
  console.log(`Jumlah Data : ${[...searchParams.keys()].length} parameter`);
  console.log('=============================================\n');

  let preWarmed = false;

  const timer = setInterval(() => {
    const now = Date.now();
    const diff = targetMs - now;

    if (diff > 5000) {
      const sec = Math.ceil(diff / 1000);
      process.stdout.write(`\r[STANDBY] Menunggu target... sisa ${sec} detik   `);
    } else if (diff > 0) {
      if (!preWarmed) {
        preWarmed = true;
        preWarmConnection(config.targetUrl);
      }
      process.stdout.write(`\r[PREPARED] Socket siap! Sisa ${(diff / 1000).toFixed(2)} detik...   `);
    } else {
      clearInterval(timer);
      console.log(`\n\n[🚀 BLAST] Waktu tiba! Mengirim form payload...`);

      sendPayload(config.targetUrl, searchParams)
        .then(result => {
          console.log(`\n[✅ SELESAI] Status: HTTP ${result.statusCode} (Respons dalam ${result.durationMs}ms)`);
          if (result.statusCode >= 200 && result.statusCode < 400) {
            console.log('Sukses terkirim ke server Google Form!');
          } else {
            console.log('Respons Google:', result.bodySnippet);
          }
          process.exit(0);
        })
        .catch(err => {
          console.error(`\n[❌ GAGAL] Error saat request:`, err.message);
          process.exit(1);
        });
    }
  }, 25);
}

function interactivePrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let configPath = path.join(process.cwd(), 'config.json');

  const configArgIdx = args.indexOf('--config');
  if (configArgIdx !== -1 && args[configArgIdx + 1]) {
    configPath = path.resolve(args[configArgIdx + 1]);
  }

  if (fs.existsSync(configPath)) {
    console.log(`[INFO] Membaca konfigurasi dari: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    runScheduler(config);
    return;
  }

  console.log(`[INFO] File config.json tidak ditemukan.`);
  console.log(`Memulai mode interaktif sederhana...\n`);

  const targetUrl = await interactivePrompt('1. Masukkan URL Form Response (contoh: https://docs.google.com/forms/d/e/.../formResponse): ');
  if (!targetUrl) {
    console.error('URL wajib diisi!');
    process.exit(1);
  }

  const targetTime = await interactivePrompt('2. Masukkan Jam Target Kirim (HH:MM:SS, contoh 08:00:00): ');
  if (!targetTime) {
    console.error('Jam target wajib diisi!');
    process.exit(1);
  }

  const entriesJson = await interactivePrompt('3. Masukkan Payload JSON Jawaban (atau tekan Enter jika kosong): ');
  let answers = {};
  if (entriesJson) {
    try {
      answers = JSON.parse(entriesJson);
    } catch (e) {
      console.error('Format JSON salah, menggunakan dictionary kosong.');
    }
  }

  const config = {
    targetUrl: targetUrl.replace(/\/viewform(\?.*)?$/, '/formResponse'),
    targetTime,
    answers
  };

  runScheduler(config);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = { parseTargetTime, runScheduler, sendPayload };
