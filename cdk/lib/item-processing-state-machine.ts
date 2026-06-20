import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib/core";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import path from "path";

interface ItemProcessingStateMachineProps {
  dataTable: ITable;
}

export class ItemProcessingStateMachine extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: ItemProcessingStateMachineProps) {
    super(scope, id);

    const { dataTable } = props;
    const environment = { TABLE_NAME: dataTable.tableName };

    const validateItemLambda = new NodejsFunction(this, "SfnValidateItem", {
      handler: "handler",
      environment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/step-functions/validate/index.ts"),
    });

    const processItemLambda = new NodejsFunction(this, "SfnProcessItem", {
      handler: "handler",
      environment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/step-functions/process/index.ts"),
    });

    const storeItemLambda = new NodejsFunction(this, "SfnStoreItem", {
      handler: "handler",
      environment,
      bundling: { externalModules: ["aws-sdk"] },
      entry: path.join(__dirname, "../../src/step-functions/store/index.ts"),
    });
    dataTable.grantWriteData(storeItemLambda);

    const validationFailed = new sfn.Fail(this, "ValidationFailed", {
      error: "ValidationFailed",
      cause: "Input failed schema validation",
    });

    const processingFailed = new sfn.Fail(this, "ProcessingFailed", {
      error: "ProcessingFailed",
      cause: "Item processing step encountered an unrecoverable error",
    });

    const storeFailed = new sfn.Fail(this, "StoreFailed", {
      error: "StoreFailed",
      cause: "DynamoDB store step encountered an unrecoverable error",
    });

    const validateTask = new tasks.LambdaInvoke(this, "ValidateItemTask", {
      lambdaFunction: validateItemLambda,
      outputPath: "$.Payload",
    });
    validateTask.addCatch(validationFailed);

    const processTask = new tasks.LambdaInvoke(this, "ProcessItemTask", {
      lambdaFunction: processItemLambda,
      outputPath: "$.Payload",
    });
    processTask.addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(2), backoffRate: 2 });
    processTask.addCatch(processingFailed);

    const storeTask = new tasks.LambdaInvoke(this, "StoreItemTask", {
      lambdaFunction: storeItemLambda,
      outputPath: "$.Payload",
    });
    storeTask.addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(2), backoffRate: 2 });
    storeTask.addCatch(storeFailed);

    const definition = sfn.Chain.start(validateTask)
      .next(processTask)
      .next(storeTask)
      .next(new sfn.Succeed(this, "WorkflowSucceeded"));

    this.stateMachine = new sfn.StateMachine(this, "StateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      tracingEnabled: true,
    });
  }
}
