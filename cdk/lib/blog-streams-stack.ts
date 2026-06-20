import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import path from "path";

interface BlogStreamsStackProps extends cdk.StackProps {
  table: ITable;
}

export class BlogStreamsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BlogStreamsStackProps) {
    super(scope, id, props);

    const { table } = props;

    const consumer = new NodejsFunction(this, "StreamsConsumer", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/streams/commentCount.ts"),
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 128,
    });

    table.grantReadWriteData(consumer);

    consumer.addEventSource(
      new DynamoEventSource(table, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 100,
        bisectBatchOnError: true,
        retryAttempts: 2,
        filters: [
          {
            pattern: JSON.stringify({
              dynamodb: { Keys: { SK: { S: [{ prefix: "COMMENT#" }] } } },
              eventName: ["INSERT", "REMOVE"],
            }),
          },
        ],
      })
    );
  }
}
