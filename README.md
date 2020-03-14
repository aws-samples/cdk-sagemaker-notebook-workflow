# CDK SageMaker Notebook workflow

The following project is a CDK construct that allows you to setup a project to send email notifications to stop/start SageMaker notebook instances to avoid incurring unnecessary costs.

## Architecture

The following diagram shows the architecture of the solution. The workflow uses a combination of the following services:

* **[CloudWatch Events](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/WhatIsCloudWatchEvents.html)** that schedule recurring daily events to kick off the workflow.
* **[Step Functions](https://aws.amazon.com/step-functions/)** to manage the workflow.
* **[Simple Email Service (SES)](https://aws.amazon.com/ses/)** to send the email nofication.
* **[API Gateway](https://aws.amazon.com/api-gateway/)** to receive the confirmation or rejection of the stop/start action from the user in the email message.

![Screenshot](img/architecture.png)

## Prerequisites

In order to use this library you need to have the following software installed:

* **AWS CLI**. For setup instructions click [here](https://docs.aws.amazon.com/cli/latest/userguide/installing.html).
* **AWS account**. To setup an AWS account goto [this](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/) page for details.
* **node.js**. For setup checkout the following [page](https://nodejs.org/).

## Setup instructions

Follow the set of instructions below to setup the CDK. There are a couple of key steps

### Setup CDK

We need to first install the AWS CDK Toolkit. The toolkit is a command-line utility which allows you to work with CDK apps.

Open a terminal session and run the following command:

* Windows: you’ll need to run this as an Administrator
* POSIX: on some systems you may need to run this with `sudo`

```
npm install -g aws-cdk
```

You can check the toolkit version:

```
cdk --version
```

### Configure Simple Email Service (SES)

Now you need to setup Simple Email Service to verify the email address where you will send notifications to. 

1. Log in to the [AWS console](https://aws.amazon.com/console/) then click on the Simple Email Service link (it should be in your history, otherwise find it in the 'Services' on the left or type *simple email service* in the search bar). 

![Screenshot](img/ses_aws_service.png)

Once on this page, select 'Email Addresses' on the left menu.

![Screenshot](img/ses_menu_item.png)

2. Select the *Verify a New Email Address* button and enter your email address. 

![Screenshot](img/verification_email.png)

3.  Open your email client and click on the email address verification link as per the screenshow below.

![Screenshot](img/email_confirmation.png)

### Install the project

1. Clone this GitHub repo with the following command:

```
git clone https://github.com/mattmcclean/cdk-sagemaker-notebook-workflow.git
```

2. Goto the project directory and build the CDK stack using the following commands:

```
cd cdk-sagemaker-notebook-workflow
npm install
npm run build
```

3. Edit the CDK stack file named `lib/sagemaker-nb-workflow-stack.ts`. Enter the values for your notebook name, email address and cron expressions for the start and stop times as well a confirming if

```
export class SagemakerNotebookWorkflowStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);
    
    // The code that defines your stack goes here
    /** Create the SageMaker notebook instance */
    new SageMakerNotebookWorkflow(this, 'SageMakerNotebookWorkflow', {
        notebookName: "mynotebook", // enter your notebook name here
        emailAddress: "bob@example.com", // enter the email address to get notifications
        startSchedule: "cron(0 9 ? * MON-FRI *)", // enter the start schedule as a cron expression. Defaults to every weekday at 9am Pacific time
        stopSchedule: "cron(0 17 ? * MON-FRI *)", // enter the stop schedule as a cron expression. Defaults to every weekday at 5pm Pacific time
        confirmViaEmail: true, // confirm if you want to receive an email confirmation to start and stop the notebook
      });      
    }
}

4. Build & Deploy the application with the commands:

```
npm run build
cdk deploy
```

