const https = require('https');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

    const req = lib.request(options, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url);
        const redirectLib = redirectUrl.protocol === 'https:' ? https : http;
        const redirectOptions = {
          hostname: redirectUrl.hostname,
          path: redirectUrl.pathname + redirectUrl.search,
          method: 'GET',
        };
        const redirectReq = redirectLib.request(redirectOptions, redirectRes => {
          let redirectData = '';
          redirectRes.on('data', chunk => { redirectData += chunk; });
          redirectRes.on('end', () => {
            try {
              resolve(JSON.parse(redirectData));
            } catch {
              resolve(redirectData);
            }
          });
        });
        redirectReq.on('error', reject);
        redirectReq.end();
        return;
      }

      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function saveAppointment({ name, phone, service, date, time }) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url || url === 'your_google_apps_script_url_here') {
    console.error('APPS_SCRIPT_URL not configured in .env');
    return null;
  }
  try {
    console.log(`Saving appointment: ${name} - ${service} on ${date} at ${time}`);
    const result = await makeRequest(url, 'POST', { name, phone, service, date, time });
    console.log('Apps Script response:', JSON.stringify(result));
    if (result && result.success) {
      console.log(`Appointment saved successfully: ${name} - ${service} on ${date} at ${time}`);
      return result;
    } else {
      console.error('Failed to save appointment:', result?.error || 'unknown error');
      return null;
    }
  } catch (err) {
    console.error('Failed to save appointment:', err.message);
    return null;
  }
}

async function getAllAppointments() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url || url === 'your_google_apps_script_url_here') return [];
  try {
    const result = await makeRequest(url, 'GET');
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

module.exports = { saveAppointment, getAllAppointments };
