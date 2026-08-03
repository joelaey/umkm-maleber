/**
 * Utility for System Notifications & Web Audio Chime Alerts
 */

/**
 * Synthesizes a pleasant audio chime sound using Web Audio API (zero external mp3 dependency)
 */
export function playNotificationSound(type: 'order' | 'message' | 'alert' = 'order') {
  if (typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';

    if (type === 'order') {
      // Pleasant double chime: E5 to A5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
    } else if (type === 'message') {
      // Soft pop chime: C5 to G5
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
    } else {
      // Alert chime: F5 to C6
      osc.frequency.setValueAtTime(698.46, ctx.currentTime);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio alert sound play failed:', e);
  }
}

/**
 * Requests native system notification permission from browser/OS
 */
export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  return false;
}

/**
 * Triggers native system OS notification on PC & Mobile
 */
export function triggerSystemNotification(title: string, options?: { body?: string; icon?: string; soundType?: 'order' | 'message' | 'alert' }) {
  if (typeof window === 'undefined') return;

  // Play audio alert
  playNotificationSound(options?.soundType || 'order');

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body: options?.body || 'Notifikasi baru dari UMKM Maleber',
      icon: options?.icon || '/globe.svg',
      badge: '/globe.svg',
      vibrate: [200, 100, 200]
    } as any);
  } catch (e) {
    console.warn('Native notification trigger failed:', e);
  }
}
