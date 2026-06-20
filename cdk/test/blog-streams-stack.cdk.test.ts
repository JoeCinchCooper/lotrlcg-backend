import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import { BlogInfraStack } from "../lib/blog-infra-stack";
import { BlogStreamsStack } from "../lib/blog-streams-stack";

describe("BlogStreamsStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const infra = new BlogInfraStack(app, "BlogInfraStack");
    const stack = new BlogStreamsStack(app, "BlogStreamsStack", {
      table: infra.table,
    });
    template = Template.fromStack(stack);
  });

  it("creates the streams consumer Lambda on Node.js 20", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs20.x",
    });
  });

  it("creates a DynamoDB event source mapping", () => {
    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      StartingPosition: "LATEST",
      BatchSize: 100,
      BisectBatchOnFunctionError: true,
    });
  });

  it("matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
