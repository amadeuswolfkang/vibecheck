import snoowrap from "snoowrap";

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT!,
  clientId: process.env.REDDIT_CLIENT_ID!,
  clientSecret: process.env.REDDIT_CLIENT_SECRET!,
  username: process.env.REDDIT_USERNAME!,
  password: process.env.REDDIT_PASSWORD!,
});

// Return type explicitly defined to avoid circular type reference
export async function fetchRedditComments(
  keyword: string,
  limit = 25
): Promise<string[]> {
  const results = await reddit.search({
    query: keyword,
    sort: "relevance",
    time: "week",
    limit: 5,
  });

  const comments: string[] = [];

  for (const post of results) {
    try {
      const fullPost = await (post as any).expandReplies({ limit: 5, depth: 1 });
      fullPost.comments?.forEach((c: any) => {
        if (c.body) comments.push(c.body);
      });
    } catch (err) {
      console.warn("Error loading comments for post:", post.id);
    }
  }

  return comments;
}
