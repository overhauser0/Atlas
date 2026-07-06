// OSからデバイス名を自動推測するヘルパー
export const getAutoDeviceName = () => {
  if (typeof navigator === 'undefined') return 'Unknown Web';
  const ua = navigator.userAgent;
  if (
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
    return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Mac OS/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Android/i.test(ua)) return 'Android';
  return 'Web Browser';
};
