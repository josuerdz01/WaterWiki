import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createAuthStore} from './store.mjs';
export async function localAuthStore(directory) {
  mkdirSync(directory, {recursive:true});
  const db = new DatabaseSync(join(directory, 'auth.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const store=await createAuthStore({
    prepare(sql) {
      const statement = db.prepare(sql);
      const bound = args => ({
        run:async () => statement.run(...args),
        all:async () => ({results:statement.all(...args)}),
        first:async () => statement.get(...args) ?? null,
      });
      return {...bound([]), bind:(...args) => bound(args)};
    },
  });
  return {...store,close:()=>db.close()};
}
