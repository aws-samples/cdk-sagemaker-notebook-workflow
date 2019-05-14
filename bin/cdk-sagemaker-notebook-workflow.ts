#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { SageMakerNotebookStopWorkflow } from '../lib/sagemaker-nb-stop-workflow';
import { SageMakerNotebookStartWorkflow } from '../lib/sagemaker-nb-start-workflow';

class CdkSagemakerNotebookWorkflowStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);

    /** set the parameters of the setup */
    this.node.requireContext('notebook_name');
    const notebookName =  this.node.getContext("notebook_name");
    this.node.requireContext('email_address');
    const emailAddress =  this.node.getContext("email_address");
    const stopWorkflowSchedule = this.node.getContext("stop_schedule") || "rate(5 minutes)"
    const startWorkflowSchedule = this.node.getContext("start_schedule") || "rate(5 minutes)";

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
