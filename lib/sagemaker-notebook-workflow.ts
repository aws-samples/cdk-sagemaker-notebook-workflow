#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { SageMakerNotebookStopWorkflow } from './sagemaker-nb-stop-workflow';
import { SageMakerNotebookStartWorkflow } from './sagemaker-nb-start-workflow';

export interface SageMakerNotebookWorkflowProps {

    readonly notebookName: string;

    readonly emailAddress: string;

    readonly stopSchedule?: string;

    readonly startSchedule?: string;

    readonly confirmViaEmail?: boolean;
}

export class SageMakerNotebookWorkflow extends cdk.Construct {

    readonly stopSchedule: string;

    readonly startSchedule: string;

    readonly confirmViaEmail: boolean;

    constructor(parent: cdk.Construct, id: string, props: SageMakerNotebookWorkflowProps) {
        super(parent, id);

        /**
         * Set the start schedule if found in props else set to start every day at 9am Pacific time
         */
        this.startSchedule = props.startSchedule ? props.startSchedule : "cron(0 17 ? * MON-FRI *)";

        /**
         * Set the stop schedule to the props value else set default to stop at 5pm Pacific time
         */
        this.stopSchedule = props.stopSchedule ? props.stopSchedule : "cron(0 1 ? * TUE-SAT *";

        /**
         * Set the confim by email param
         */
        this.confirmViaEmail = props.confirmViaEmail ? true : false;

        /** Create the SageMaker stop notebook workflow */
        new SageMakerNotebookStopWorkflow(this, 'MySageMakerStopNotebookWorkflow', {
            notebookName: props.notebookName,
            emailAddress: props.emailAddress,
            scheduleExpression: this.stopSchedule,
            confirmViaEmail: this.confirmViaEmail,
        });    
        
        /** Create the SageMaker start notebook workflow  */
        new SageMakerNotebookStartWorkflow(this, 'MySageMakerStartNotebookWorkflow', {
            notebookName: props.notebookName,
            emailAddress: props.emailAddress,
            scheduleExpression: this.startSchedule,
            confirmViaEmail: this.confirmViaEmail,
        });          
    }

}