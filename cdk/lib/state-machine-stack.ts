import { ITable } from "aws-cdk-lib/aws-dynamodb";
import * as cdk from "aws-cdk-lib/core";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { ItemProcessingStateMachine } from "./item-processing-state-machine";

interface StateMachineStackProps extends cdk.StackProps {
  table: ITable;
}

export class StateMachineStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: StateMachineStackProps) {
    super(scope, id, props);

    const { stateMachine } = new ItemProcessingStateMachine(this, "ItemProcessingStateMachine", {
      dataTable: props.table,
    });

    this.stateMachine = stateMachine;

    new cdk.CfnOutput(this, "StateMachineArn", {
      value: stateMachine.stateMachineArn,
      description: "Step Functions state machine ARN — start execution with: aws stepfunctions start-execution --state-machine-arn <arn> --input '{\"id\":\"123\",\"type\":\"example\"}'",
    });
  }
}
