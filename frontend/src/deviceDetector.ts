export interface ClientOriginMetadata {
  dispositivo: string;
  navegador: string;
}

/**
 * Detecta automáticamente el dispositivo/sistema operativo y el navegador web
 * del visitante a partir de `navigator.userAgent`.
 */
export function detectClientOrigin(): ClientOriginMetadata {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const maxTouchPoints =
    typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;

  let dispositivo = 'Desconocido';
  if (/Windows Phone/i.test(ua)) {
    dispositivo = 'Windows Phone';
  } else if (/Android/i.test(ua)) {
    dispositivo = 'Android';
  } else if (/iPhone/i.test(ua)) {
    dispositivo = 'iPhone / iOS';
  } else if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) {
    dispositivo = 'iPad / iOS';
  } else if (/iPod/i.test(ua)) {
    dispositivo = 'iPod / iOS';
  } else if (/CrOS/i.test(ua)) {
    dispositivo = 'ChromeOS';
  } else if (/Windows/i.test(ua)) {
    dispositivo = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    dispositivo = 'Mac';
  } else if (/Linux/i.test(ua)) {
    dispositivo = 'Linux';
  }

  let navegador = 'Otro';
  const navWithBrave = navigator as Navigator & { brave?: { isBrave?: unknown } };

  if (/WhatsApp/i.test(ua)) {
    navegador = 'WhatsApp Browser';
  } else if (/FBAN|FBAV/i.test(ua)) {
    navegador = 'Facebook Browser';
  } else if (/Instagram/i.test(ua)) {
    navegador = 'Instagram Browser';
  } else if (/EdgA|EdgiOS|Edg\//i.test(ua)) {
    navegador = 'Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    navegador = 'Opera';
  } else if (/SamsungBrowser/i.test(ua)) {
    navegador = 'Samsung Internet';
  } else if (/UCBrowser/i.test(ua)) {
    navegador = 'UC Browser';
  } else if (navWithBrave?.brave || /Brave/i.test(ua)) {
    navegador = 'Brave';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    navegador = 'Firefox';
  } else if (/CriOS|Chrome/i.test(ua)) {
    navegador = 'Chrome';
  } else if (/Safari/i.test(ua)) {
    navegador = 'Safari';
  } else if (/MSIE|Trident/i.test(ua)) {
    navegador = 'Internet Explorer';
  }

  return { dispositivo, navegador };
}
