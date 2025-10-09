export function determineYoutubeSection() {
  const { href } = window.location;

  if (href.includes('/watch?')) return 'watch';
  if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) return 'channel';
  if (href.includes('/feed/subscriptions')) return 'subscriptions';
  if (href.includes('/feed/trending')) return 'trending';
  if (href.includes('/playlist?')) return 'playlist';

  return 'misc';
}
