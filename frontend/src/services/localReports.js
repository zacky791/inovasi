const STORAGE_KEY = 'smart_city_reports';
export const REPORTS_UPDATED_EVENT = 'smart-city-reports-updated';

export function getLocalReports() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addLocalReport(report) {
  const reports = getLocalReports();
  reports.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  window.dispatchEvent(new CustomEvent(REPORTS_UPDATED_EVENT));
  return report;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to process image'));
    };

    img.src = objectUrl;
  });
}

// Kuala Lumpur — used when GPS is unavailable in demo mode
export const DEMO_LOCATION = {
  latitude: 3.139003,
  longitude: 101.686855,
};

const DEMO_ISSUES = [
  {
    issue_type: 'Pothole',
    severity: 'High',
    description: 'Large pothole detected on the road surface.',
    confidence: 92,
  },
  {
    issue_type: 'Broken Pavement',
    severity: 'Medium',
    description: 'Cracked pavement on pedestrian walkway.',
    confidence: 88,
  },
  {
    issue_type: 'Broken Streetlight',
    severity: 'Medium',
    description: 'Streetlight appears damaged or non-functional.',
    confidence: 85,
  },
  {
    issue_type: 'Overflowing Trash Bin',
    severity: 'Low',
    description: 'Public trash bin is overflowing.',
    confidence: 90,
  },
  {
    issue_type: 'Blocked Drain',
    severity: 'High',
    description: 'Drain appears blocked with debris.',
    confidence: 87,
  },
  {
    issue_type: 'Graffiti',
    severity: 'Low',
    description: 'Graffiti found on public infrastructure.',
    confidence: 94,
  },
  {
    issue_type: 'Fallen Tree',
    severity: 'High',
    description: 'Tree or branch blocking the pathway.',
    confidence: 91,
  },
];

export function createLocalReport({ imageDataUrl, latitude, longitude }) {
  const issue = DEMO_ISSUES[Math.floor(Math.random() * DEMO_ISSUES.length)];

  return {
    id: Date.now(),
    image_url: imageDataUrl,
    latitude,
    longitude,
    issue_type: issue.issue_type,
    severity: issue.severity,
    description: issue.description,
    confidence: issue.confidence,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}

export const HIGHLIGHT_REPORT_KEY = 'highlight_report_id';

export function setHighlightReportId(id) {
  sessionStorage.setItem(HIGHLIGHT_REPORT_KEY, String(id));
}

export function getHighlightReportId() {
  const id = sessionStorage.getItem(HIGHLIGHT_REPORT_KEY);
  sessionStorage.removeItem(HIGHLIGHT_REPORT_KEY);
  return id ? Number(id) : null;
}

function createPlaceholderImage(label, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
      <rect fill="${color}" width="320" height="200"/>
      <text x="160" y="95" text-anchor="middle" fill="#ffffff" font-size="18" font-family="Arial, sans-serif">${label}</text>
      <text x="160" y="120" text-anchor="middle" fill="#eeeeee" font-size="12" font-family="Arial, sans-serif">Demo report photo</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

const DUMMY_REPORTS = [
  {
    id: 2001,
    image_url: createPlaceholderImage('KLCC', '#1565c0'),
    latitude: 3.157952,
    longitude: 101.711861,
    issue_type: 'Pothole',
    severity: 'High',
    description: 'Large pothole near KLCC pedestrian crossing on Jalan Pinang.',
    confidence: 94,
    status: 'pending',
    created_at: '2026-07-02T08:00:00.000Z',
  },
  {
    id: 2002,
    image_url: createPlaceholderImage('Bukit Bintang', '#6a1b9a'),
    latitude: 3.146642,
    longitude: 101.710022,
    issue_type: 'Broken Pavement',
    severity: 'Medium',
    description: 'Cracked tiles on walkway along Bukit Bintang shopping district.',
    confidence: 89,
    status: 'pending',
    created_at: '2026-07-02T08:15:00.000Z',
  },
  {
    id: 2003,
    image_url: createPlaceholderImage('Petaling Street', '#c62828'),
    latitude: 3.144045,
    longitude: 101.696891,
    issue_type: 'Overflowing Trash Bin',
    severity: 'Low',
    description: 'Public bin overflowing near Petaling Street market entrance.',
    confidence: 91,
    status: 'pending',
    created_at: '2026-07-02T08:30:00.000Z',
  },
  {
    id: 2004,
    image_url: createPlaceholderImage('Bangsar', '#2e7d32'),
    latitude: 3.128035,
    longitude: 101.674028,
    issue_type: 'Broken Streetlight',
    severity: 'Medium',
    description: 'Streetlight not working along Jalan Telawi, Bangsar.',
    confidence: 86,
    status: 'pending',
    created_at: '2026-07-02T09:00:00.000Z',
  },
  {
    id: 2005,
    image_url: createPlaceholderImage('Damansara', '#ef6c00'),
    latitude: 3.135742,
    longitude: 101.618412,
    issue_type: 'Blocked Drain',
    severity: 'High',
    description: 'Blocked drain causing flooding on road in Damansara Utama.',
    confidence: 92,
    status: 'pending',
    created_at: '2026-07-02T09:20:00.000Z',
  },
  {
    id: 2006,
    image_url: createPlaceholderImage('Petaling Jaya', '#00838f'),
    latitude: 3.117466,
    longitude: 101.623638,
    issue_type: 'Pothole',
    severity: 'High',
    description: 'Deep pothole on Jalan SS2/72, Petaling Jaya.',
    confidence: 93,
    status: 'pending',
    created_at: '2026-07-02T09:45:00.000Z',
  },
  {
    id: 2007,
    image_url: createPlaceholderImage('Shah Alam', '#ad1457'),
    latitude: 3.073281,
    longitude: 101.518463,
    issue_type: 'Graffiti',
    severity: 'Low',
    description: 'Graffiti on public bus stop wall in Shah Alam Section 14.',
    confidence: 96,
    status: 'pending',
    created_at: '2026-07-02T10:00:00.000Z',
  },
  {
    id: 2008,
    image_url: createPlaceholderImage('Cheras', '#4527a0'),
    latitude: 3.083214,
    longitude: 101.750382,
    issue_type: 'Fallen Tree',
    severity: 'High',
    description: 'Fallen branch blocking lane on Jalan Cheras, Taman Midah.',
    confidence: 90,
    status: 'pending',
    created_at: '2026-07-02T10:15:00.000Z',
  },
  {
    id: 2009,
    image_url: createPlaceholderImage('Ampang', '#558b2f'),
    latitude: 3.150198,
    longitude: 101.766754,
    issue_type: 'Broken Pavement',
    severity: 'Medium',
    description: 'Uneven pavement tiles near Ampang Park LRT station.',
    confidence: 85,
    status: 'pending',
    created_at: '2026-07-02T10:30:00.000Z',
  },
  {
    id: 2010,
    image_url: createPlaceholderImage('Wangsa Maju', '#0277bd'),
    latitude: 3.200412,
    longitude: 101.733621,
    issue_type: 'Pothole',
    severity: 'Medium',
    description: 'Multiple small potholes on Jalan Wangsa Delima, Wangsa Maju.',
    confidence: 88,
    status: 'pending',
    created_at: '2026-07-02T10:45:00.000Z',
  },
  {
    id: 2011,
    image_url: createPlaceholderImage('Setapak', '#f9a825'),
    latitude: 3.195231,
    longitude: 101.710842,
    issue_type: 'Broken Streetlight',
    severity: 'Low',
    description: 'Dim streetlight along main road in Setapak town centre.',
    confidence: 83,
    status: 'pending',
    created_at: '2026-07-02T11:00:00.000Z',
  },
  {
    id: 2012,
    image_url: createPlaceholderImage('Mont Kiara', '#5d4037'),
    latitude: 3.172018,
    longitude: 101.651024,
    issue_type: 'Blocked Drain',
    severity: 'Medium',
    description: 'Drain cover missing near Mont Kiara Solaris walkway.',
    confidence: 87,
    status: 'pending',
    created_at: '2026-07-02T11:15:00.000Z',
  },
  {
    id: 2013,
    image_url: createPlaceholderImage('Sentul', '#1565c0'),
    latitude: 3.186412,
    longitude: 101.690231,
    issue_type: 'Overflowing Trash Bin',
    severity: 'Low',
    description: 'Rubbish bin full near Sentul LRT station exit.',
    confidence: 90,
    status: 'pending',
    created_at: '2026-07-02T11:30:00.000Z',
  },
  {
    id: 2014,
    image_url: createPlaceholderImage('KL Sentral', '#c62828'),
    latitude: 3.134038,
    longitude: 101.686039,
    issue_type: 'Broken Pavement',
    severity: 'High',
    description: 'Damaged pedestrian path outside KL Sentral transport hub.',
    confidence: 91,
    status: 'pending',
    created_at: '2026-07-02T11:45:00.000Z',
  },
  {
    id: 2015,
    image_url: createPlaceholderImage('Brickfields', '#2e7d32'),
    latitude: 3.130512,
    longitude: 101.685421,
    issue_type: 'Graffiti',
    severity: 'Low',
    description: 'Vandalism on public wall along Jalan Tun Sambanthan, Brickfields.',
    confidence: 94,
    status: 'pending',
    created_at: '2026-07-02T12:00:00.000Z',
  },
  {
    id: 2016,
    image_url: createPlaceholderImage('Kepong', '#6a1b9a'),
    latitude: 3.210842,
    longitude: 101.640318,
    issue_type: 'Pothole',
    severity: 'High',
    description: 'Wide pothole on Jalan Kepong, near Metro Prima.',
    confidence: 92,
    status: 'pending',
    created_at: '2026-07-02T12:15:00.000Z',
  },
  {
    id: 2017,
    image_url: createPlaceholderImage('Puchong', '#ef6c00'),
    latitude: 3.010234,
    longitude: 101.620518,
    issue_type: 'Fallen Tree',
    severity: 'Medium',
    description: 'Tree debris on roadside near Puchong Jaya commercial area.',
    confidence: 88,
    status: 'pending',
    created_at: '2026-07-02T12:30:00.000Z',
  },
  {
    id: 2018,
    image_url: createPlaceholderImage('Subang Jaya', '#00838f'),
    latitude: 3.050128,
    longitude: 101.590342,
    issue_type: 'Broken Streetlight',
    severity: 'Medium',
    description: 'Faulty lamp post along Jalan SS15, Subang Jaya.',
    confidence: 84,
    status: 'pending',
    created_at: '2026-07-02T12:45:00.000Z',
  },
  {
    id: 2019,
    image_url: createPlaceholderImage('Batu Caves', '#ad1457'),
    latitude: 3.237942,
    longitude: 101.684032,
    issue_type: 'Blocked Drain',
    severity: 'High',
    description: 'Drain blocked near Batu Caves temple approach road.',
    confidence: 89,
    status: 'pending',
    created_at: '2026-07-02T13:00:00.000Z',
  },
  {
    id: 2020,
    image_url: createPlaceholderImage('Tun Razak', '#4527a0'),
    latitude: 3.170218,
    longitude: 101.700512,
    issue_type: 'Pothole',
    severity: 'Medium',
    description: 'Pothole cluster on Jalan Tun Razak near hospital zone.',
    confidence: 87,
    status: 'pending',
    created_at: '2026-07-02T13:15:00.000Z',
  },
];

const LEGACY_DUMMY_IDS = new Set([
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 10011, 10012,
]);

export function ensureDummyReports() {
  const existing = getLocalReports().filter((r) => !LEGACY_DUMMY_IDS.has(r.id));
  const existingIds = new Set(existing.map((r) => r.id));
  const missing = DUMMY_REPORTS.filter((d) => !existingIds.has(d.id));

  if (missing.length === 0 && existing.length === getLocalReports().length) return;

  const merged = [...existing, ...missing].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent(REPORTS_UPDATED_EVENT));
}
