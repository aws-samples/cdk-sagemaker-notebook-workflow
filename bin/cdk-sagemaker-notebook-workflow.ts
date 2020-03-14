#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SagemakerNotebookWorkflowStack } from '../lib/sagemaker-nb-workflow-stack';

const app = new cdk.App();
new SagemakerNotebookWorkflowStack(app, 'SagemakerNotebookWorkflowStack');
