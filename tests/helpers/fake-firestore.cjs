const clone = value => Array.isArray(value) ? value.map(clone) : value && Object.getPrototypeOf(value) === Object.prototype ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, clone(v)])) : value;
class Timestamp { constructor(ms) { this.ms = ms; } toMillis() { return this.ms; } static now() { return new Timestamp(Date.now()); } static fromMillis(ms) { return new Timestamp(ms); } }
const FieldValue = { delete: () => ({ _delete: true }) };
class FakeFirestore {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); this.queue = Promise.resolve(); }
  snapshot(path) { return { id: path.split('/').pop(), exists: this.data.has(path), data: () => clone(this.data.get(path)) }; }
  write(ref, value, merge) {
    const record = merge ? { ...(this.data.get(ref.path) ?? {}) } : {};
    for (const [key, val] of Object.entries(value)) { if (val?._delete) delete record[key]; else record[key] = clone(val); }
    this.data.set(ref.path, record);
  }
  collection(name) {
    const db = this;
    const query = (field, value, count = Infinity) => ({
      limit: n => query(field, value, n),
      get: async () => {
        const docs = [...db.data.keys()].filter(p => p.startsWith(name + '/') && (!field || db.data.get(p)?.[field] === value)).slice(0, count).map(p => db.snapshot(p));
        return { docs, empty: !docs.length };
      },
    });
    return { ...query(), where: (field, op, value) => { if (op !== '==') throw Error('Unsupported fake query'); return query(field, value); },
      doc: id => {
        const ref = { path: name + '/' + id, id, get: async () => db.snapshot(ref.path), set: async (v,o) => db.write(ref,v,o?.merge), update: async v => db.write(ref,v,true) }; return ref;
      },
    };
  }
  runTransaction(callback) {
    const work = this.queue.then(async () => {
      const writes = [];
      const get = async ref => { if (writes.length) throw Error('Firestore reads must precede writes'); return this.snapshot(ref.path); };
      const value = await callback({ get, getAll: (...refs) => Promise.all(refs.map(get)), set: (r,v,o) => writes.push([r,v,o?.merge]), update: (r,v) => writes.push([r,v,true]) });
      writes.forEach(([r,v,m]) => this.write(r,v,m)); return value;
    });
    this.queue = work.catch(() => {});
    return work;
  }
}
module.exports = { FakeFirestore, Timestamp, FieldValue };
