# LOTR LCG Blog Backend

Serverless blog backend built on AWS CDK (TypeScript). Single Lambda lambdalith using [Hono](https://hono.dev/) behind HTTP API v2, with DynamoDB single-table design and S3 media uploads.

## Architecture

```
HTTP API v2 (API Gateway)
    └── BlogLambda (Node.js 20, Hono router)
            ├── DynamoDB BlogTable  (single-table, 3 GSIs)
            └── S3 MediaBucket     (presigned PUT uploads)

DynamoDB Streams
    └── StreamsConsumer Lambda (commentCount aggregation)
```

**Stacks:**

| Stack | Contents |
|---|---|
| `BlogInfraStack` | DynamoDB table + S3 bucket |
| `BlogApiStack` | Lambda lambdalith + HTTP API v2 |
| `BlogStreamsStack` | Streams consumer Lambda |

## API

All write endpoints require `Authorization: Bearer <ADMIN_SECRET>`.

### Posts

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/posts` | — | Published feed (paginated, drafts excluded) |
| `GET` | `/posts?slug=<slug>` | — | Get post by slug |
| `GET` | `/posts?tag=<tag>` | — | Posts by tag |
| `POST` | `/posts` | required | Create post |
| `GET` | `/posts/:id` | — | Get post + comments |
| `PUT` | `/posts/:id` | required | Update post |
| `DELETE` | `/posts/:id` | required | Delete post |
| `GET` | `/posts/:id/comments` | — | List comments |
| `POST` | `/posts/:id/comments` | required | Add comment |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:id/posts` | — | Author's posts (paginated) |

### Media

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/media/upload-url` | required | Get presigned S3 PUT URL |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ "status": "ok" }` |

### Pagination

Paginated responses return `{ items: [...], nextCursor: "..." }`. Pass `?cursor=<nextCursor>` to fetch the next page.

### Request bodies

**POST /posts**
```json
{
  "slug": "my-post",
  "title": "My Post",
  "body": "<p>HTML content</p>",
  "status": "draft | published",
  "tags": ["lotr", "cards"]
}
```

**POST /posts/:id/comments**
```json
{
  "authorName": "Gandalf",
  "body": "You shall not pass!"
}
```

**POST /media/upload-url**
```json
{
  "contentType": "image/jpeg | image/png | image/webp | image/gif",
  "filename": "card-art.png"
}
```
Returns `{ "uploadUrl": "https://...", "key": "media/<uuid>.png" }`. PUT directly to `uploadUrl` with the matching `Content-Type` header. URL expires in 5 minutes.

## DynamoDB Key Schema

Table `BlogTable` — keys: `PK` (partition), `SK` (sort).

| Entity | PK | SK |
|---|---|---|
| Post meta | `POST#<id>` | `META` |
| Comment | `POST#<postId>` | `COMMENT#<iso-ts>#<cid>` |
| Author | `USER#<id>` | `PROFILE` |
| Tag membership | `TAG#<tag>` | `POST#<publishedAt>#<id>` |

GSIs:

| GSI | PK | SK | Purpose |
|---|---|---|---|
| GSI1 | `USER#<authorId>` | `<publishedAt>` | Author's posts |
| GSI2 | `STATUS#PUBLISHED` | `<publishedAt>` | Published feed (sparse — drafts excluded) |
| GSI3 | `SLUG#<slug>` | `META` | Lookup by slug |

## Commands

| Task | Command |
|---|---|
| Type-check | `npm run build` |
| All tests | `npm test` |
| Unit tests only | `npm run test:unit` |
| CDK tests only | `npm run test:cdk` |
| Lint | `npm run lint` |
| CDK synth | `npx cdk synth` |
| CDK deploy | `npx cdk deploy --all` |
| Seed data | `npm run seed` |

## Deployment

**Prerequisites:** AWS credentials configured in your terminal.

```bash
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
export AWS_DEFAULT_REGION=us-east-1
```

**Deploy:**

```bash
ADMIN_SECRET=your-secret-here AUTHOR_ID=your-author-id npx cdk deploy --all
```

The API URL is printed as a CloudFormation output (`BlogApiStack.ApiUrl`) after deploy.

**Seed test data:**

```bash
TABLE_NAME=BlogTable npm run seed
```

**Smoke test:**

```bash
ADMIN_SECRET=your-secret API_URL=https://<id>.execute-api.<region>.amazonaws.com bash scripts/smoke.sh
```

## Security Notes

- Post and comment bodies are sanitized with `sanitize-html` before storage. Allowed tags: `b strong em a[href] h2 h3 ul ol li p blockquote code pre img[src]`.
- Auth uses a shared bearer token (`ADMIN_SECRET` env var). To upgrade to JWT: replace the middleware body in [src/middleware/auth.ts](src/middleware/auth.ts) and attach an API Gateway authorizer. Replace `process.env.AUTHOR_ID` with the JWT `sub` claim.
- S3 CORS is open to `*` — tighten `allowedOrigins` in [cdk/lib/blog-infra-stack.ts](cdk/lib/blog-infra-stack.ts) to your frontend domain before production.
