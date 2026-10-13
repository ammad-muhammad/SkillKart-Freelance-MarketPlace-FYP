/**
 * Auth user objects may use `id` (login JSON) or `_id` (Mongo lean docs).
 */
export const getUserId = (user) => {
  if (!user) return null;
  const id = user.id ?? user._id;
  return id != null ? String(id) : null;
};

export const normalizeAuthUser = (user) => {
  if (!user) return null;
  const id = getUserId(user);
  if (!id) return user;
  return { ...user, id, _id: id };
};
