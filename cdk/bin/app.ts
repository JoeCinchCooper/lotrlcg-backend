import * as cdk from "aws-cdk-lib/core";
import { InfrastructureStack } from "../lib/infrastructure-stack";
import { ApiStack } from "../lib/api-stack";
import { StateMachineStack } from "../lib/state-machine-stack";

const app = new cdk.App();

const infraStack = new InfrastructureStack(app, "InfrastructureStack");

new ApiStack(app, "ApiStack", {
  table: infraStack.table,
});

new StateMachineStack(app, "StateMachineStack", {
  table: infraStack.table,
});
