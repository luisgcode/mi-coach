// Chat transcript shared by phone and PC: one doc per message (chat/{date}/m/{id}); the model gets only the last turns.
const assert = require('assert');
const C = require('../calc.js');

// Paths are valid doc paths for the docs table (even segment count, allowed characters) and ids sort by time.
const PATH_RE = /^[A-Za-z0-9_.~:@+-]+(\/[A-Za-z0-9_.~:@+-]+)+$/; // from supabase/migrations/0001_init.sql
const id1 = C.chatMsgId(Date.parse('2026-11-08T18:00:00Z'), 'ab12cd'), id2 = C.chatMsgId(Date.parse('2026-11-08T18:00:01Z'), 'zz');
const p1 = C.chatMsgPath('2026-11-08', id1);
assert.ok(PATH_RE.test(p1), p1);
assert.strictEqual(p1.split('/').length % 2, 0, 'a document path, not a collection');
assert.strictEqual(p1.split('/').slice(0, -1).join('/'), 'chat/2026-11-08/m', 'collection the app subscribes to');
assert.ok(id1 < id2, 'ids sort chronologically');
assert.ok(PATH_RE.test(C.chatMsgPath('2026-11-08', 'card-2026-11-09-a')));
assert.ok(PATH_RE.test(C.chatMsgPath('2026-11-08', C.chatMsgId(Date.now(), 'x/../y'))), 'random part is sanitized');

// Turns: chronological, user first, merged when two of the same role follow each other, tools/cards/resets excluded.
const at = s => `2026-11-08T18:${String(s).padStart(2, '0')}:00.000Z`;
const msgs = [
  { id: 'c', role: 'assistant', text: 'Listo, anoté la sal.', at: at(3) },
  { id: 'a', role: 'user', text: 'Tengo sal de mesa', at: at(1) },
  { id: 'b', role: 'tool', text: '✓ Despensa: +1', at: at(2) },
  { id: 'd', role: 'user', text: '', imgCount: 2, imagePaths: ['u/1.jpg', 'u/2.jpg'], at: at(4) },
  { id: 'e', role: 'user', text: 'y esto también', at: at(5) },
  { id: 'f', role: 'card', sid: '2026-11-08-a', at: at(6) }
];
let t = C.chatTurns(msgs);
assert.deepStrictEqual(t.map(x => x.role), ['user', 'assistant', 'user']);
assert.strictEqual(t[0].content, 'Tengo sal de mesa');
assert.ok(t[2].content.startsWith('Mira la foto.\n[Adjunté 2 foto(s)]'), 'photos become a note, never base64: ' + t[2].content);
assert.ok(t[2].content.endsWith('y esto también'), 'consecutive user turns merged');
assert.ok(!JSON.stringify(t).includes('u/1.jpg'), 'storage paths are not sent to the model');

// "Nueva conversación" (reset) starts a clean context on both devices.
t = C.chatTurns(msgs.concat({ id: 'g', role: 'reset', text: 'Nueva conversación', at: at(7) }, { id: 'h', role: 'user', text: '¿Qué ceno?', at: at(8) }));
assert.deepStrictEqual(t, [{ role: 'user', content: '¿Qué ceno?' }]);

// Only the last ~10 turns, and the window never starts with the assistant.
const long = Array.from({ length: 30 }, (_, i) => ({ id: 'm' + i, role: i % 2 ? 'assistant' : 'user', text: 'msg ' + i, at: `2026-11-08T19:${String(i).padStart(2, '0')}:00.000Z` }));
t = C.chatTurns(long, 10);
assert.ok(t.length <= 10 && t.length >= 9, 'compact: ' + t.length);
assert.strictEqual(t[0].role, 'user');
assert.strictEqual(t[t.length - 1].content, 'msg 29');
assert.deepStrictEqual(C.chatTurns([{ role: 'assistant', text: 'hola', at: at(1) }]), [], 'never starts with the assistant');
assert.deepStrictEqual(C.chatTurns([]), []);

// Messages written by two devices at the same time both survive: different ids, nothing to merge.
const fromPhone = C.chatMsgPath('2026-11-08', C.chatMsgId(1794160000000, 'phone1')), fromPc = C.chatMsgPath('2026-11-08', C.chatMsgId(1794160000000, 'pc0001'));
assert.notStrictEqual(fromPhone, fromPc);
console.log('chat tests ok |', p1);
