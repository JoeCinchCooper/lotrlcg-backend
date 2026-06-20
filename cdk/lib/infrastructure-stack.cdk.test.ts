import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { InfrastructureStack } from "./infrastructure-stack";

describe("InfrastructureStack", () => {
  let template: Template;

  beforeEach(() => {
    const app = new App();
    const stack = new InfrastructureStack(app, "TestInfraStack");
    template = Template.fromStack(stack);
  });

  it("creates a DynamoDB table with id partition key and PAY_PER_REQUEST billing", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "AppDataTable",
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    });
  });

  it("creates a DynamoDB table with point-in-time recovery enabled", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  it("creates an S3 bucket with versioning enabled", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      VersioningConfiguration: { Status: "Enabled" },
    });
  });

  it("creates an S3 bucket with AES256 server-side encryption", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
          }),
        ]),
      }),
    });
  });

  it("creates an S3 bucket with all public access blocked", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("creates an S3 bucket with server access logs prefix", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      LoggingConfiguration: Match.objectLike({
        LogFilePrefix: "access-logs/",
      }),
    });
  });

  it("outputs the S3 bucket name", () => {
    template.hasOutput("DataBucketName", {});
  });
});
