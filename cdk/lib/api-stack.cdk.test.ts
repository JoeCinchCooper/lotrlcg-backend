import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { InfrastructureStack } from "./infrastructure-stack";
import { ApiStack } from "./api-stack";

describe("ApiStack", () => {
  let template: Template;

  beforeEach(() => {
    const app = new App();
    const infraStack = new InfrastructureStack(app, "TestInfraStack");
    const apiStack = new ApiStack(app, "TestApiStack", { table: infraStack.table });
    template = Template.fromStack(apiStack);
  });

  it("creates a REST API named AppApi", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "AppApi",
    });
  });

  it("creates a prod stage with logging and metrics enabled", () => {
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      StageName: "prod",
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          MetricsEnabled: true,
          LoggingLevel: "INFO",
          DataTraceEnabled: true,
        }),
      ]),
    });
  });

  it("creates an API key and usage plan", () => {
    template.resourceCountIs("AWS::ApiGateway::ApiKey", 1);
    template.resourceCountIs("AWS::ApiGateway::UsagePlan", 1);
    template.resourceCountIs("AWS::ApiGateway::UsagePlanKey", 1);
  });

  it("creates exactly three Lambda functions with TABLE_NAME environment variable", () => {
    const lambdas = template.findResources("AWS::Lambda::Function", {
      Properties: {
        Environment: {
          Variables: {
            TABLE_NAME: Match.anyValue(),
          },
        },
      },
    });
    expect(Object.keys(lambdas)).toHaveLength(3);
  });

  it("requires API key on GET, POST, and PUT methods", () => {
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      ApiKeyRequired: true,
    });
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "POST",
      ApiKeyRequired: true,
    });
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "PUT",
      ApiKeyRequired: true,
    });
  });

  it("integrates methods with Lambda via AWS_PROXY", () => {
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      Integration: Match.objectLike({
        Type: "AWS_PROXY",
        IntegrationHttpMethod: "POST",
      }),
    });
  });

  it("outputs ApiEndpoint and ApiKeyId", () => {
    template.hasOutput("ApiEndpoint", {});
    template.hasOutput("ApiKeyId", {});
  });
});
