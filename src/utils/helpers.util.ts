import * as argon from 'argon2';

export async function hashPassword(passwordString: string) {
  return await argon.hash(passwordString);
}

export const getLastNDaysDate = (days: number): Date => {
  const now = new Date();
  const nDaysAgo = new Date(now);
  nDaysAgo.setDate(now.getDate() - days);

  return nDaysAgo;
};