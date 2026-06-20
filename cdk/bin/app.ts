import * as cdk from "aws-cdk-lib/core";
import { BlogInfraStack } from "../lib/blog-infra-stack";
import { BlogApiStack } from "../lib/blog-api-stack";
import { BlogStreamsStack } from "../lib/blog-streams-stack";

const app = new cdk.App();

const infra = new BlogInfraStack(app, "BlogInfraStack");

new BlogApiStack(app, "BlogApiStack", {
  table: infra.table,
  bucket: infra.bucket,
});

new BlogStreamsStack(app, "BlogStreamsStack", {
  table: infra.table,
});
