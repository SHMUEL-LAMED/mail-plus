// Designed HTML email templates inserted into the Gmail draft.
// Gmail keeps only inline styles, so every rule is inline and the layout uses tables.

export const THEMES = {
  royal:    {name: 'כחול מלכותי',  primary: '#1e3a8a', accent: '#60a5fa', soft: '#eef2ff', border: '#c7d2fe', ink: '#1f2937', muted: '#64748b'},
  emerald:  {name: 'ירוק אמרלד',   primary: '#065f46', accent: '#34d399', soft: '#ecfdf5', border: '#a7f3d0', ink: '#1f2937', muted: '#64748b'},
  gold:     {name: 'זהב חגיגי',    primary: '#78350f', accent: '#f59e0b', soft: '#fffbeb', border: '#fde68a', ink: '#292524', muted: '#78716c'},
  burgundy: {name: 'בורדו אלגנטי', primary: '#7f1d1d', accent: '#f87171', soft: '#fef2f2', border: '#fecaca', ink: '#1f2937', muted: '#6b7280'},
  ocean:    {name: 'טורקיז ים',    primary: '#155e75', accent: '#22d3ee', soft: '#ecfeff', border: '#a5f3fc', ink: '#1f2937', muted: '#64748b'},
  slate:    {name: 'אפור מינימלי', primary: '#1f2937', accent: '#9ca3af', soft: '#f3f4f6', border: '#e5e7eb', ink: '#111827', muted: '#6b7280'},
};
export const DEFAULT_THEME = 'royal';

export const PRESETS = {
  free:     {name: 'כתיבה חופשית',  title: '',              body: ''},
  ack:      {name: 'אישור קבלה',    title: 'אישור קבלה',    body: 'שלום,\n\nקיבלתי את ההודעה, תודה.\nאבדוק את הפרטים ואחזור אליך בהקדם.'},
  followup: {name: 'מעקב',          title: 'המשך לפנייה',    body: 'שלום,\n\nרציתי לבדוק אם יש עדכון בנוגע להודעה הקודמת.\nאשמח לתשובה כשיתאפשר.'},
  thanks:   {name: 'תודה',          title: 'תודה רבה',      body: 'שלום,\n\nרציתי להודות לך מקרב לב על העזרה ועל היחס.\nזה מאוד מוערך.'},
  meeting:  {name: 'תיאום פגישה',   title: 'תיאום פגישה',   body: 'שלום,\n\nאשמח לקבוע פגישה בנושא.\nאנא עדכן אותי אילו מועדים נוחים לך.'},
  update:   {name: 'עדכון',         title: 'עדכון',         body: 'שלום,\n\nרציתי לעדכן ש'},
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FONT = "Arial,'Segoe UI',Tahoma,Helvetica,sans-serif";

export function themeOf(key) { return THEMES[key] ? key : DEFAULT_THEME; }
export function presetOf(key) { return PRESETS[key] ? key : 'free'; }

function paragraphs(text, t) {
  const blocks = String(text || '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(Boolean);
  if (!blocks.length) return `<p style="margin:0 0 14px;color:${t.ink};">&nbsp;</p>`;
  return blocks.map(b => `<p style="margin:0 0 14px;color:${t.ink};font-size:15px;line-height:1.8;">${b.split('\n').map(esc).join('<br>')}</p>`).join('');
}

/**
 * Build the designed email body.
 * @param {{theme?:string,title?:string,body?:string,signature?:string,role?:string,bh?:boolean}} o
 */
export function buildEmailHtml(o = {}) {
  const t = THEMES[themeOf(o.theme)];
  const title = String(o.title || '').trim().slice(0, 120);
  const signature = String(o.signature || '').trim().slice(0, 120);
  const role = String(o.role || '').trim().slice(0, 160);
  const bh = o.bh ? `<div style="font-size:12px;line-height:1;color:#ffffff;opacity:.85;margin:0 0 14px;text-align:right;">ב״ה</div>` : '';
  const header = title || bh ? `
  <tr><td bgcolor="${t.primary}" style="background-color:${t.primary};padding:26px 32px 22px;text-align:right;direction:rtl;font-family:${FONT};">
    ${bh}${title ? `<div style="font-size:22px;line-height:1.35;font-weight:bold;color:#ffffff;margin:0;">${esc(title)}</div>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr><td bgcolor="${t.accent}" style="background-color:${t.accent};width:56px;height:3px;line-height:3px;font-size:0;border-radius:2px;">&nbsp;</td></tr></table>
  </td></tr>` : `
  <tr><td bgcolor="${t.primary}" style="background-color:${t.primary};height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`;
  const sig = signature ? `
  <tr><td style="padding:4px 32px 28px;direction:rtl;font-family:${FONT};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-right:3px solid ${t.accent};padding:2px 14px 2px 0;text-align:right;">
        <div style="font-size:14px;color:${t.muted};line-height:1.6;">בברכה,</div>
        <div style="font-size:16px;font-weight:bold;color:${t.primary};line-height:1.6;">${esc(signature)}</div>
        ${role ? `<div style="font-size:13px;color:${t.muted};line-height:1.6;">${esc(role)}</div>` : ''}
      </td></tr></table>
  </td></tr>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.soft}" style="background-color:${t.soft};direction:rtl;font-family:${FONT};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid ${t.border};border-radius:14px;border-collapse:separate;overflow:hidden;">${header}
  <tr><td style="padding:28px 32px 10px;text-align:right;direction:rtl;font-family:${FONT};">${paragraphs(o.body, t)}</td></tr>${sig}
  <tr><td bgcolor="${t.soft}" style="background-color:${t.soft};border-top:1px solid ${t.border};height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
</table></td></tr></table><p dir="rtl" style="margin:0;">&nbsp;</p>`;
}

/** Public gallery page with sample text only (no user data). */
export function previewPage() {
  const cards = Object.entries(THEMES).map(([key, t]) => `<section><h2>${esc(t.name)}</h2>${buildEmailHtml({theme: key, title: 'כותרת לדוגמה', body: 'שלום,\n\nזהו טקסט לדוגמה שמראה איך ייראה המייל בתבנית הזאת.\nאפשר לערוך את הכול בטיוטה לפני השליחה.', signature: 'השם שלך', role: 'תפקיד / ארגון', bh: true})}</section>`).join('');
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>תבניות מייל פלוס</title>
<style>body{margin:0;padding:24px 16px;background:#f8fafc;font-family:${FONT};color:#1f2937}h1{text-align:center;font-size:24px;margin:0 0 6px}p.lead{text-align:center;color:#64748b;margin:0 0 28px}main{max-width:720px;margin:0 auto}section{margin:0 0 36px}h2{font-size:16px;margin:0 0 10px;color:#334155}</style></head>
<body><main><h1>תבניות העיצוב של מייל פלוס</h1><p class="lead">בוחרים תבנית בחלון הכתיבה של Gmail, והיא נכנסת לטיוטה מוכנה לעריכה.</p>${cards}</main></body></html>`;
}
