import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { InfrastructureStack } from "./infrastructure-stack";
import { StateMachineStack } from "./state-machine-stack";

describe("StateMachineStack", () => {
  let template: Template;

  beforeEach(() => {
    const app = new App();
    const infraStack = new InfrastructureStack(app, "TestInfraStack");
    const sfnStack = new StateMachineStack(app, "TestSfnStack", { table: infraStack.table });
    template = Template.fromStack(sfnStack);
  });

  it("creates a Standard type state machine", () => {
    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineType: "STANDARD",
    });
  });

  it("enables X-Ray tracing on the state machine", () => {
    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      TracingConfiguration: { Enabled: true },
    });
  });

  it("creates exactly one state machine", () => {
    template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
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

  it("outputs the state machine ARN", () => {
    template.hasOutput("StateMachineArn", {});
  });
});
