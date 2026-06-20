import { v4 as uuidv4 } from "uuid";
import { putAuthor } from "../src/dal/users";
import { createPost } from "../src/dal/posts";
import { addComment } from "../src/dal/comments";
import { Author, Comment, Post } from "../src/dal/types";

async function seed(): Promise<void> {
  const now = new Date().toISOString();
  const authorId = uuidv4();

  const author: Author = {
    id: authorId,
    name: "Bilbo Baggins",
    bio: "Hobbit, adventurer, and blogger from the Shire.",
    createdAt: now,
  };

  await putAuthor(author);
  console.log(`Created author: ${author.name} (${author.id})`);

  const posts: Post[] = [
    {
      id: uuidv4(),
      slug: "there-and-back-again",
      title: "There and Back Again",
      body: "<p>An unexpected journey that changed my life forever.</p>",
      authorId,
      status: "published",
      tags: ["adventure", "dwarves"],
      publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      commentCount: 0,
    },
    {
      id: uuidv4(),
      slug: "on-dragon-smaug",
      title: "On the Nature of Dragons",
      body: "<p>What I learned from my conversation with Smaug.</p>",
      authorId,
      status: "published",
      tags: ["dragons", "adventure"],
      publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      commentCount: 0,
    },
    {
      id: uuidv4(),
      slug: "long-expected-party",
      title: "Planning the Long-Expected Party",
      body: "<p>111 is a grand old age for a birthday party.</p>",
      authorId,
      status: "published",
      tags: ["shire", "parties"],
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      commentCount: 0,
    },
    {
      id: uuidv4(),
      slug: "riddles-in-the-dark",
      title: "Riddles in the Dark (Draft)",
      body: "<p>A game of riddles with a strange creature.</p>",
      authorId,
      status: "draft",
      tags: ["riddles", "gollum"],
      createdAt: now,
      updatedAt: now,
      commentCount: 0,
    },
  ];

  for (const post of posts) {
    await createPost(post);
    console.log(`Created ${post.status} post: "${post.title}" (${post.id})`);
  }

  const publishedPosts = posts.filter((p) => p.status === "published");
  const commentBodies = [
    "Wonderful post, Mr. Baggins!",
    "I never knew hobbits could write so well.",
    "This reminds me of my own travels in the East.",
    "Gandalf recommended this to me.",
    "Most illuminating. I shall share with the Council.",
  ];

  for (let i = 0; i < commentBodies.length; i++) {
    const targetPost = publishedPosts[i % publishedPosts.length];
    const comment: Comment = {
      id: uuidv4(),
      postId: targetPost.id,
      authorName: `Reader ${i + 1}`,
      body: commentBodies[i],
      createdAt: new Date(Date.now() - (4 - i) * 3600000).toISOString(),
    };
    await addComment(comment);
    console.log(`Added comment to "${targetPost.title}": "${comment.body}"`);
  }

  console.log("\nSeed complete: 1 author, 3 published posts, 1 draft, 5 comments.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
