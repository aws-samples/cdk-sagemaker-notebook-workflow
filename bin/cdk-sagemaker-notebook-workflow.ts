#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { SageMakerNotebookStopWorkflow } from './sagemaker-nb-stop-workflow';
import { SageMakerNotebookStartWorkflow } from './sagemaker-nb-start-workflow';

class CdkSagemakerNotebookWorkflowStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    /** set the parameters of the setup */
    const notebookName =  this.getContext("notebook_name");
    const emailAddress =  this.getContext("email_address");
    const stopWorkflowSchedule = this.getContext("stop_schedule") || "rate(5 minutes)"
    const startWorkflowSchedule = this.getContext("start_schedule") || "rate(5 minutes)";

    /** Create the SageMaker stop notebook workflow */
    new SageMakerNotebookStopWorkflow(this, 'MySageMakerStopNotebookWorkflow', {
      notebookName: notebookName,
      emailAddress: emailAddress,
      scheduleExpression: stopWorkflowSchedule
    });    

    /** Create the SageMaker start notebook workflow */
    new SageMakerNotebookStartWorkflow(this, 'MySageMakerStartNotebookWorkflow', {
      notebookName: notebookName,
      emailAddress: emailAddress,
      scheduleExpression: startWorkflowSchedule
    });        
  }
}

const app = new cdk.App();
new CdkSagemakerNotebookWorkflowStack(app, 'CdkSagemakerNotebookWorkflowStack');
app.run();
