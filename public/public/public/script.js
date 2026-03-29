// ---------- simple UI helpers ----------
const hidden = (elem) => elem.classList.add('hidden');
const show = (elem) => elem.classList.remove('hidden');

// ---------- fetch districts ----------
async function loadDistricts() {
  const res = await fetch('/districts.json');
  return await res.json();               // e.g. { "KR": ["naver.com", "daum.net"], "US": [...] }
}

// ---------- test endpoint ----------
async function testLink() {
  const url = document.getElementById('url').value;
  const district = document.getElementById('district').value;
  const blocker = document.getElementById('blocker').value;
  const btn = document.getElementById('testBtn');
  const reset = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');
  const blockedEl = document.getElementById('blocked');
  const rttEl = document.getElementById('rtt');
  const headersEl = document.getElementById('headers');
  const bodyEl = document.getElementById('body');

  btn.disabled = true;
  show(document.getElementById('result'));
  rttEl.textContent = '…';
  statusEl.textContent = 'Pending…';
  blockedEl.textContent = '';
  headersEl.textContent = '';
  bodyEl.textContent = '';

  try {
    const start = Date.now();

    // 1️⃣ GET districts → make sure select options are populated
    const districts = await loadDistricts();

    // 2️⃣ Build the request that may be proxied
    const response = await fetchProxyOrDirect(url, district, blocker, districts);

    const elapsed = Date.now() - start;
    rttEl.textContent = `\${elapsed} ms`;

    // 3️⃣ Analyse status
    const status = response.status;
    statusEl.textContent = `HTTP \${status}`;

    // Some blockers return a 403/451 or a special HTML page that says “blocked”
    let blocked = false;
    const blockedIndicators = [403, 451, 503];
    if (blockedIndicators.includes(status)) blocked = true;
    else {
      const body = await response.text();
      const blockedBody = body.toLowerCase().includes('blocked')
        || body.includes('error')
        || body.includes('forbidden')
        || districts[district]?.some(d => body.includes(d));
      blocked = blockedBody;
    }

    blockedEl.textContent = blocked ? 'Yes (likely blocked)' : 'No';
    headersEl.textContent = response.headers.toString();

    // Show first 500 chars of body (sanitized)
    const snippet = response.text().then(t => {
      const safe = t.slice(0, 500).replace(/</g, '<').replace(/>/g, '>');
      bodyEl.textContent = safe;
    });

    // Wait for snippet before resetting
    await snippet;
  } catch (e) {
    statusEl.textContent = 'Error';
    blockedEl.textContent = 'Unknown';
    bodyEl.textContent = `Exception: \${e}`;
  } finally {
    btn.disabled = false;
    hidden(document.getElementById('result'));
  }
}

// ---------- proxy or direct ----------
async function fetchProxyOrDirect(url, district, blocker, districts) {
  // If blocker = "Custom Blocklist", just do a direct request and compare with blocklist
  if (blocker === 'Custom Blocklist') {
    return fetch(url); // direct
  }

  // Try to get a public proxy that reports the requested country.
  // Example API: https://api.proxy-service.com/get?country={district}
  // For simplicity we use a dummy – replace with your own proxy service.
  const proxy = await getProxyByCountry(district);
  if (!proxy) {
    console.warn('No proxy for', district);
    return fetch(url);
  }

  // Use the proxy URL as the target (HTTPS only for safety)
  const proxyUrl = new URL(proxy);
  // NOTE: Some public proxies only accept GET; we keep it simple.
  return fetch(proxyUrl.toString() + url, { method: proxyUrl.origin === url.origin ? 'GET' : undefined });
}

// Dummy proxy fetch – replace with a real service
async function getProxyByCountry(countryCode) {
  // Example response: {"proxy": "https://proxy-eu.example.com"}
  const res = await fetch(`https://api.proxy-service.com/get?country=\${countryCode}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.proxy ?? null;
}

// ---------- UI wiring ----------
document.getElementById('testBtn').addEventListener('click', testLink);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('result').classList.add('hidden');
  document.getElementById('url').value = '';
  document.getElementById('district').value = 'global';
  document.getElementById('blocker').value = 'None';
});
