import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib/core";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import path from "path";

interface BlogApiStackProps extends cdk.StackProps {
  table: ITable;
  bucket: s3.IBucket;
}

export class BlogApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BlogApiStackProps) {
    super(scope, id, props);

    const { table, bucket } = props;

    const lambdalith = new NodejsFunction(this, "BlogLambda", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/lambda.ts"),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        ADMIN_SECRET: process.env.ADMIN_SECRET ?? "change-me",
        AUTHOR_ID: process.env.AUTHOR_ID ?? "default-author",
      },
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(29),
      memorySize: 256,
    });

    table.grantReadWriteData(lambdalith);
    bucket.grantPut(lambdalith, "media/*");
    bucket.grantRead(lambdalith, "media/*");

    // HTTP API v2 using L1 constructs (stable)
    const httpApi = new apigwv2.CfnApi(this, "BlogHttpApi", {
      name: "BlogApi",
      protocolType: "HTTP",
      corsConfiguration: {
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowOrigins: ["*"],
      },
    });

    const integration = new apigwv2.CfnIntegration(this, "LambdaIntegration", {
      apiId: httpApi.ref,
      integrationType: "AWS_PROXY",
      integrationUri: lambdalith.functionArn,
      payloadFormatVersion: "2.0",
    });

    new apigwv2.CfnRoute(this, "DefaultRoute", {
      apiId: httpApi.ref,
      routeKey: "$default",
      target: `integrations/${integration.ref}`,
    });

    new apigwv2.CfnStage(this, "DefaultStage", {
      apiId: httpApi.ref,
      stageName: "$default",
      autoDeploy: true,
    });

    // Grant API Gateway permission to invoke the Lambda
    lambdalith.addPermission("ApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.ref}/*/*`,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: `https://${httpApi.ref}.execute-api.${this.region}.amazonaws.com`,
      description: "HTTP API v2 base URL",
    });
  }
}
