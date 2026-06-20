import * as cdk from "aws-cdk-lib/core";
import { Template, Match } from "aws-cdk-lib/assertions";
import { BlogInfraStack } from "../lib/blog-infra-stack";
import { BlogApiStack } from "../lib/blog-api-stack";

describe("BlogApiStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const infra = new BlogInfraStack(app, "BlogInfraStack");
    const stack = new BlogApiStack(app, "BlogApiStack", {
      table: infra.table,
      bucket: infra.bucket,
    });
    template = Template.fromStack(stack);
  });

  it("creates a Lambda function on Node.js 20", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs20.x",
    });
  });

  it("creates HTTP API v2", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      Name: "BlogApi",
      ProtocolType: "HTTP",
    });
  });

  it("creates a default route", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
    });
  });

  it("creates a default stage with auto-deploy", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      StageName: "$default",
      AutoDeploy: true,
    });
  });

  it("sets required environment variables on Lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          TABLE_NAME: Match.anyValue(),
          BUCKET_NAME: Match.anyValue(),
        },
      },
    });
  });

  it("matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
