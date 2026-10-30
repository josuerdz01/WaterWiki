import bcrypt from 'bcryptjs';

// Cost is intentionally fixed. Never lower it to work around hosting CPU limits.
const COST=12;
const dummyHash='$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
export function validPassword(value) {
  return typeof value==='string' && value.length>=10 && new TextEncoder().encode(value).length<=72;
}
export const hashPassword=value=>bcrypt.hash(value,COST);
export const checkPassword=(value,hash)=>bcrypt.compare(value,hash || dummyHash);
