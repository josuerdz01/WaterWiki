import {authSchema} from './schema.mjs';

// The adapter needs prepare().bind().first()/run(), supported by D1 and local.mjs.
export async function createAuthStore(db) {
  for (const sql of authSchema) await db.prepare(sql).run();
  return {
    async markDemoEmail(userId) {
      await db.prepare("INSERT INTO auth_demo_email_checks(user_id,email,checked_at) SELECT id,email,? FROM auth_users WHERE id=? AND provider='email' ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,checked_at=excluded.checked_at").bind(Date.now(),userId).run();
    },
    async saveProfile(userId,name,bio) {
      await db.prepare('INSERT INTO auth_profiles(user_id,display_name,bio) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,bio=excluded.bio').bind(userId,name,bio).run();
    },
    async ownReport(reportId,userId) {
      await db.prepare('INSERT INTO auth_report_owners(report_id,user_id) VALUES(?,?)').bind(reportId,userId).run();
    },
    async reportIds(userId) {
      return (await db.prepare('SELECT report_id FROM auth_report_owners WHERE user_id=?').bind(userId).all()).results.map(row=>row.report_id);
    },
    async credential(email) {
      return db.prepare('SELECT * FROM auth_credentials WHERE email=?').bind(email).first();
    },
    async createCredential(email,userId,name,passwordHash) {
      return !!(await db.prepare('INSERT INTO auth_credentials(email,user_id,name,password_hash) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING email').bind(email,userId,name,passwordHash).first());
    },
    async allow(bucket,limit,windowMs) {
      const now=Date.now();
      await db.prepare('DELETE FROM auth_limits WHERE expires < ?').bind(now).run();
      const row=await db.prepare('INSERT INTO auth_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,now+windowMs).first();
      return row.count<=limit;
    },
    async saveFlow(flow) {
      await db.prepare('DELETE FROM auth_flows WHERE expires < ?').bind(Date.now()).run();
      await db.prepare('INSERT INTO auth_flows(state,binding,provider,nonce,verifier,expires) VALUES(?,?,?,?,?,?)')
        .bind(flow.state, flow.binding, flow.provider, flow.nonce, flow.verifier, flow.expires).run();
    },
    async takeFlow(state, binding, provider) {
      return db.prepare('DELETE FROM auth_flows WHERE state=? AND binding=? AND provider=? RETURNING *').bind(state, binding, provider).first();
    },
    async saveUser(user) {
      await db.prepare("INSERT INTO auth_users(id,provider,name,email) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=CASE WHEN excluded.name='' THEN auth_users.name ELSE excluded.name END,email=COALESCE(excluded.email,auth_users.email)")
        .bind(user.id, user.provider, user.name, user.email).run();
    },
    async saveSession(token, userId, expires) {
      await db.prepare('DELETE FROM auth_sessions WHERE expires < ?').bind(Date.now()).run();
      await db.prepare('INSERT INTO auth_sessions(token,user_id,expires) VALUES(?,?,?)').bind(token, userId, expires).run();
    },
    async session(token) {
      const row = await db.prepare('SELECT u.*,p.display_name,p.bio,d.checked_at AS demo_checked,s.expires FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id LEFT JOIN auth_profiles p ON p.user_id=u.id LEFT JOIN auth_demo_email_checks d ON d.user_id=u.id AND d.email=u.email WHERE s.token=? AND s.expires>?').bind(token, Date.now()).first();
      return row ? {user:{id:row.id, provider:row.provider, name:row.display_name || row.name, bio:row.bio || '', email:row.email,emailVerified:row.provider==='google' && !!row.email,emailDemoVerified:!!row.demo_checked}, expiresAt:new Date(row.expires).toISOString()} : null;
    },
    async logout(token) { await db.prepare('DELETE FROM auth_sessions WHERE token=?').bind(token).run(); },
  };
}
