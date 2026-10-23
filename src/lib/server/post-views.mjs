export const viewWindowMs = 30 * 60 * 1000;

// Keep repeat requests (including React's development effects) from inflating views.
export function recordPostView(post, viewerId, timestamp = Date.now()) {
  const recent = (post.viewReceipts || []).filter(
    (receipt) => timestamp - receipt.at < viewWindowMs,
  );
  if (!recent.some((receipt) => receipt.viewerId === viewerId)) {
    post.views = (Number.isSafeInteger(post.views) && post.views >= 0 ? post.views : 0) + 1;
    recent.push({ viewerId, at: timestamp });
  }
  post.viewReceipts = recent;
  return post.views;
}
