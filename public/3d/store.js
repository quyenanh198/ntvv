// Trạng thái phía client: catalog (luật, tải một lần) + me (trạng thái người chơi, do server trả).
import { api } from './net.js';

export const store = { catalog: null, catalogVersion: null, me: null, family: [], events: [], listeners: new Set() };

const emit = () => store.listeners.forEach((fn) => fn(store));
export const subscribe = (fn) => { store.listeners.add(fn); return () => store.listeners.delete(fn); };

// Catalog đổi hiếm (khi deploy). Trình duyệt giữ bản này theo ETag; ?v= ép bỏ cache khi phiên bản đổi.
async function loadCatalog(version) {
  store.catalog = await api(version ? `/catalog?v=${version}` : '/catalog');
  store.catalogVersion = version || null;
}

export async function refresh() {
  const state = await api('/state?slim=1');
  if (!store.catalog || (state.catalogVersion && state.catalogVersion !== store.catalogVersion)) {
    await loadCatalog(state.catalogVersion);
    store.catalogVersion = state.catalogVersion;
  }
  store.me = state.me;
  store.family = state.family || [];
  store.events = state.events || [];
  emit();
  return state;
}

// Mọi POST trả { me }: thay nguyên trạng thái, không bao giờ tự cộng vàng/EXP ở client.
export async function act(path, body) {
  const out = await api(path, body ?? {});
  if (out?.me) { store.me = out.me; emit(); }
  return out;
}
