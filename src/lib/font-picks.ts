'use client';

/** 「我的选字」— localStorage bag (P0) */

const KEY = 'windfonts.picks.v1';

export type FontPick = {
  id: string;
  normalizedName: string;
  name: string;
  fontFamily: string;
  englishName?: string | null;
};

function read(): FontPick[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: FontPick[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('windfonts-picks-changed'));
}

export function getPicks(): FontPick[] {
  return read();
}

export function isPicked(id: string): boolean {
  return read().some((p) => p.id === id);
}

export function addPick(pick: FontPick) {
  const list = read().filter((p) => p.id !== pick.id);
  list.unshift(pick);
  write(list.slice(0, 48));
}

export function removePick(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function togglePick(pick: FontPick): boolean {
  if (isPicked(pick.id)) {
    removePick(pick.id);
    return false;
  }
  addPick(pick);
  return true;
}

export function picksCount(): number {
  return read().length;
}
