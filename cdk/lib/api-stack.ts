import {
  ApiKey,
  ApiKeySourceType,
  LambdaIntegration,
  MethodLoggingLevel,
  Period,
  RestApi,
  UsagePlan,
} from "aws-cdk-lib/aws-apigateway";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import path from "path";

interface ApiStackProps extends cdk.StackProps {
  table: ITable;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table } = props;
    const commonEnvironment = { TABLE_NAME: table.tableName };

    const getItemLambda = new NodejsFunction(this, "GetItem", {
      handler: "handler",
      environment: commonEnvironment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/http/items/get/index.ts"),
    });
    table.grantReadData(getItemLambda);

    const postItemLambda = new NodejsFunction(this, "PostItem", {
      handler: "handler",
      environment: commonEnvironment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/http/items/post/index.ts"),
    });
    table.grantWriteData(postItemLambda);

    const updateItemLambda = new NodejsFunction(this, "UpdateItem", {
      handler: "handler",
      environment: commonEnvironment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/http/items/update/index.ts"),
    });
    table.grantReadWriteData(updateItemLambda);

    const restApi = new RestApi(this, "AppApi", {
      restApiName: "AppApi",
      description: "CDK TypeScript Template REST API",
      apiKeySourceType: ApiKeySourceType.HEADER,
      deployOptions: {
        stageName: "prod",
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        dataTraceEnabled: true,
      },
    });

    const apiKey = new ApiKey(this, "AppApiKey", {
      apiKeyName: "AppApiKey",
      description: "Default API key for AppApi",
      enabled: true,
    });

    const usagePlan = new UsagePlan(this, "AppUsagePlan", {
      name: "AppDefaultUsagePlan",
      description: "Default usage plan — adjust throttle and quota for your workload",
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10_000,
        period: Period.DAY,
      },
      apiStages: [
        {
          api: restApi,
          stage: restApi.deploymentStage,
        },
      ],
    });

    usagePlan.addApiKey(apiKey);

    const itemsResource = restApi.root.addResource("items");
    const itemByIdResource = itemsResource.addResource("{id}");

    itemByIdResource.addMethod("GET", new LambdaIntegration(getItemLambda), {
      apiKeyRequired: true,
    });

    itemsResource.addMethod("POST", new LambdaIntegration(postItemLambda), {
      apiKeyRequired: true,
    });

    itemByIdResource.addMethod("PUT", new LambdaIntegration(updateItemLambda), {
      apiKeyRequired: true,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: restApi.url,
      description: "REST API base URL",
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId,
      description: "API Key ID — retrieve value with: aws apigateway get-api-key --api-key <id> --include-value",
    });
  }
}
