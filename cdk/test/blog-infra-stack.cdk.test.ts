import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import { BlogInfraStack } from "../lib/blog-infra-stack";

describe("BlogInfraStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new BlogInfraStack(app, "BlogInfraStack");
    template = Template.fromStack(stack);
  });

  it("creates DynamoDB table with correct key schema", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "BlogTable",
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  it("enables DynamoDB streams", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      StreamSpecification: { StreamViewType: "NEW_AND_OLD_IMAGES" },
    });
  });

  it("has three GSIs", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: [
        { IndexName: "GSI1" },
        { IndexName: "GSI2" },
        { IndexName: "GSI3" },
      ],
    });
  });

  it("enables PITR", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  it("creates S3 bucket with public access blocked", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
