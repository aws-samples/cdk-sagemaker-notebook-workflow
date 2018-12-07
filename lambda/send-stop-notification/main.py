import json
import boto3
import os
import urllib

print('Loading function')

stepfunctions = boto3.client('stepfunctions')
ses = boto3.client('ses')

def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))

    print("Get email address & activity arn from input event")
    nb_name = event['NotebookName']
    print(f'Notebook name is {nb_name}')    
    email_address = event['EmailAddress']
    print(f'Email address is {email_address}')
    activity_arn = os.environ.get('STEPFUNCTION_ACTIVITY_ARN')
    print(f'Activity ARN: {activity_arn}')
    api_gw_uri = os.environ.get('API_GW_URI')
    print(f'API GW URI: {api_gw_uri}')

    print('Get activity task')
    response = stepfunctions.get_activity_task(activityArn=activity_arn)
    print("Got response")
    print(response)

    task_token = response['taskToken']
    print(f'Task token is {task_token}')

    email_dest = { 'ToAddresses': [ email_address ] }
    email_body = ('Hi,<br/><br/>'
                 'Your notebook instance named "' + nb_name + '" is still running an incurring costs. We would recommend stopping it if not being used.<br/><br/>'
                 'To stop your instance confirm <a href="' + api_gw_uri + '/succeed?taskToken=' + urllib.parse.quote(task_token) + '">here</a><br/><br/>'
                 'Else to keep it running click here <a href="' + api_gw_uri + '/fail?taskToken=' + urllib.parse.quote(task_token) + '">here</a>.')
    email_msg = { 
        'Subject': { 
            'Data': 'Confirm shutdown of SageMaker Notebook: ' + nb_name, 
            'Charset': 'UTF-8' 
        },
        'Body': { 
                'Html': {
                    'Data': email_body,
                    'Charset': 'UTF-8'   
                }    
        }
    }

    print("Sending email with body")
    print(email_body)
    response = ses.send_email(Destination=email_dest, Message=email_msg, ReplyToAddresses=[email_address], Source=email_address)
    print(response)
    result = {}
    result['result'] = 'Success'
    return result