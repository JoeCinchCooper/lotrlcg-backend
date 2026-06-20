# Blog Backend — Claude Code Conventions

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

## Project layout

```
src/
  app.ts          Hono app — mounts all routers
  lambda.ts       Lambda entrypoint (handle(app))
  routes/         One Hono router per resource group
  dal/            DynamoDB access patterns (single-table)
  middleware/     Hono middleware (auth, etc.)
  schema/         zod request schemas
cdk/
  bin/app.ts      CDK app entry
  lib/            CDK stacks
```

## Naming conventions

- Functions / variables: `camelCase`
- Classes / types / interfaces: `PascalCase`
- Filenames: `kebab-case`
- DynamoDB key prefixes: `ENTITY_TYPE#id` (e.g. `POST#abc`, `USER#xyz`)

## DynamoDB single-table key schema

Table `BlogTable` — keys: `PK` (partition), `SK` (sort).

| Entity | PK | SK |
|---|---|---|
| Post meta | `POST#<id>` | `META` |
| Comment | `POST#<postId>` | `COMMENT#<iso-ts>#<cid>` |
| Author | `USER#<id>` | `PROFILE` |
| Tag membership | `TAG#<tag>` | `POST#<publishedAt>#<id>` |

GSI attribute conventions:

- GSI1 (`GSI1PK` / `GSI1SK`) — author's posts: `USER#<authorId>` / `<publishedAt>`
- GSI2 (`GSI2PK` / `GSI2SK`) — published feed (sparse): `STATUS#PUBLISHED` / `<publishedAt>`
- GSI3 (`GSI3PK` / `GSI3SK`) — by slug: `SLUG#<slug>` / `META`

GSI2 attributes are written **only on published posts** to keep the index sparse (drafts excluded).

## Auth

Write routes are guarded by a shared bearer token read from `process.env.ADMIN_SECRET`.

**Upgrade path:** replace the middleware body in `src/middleware/auth.ts` with JWT verification and attach an API Gateway authorizer. The `authorId` is currently sourced from `process.env.AUTHOR_ID`; replace with the JWT `sub` claim at that point.

## HTML sanitization

Post and comment bodies are run through `sanitize-html` before any DAL write.
Allowlist: `b strong em a[href] h2 h3 ul ol li p blockquote code pre img[src]`.

## Test patterns

- Unit tests: `aws-sdk-client-mock` for DynamoDB / S3; jest mocks for sanitize-html
- CDK tests: `aws-cdk-lib/assertions` snapshot + fine-grained assertions
- Test files live next to the code they test (`foo.ts` → `foo.test.ts`)
