#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { SageMakerNotebookWorkflow } from './sagemaker-notebook-workflow';

export class SagemakerNotebookWorkflowStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);
    
    // The code that defines your stack goes here
    /** Create the SageMaker notebook instance */
    new SageMakerNotebookWorkflow(this, 'SageMakerNotebookWorkflow', {
        notebookName: "",
        emailAddress: "",
        startSchedule: "",
        stopSchedule: "",
        confirmViaEmail: true,
      });      
    }
}
