#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import apigw = require('@aws-cdk/aws-apigateway');
import stepfunctions = require('@aws-cdk/aws-stepfunctions');
import events = require('@aws-cdk/aws-events');

export interface SageMakerNotebookStartWorkflowProps {
    /** the name of the SageMaker notebook instance  **/
    notebookName: string;
    /** the email address to send notifications. Must be verified with SNS service **/
    emailAddress: string;
    /** the cron schedule expression for the notification event */
    scheduleExpression: string;
    /** boolean flag to confirm start via email */
    confirmViaEmail: boolean;
}

export class SageMakerNotebookStartWorkflow extends cdk.Construct {

  constructor(parent: cdk.Construct, id: string, props: SageMakerNotebookStartWorkflowProps) {
      super(parent, id);

    /** Create the IAM role with permissions for the Lambda functions */
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]
    });    
    lambdaRole.addToPolicy(new iam.PolicyStatement()
        .addAllResources()
        .addAction('sagemaker:DescribeNotebookInstance')
        .addAction('sagemaker:StartNotebookInstance')
        .addAction('ses:SendEmail')
        .addAction('states:GetActivityTask')
        .addAction('sagemaker:CreatePresignedNotebookInstanceUrl'));

    /** Create the Lambda function that gets the status of the Notebook instance */
    const getNbStatusFunction  = new lambda.Function(this, 'GetNbStatusFunction', {
      runtime: lambda.Runtime.Python36,
      handler: 'main.lambda_handler',
      code: lambda.Code.asset('lambda/get-nb-status'),
      role: lambdaRole,
      timeout: 30
    });    

    /** Create the Lambda function that starts the Notebook instance  */
    const startNbFunction  = new lambda.Function(this, 'StartNbFunction', {
      runtime: lambda.Runtime.Python36,
      handler: 'main.lambda_handler',
      code: lambda.Code.asset('lambda/start-nb-instance'),
      role: lambdaRole,
      timeout: 30      
    });   

    /** Create the Lambda function that generates the presigned url and sends a notification  */
    const generateUrlFunction  = new lambda.Function(this, 'GenerateUrlFunction', {
      runtime: lambda.Runtime.Python36,
      handler: 'main.lambda_handler',
      code: lambda.Code.asset('lambda/send-nb-url-notification'),
      role: lambdaRole,
      timeout: 30      
    });         

    /** Create the IAM role with permissions for the API GW  */
    const apigwRole = new iam.Role(this, 'ApiGwRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicyArns: ["arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"]
    });    

    /** Create the AWS Integration for the /succeed path */
    const successIntegration = new apigw.AwsIntegration({
      service: 'states',
      action: 'SendTaskSuccess',
      options: {
        credentialsRole: apigwRole,
        passthroughBehavior: apigw.PassthroughBehavior.WhenNoTemplates,
        requestTemplates:  {
          "application/json": "{\n   \"output\": \"{ \\\"result\\\": \\\"Confirmed start instance\\\" }\",\n   \"taskToken\": \"$input.params('taskToken')\"\n}"
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: { "application/json": "{\n \"result\": \"Sucessfully confirmed start of SageMaker notebook instance.\"\n }" }
          }
        ]          
      }
    });

    /** Create the AWS Integration for the /fail path */
    const failureIntegration = new apigw.AwsIntegration({
      service: 'states',
      action: 'SendTaskFailure',
      options: {
        credentialsRole: apigwRole,
        passthroughBehavior: apigw.PassthroughBehavior.WhenNoTemplates,
        requestTemplates:  {
          "application/json": "{\n   \"cause\": \"Reject link was clicked.\",\n   \"error\": \"Rejected\",\n   \"taskToken\": \"$input.params('taskToken')\"\n}"
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: { "application/json": "{\n \"result\": \"Sucessfully rejected.\"\n }" }
          }
        ]          
      }
    });

    /** Create the API GW object */
    const api = new apigw.RestApi(this, "confirm-start-api");
    /** Configure the /fail method */
    const failResource = api.root.addResource('fail');
    const failMethod = failResource.addMethod('GET', failureIntegration);
    const failMethodResource = failMethod.node.findChild('Resource') as apigw.CfnMethod;
    failMethodResource.addPropertyOverride("MethodResponses", [  { StatusCode: "200"} ]);
    failMethodResource.addPropertyOverride("RequestParameters", { "method.request.querystring.taskToken": false } );

    /** Configure the /success method */
    const successResource = api.root.addResource('succeed');
    const successMethod = successResource.addMethod('GET', successIntegration);
    const successMethodResource = successMethod.node.findChild('Resource') as apigw.CfnMethod;
    successMethodResource.addPropertyOverride("MethodResponses", [  { StatusCode: "200"} ]);
    successMethodResource.addPropertyOverride("RequestParameters", { "method.request.querystring.taskToken": false } );    

    /** Create the Step Function activities and state machine */
    const manualActivity = new stepfunctions.Activity(this, 'ManualActivity');

    /** Create the Lambda function that starts the Notebook instance  */
    const sendNotificationFunction  = new lambda.Function(this, 'SendNotificationFunction', {
      runtime: lambda.Runtime.Python36,
      handler: 'main.lambda_handler',
      code: lambda.Code.asset('lambda/send-start-notification'),
      role: lambdaRole,
      timeout: 120,
      environment: {
        STEPFUNCTION_ACTIVITY_ARN: manualActivity.activityArn,
        API_GW_URI: 'https://' + api.restApiId + '.execute-api.' + this.node.stack.region + '.amazonaws.com/prod'
      }
    });    

    const getStatusJob1 = new stepfunctions.Task(this, 'Get Status Job #1', {
        resource: getNbStatusFunction,
        // Put Lambda's result here in the execution's state object
        resultPath: '$.NotebookStatus'
    });

    const getStatusJob2 = new stepfunctions.Task(this, 'Get Status Job #2', {
        resource: getNbStatusFunction,
        // Put Lambda's result here in the execution's state object
        resultPath: '$.NotebookStatus'
  });      
    
    const startNotebookJob = new stepfunctions.Task(this, 'Start Notebook Job', {
        resource: startNbFunction,
        resultPath: '$.result'
    });        
    
    const sendNotificationJob = new stepfunctions.Task(this, 'Send Notification Job', {
        resource: sendNotificationFunction,
        // Put Lambda's result here in the execution's state object
        resultPath: '$.SendNotificationStatus',           
        timeoutSeconds: 300
    });    

    const generateUrlandNotifyJob = new stepfunctions.Task(this, 'Generate URL and Send Notification', {
      resource: generateUrlFunction,     
      timeoutSeconds: 30
    });

    const waitStep = new stepfunctions.Wait(this, 'Wait 1 Minute', { duration: stepfunctions.WaitDuration.seconds(60)});
  
    const notStoppedState = new stepfunctions.Succeed(this, 'Notebook not stopped');

    const startSuccessState = new stepfunctions.Succeed(this, 'Notebook started successfully');

    const cancelStartAction = new stepfunctions.Succeed(this, 'Canceled start action');

    const parallel = new stepfunctions.Parallel(this, 'Send notification and run activitiy in parallel');

    const injectParams = new stepfunctions.Pass(this, 'Inject Params', {
        result: {
          NotebookName: props.notebookName,
          EmailAddress: props.emailAddress,            
        }
    });

    const noConfirm = new stepfunctions.Pass(this, 'No Confirm');

    const manualTask = new stepfunctions.Task(this, 'ManualTask', {
      resource: manualActivity,
      resultPath: '$.ManualTaskResult', 
      timeoutSeconds: 3600
    });

    const choiceNotebookRunning = new stepfunctions.Choice(this, 'Notebook Running?');

    const choiceNeedConfirmation = new stepfunctions.Choice(this, 'Need Confirmation?');

    const choiceNotebookStarted = new stepfunctions.Choice(this, 'Notebook Started?');

    const conditionNotebookStopped = stepfunctions.Condition.stringEquals('$.NotebookStatus', 'Stopped');

    const conditionConfirmationNeeded = stepfunctions.Condition.stringEquals('$.Confirm', 'True');

    const conditionNotebookInService = stepfunctions.Condition.stringEquals('$.NotebookStatus', 'InService');

    const definition = getStatusJob1
                        .next(choiceNotebookRunning
                          .when(conditionNotebookStopped, choiceNeedConfirmation
                                .when(conditionConfirmationNeeded, parallel
                                  .branch(sendNotificationJob)
                                  .branch(manualTask)
                                  .addCatch(cancelStartAction))
                                .otherwise(noConfirm)
                                .afterwards()
                          .next(injectParams)
                          .next(startNotebookJob)
                          .next(waitStep)
                          .next(getStatusJob2)
                          .next(choiceNotebookStarted
                              .when(conditionNotebookInService, 
                                  generateUrlandNotifyJob.next(startSuccessState))
                              .otherwise(waitStep))                  
                        )
                        .otherwise(notStoppedState));

    const statemachine = new stepfunctions.StateMachine(this, 'StateMachine', {
        definition: definition,
        timeoutSec: 3900,
        stateMachineName: 'StartNotebookWorkflow'
    });

    /** Create the Scheduled Event Rule */
    const rule = new events.EventRule(this, 'ScheduleRule', {  
      scheduleExpression: props.scheduleExpression
    });      
    rule.addTarget(statemachine, {
      jsonTemplate: JSON.stringify({
        NotebookName: props.notebookName,
        EmailAddress: props.emailAddress,
        Confirm: props.confirmViaEmail ? 'True' : 'False',
      }),
    });      
  }
}