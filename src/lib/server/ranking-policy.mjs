// The site owner's records remain visible separately, without occupying a rank.
// Compare persistent identities, so nickname or displayed-role changes have no effect.
export const isRankingExcluded = (db, userId) => {
  const user = db.users.find((user) => user.id === userId);
  return Boolean(
    user && (user.id === db.ownerSetup?.ownerId || user.rankingExcluded || user.isTestPlayer),
  );
};
export const separateRankingUsers = (db) =>
  db.users.filter(
    (user) => user.status === 'active' && !user.isTestPlayer && isRankingExcluded(db, user.id),
  );
