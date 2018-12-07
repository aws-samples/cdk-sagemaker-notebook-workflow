import json
import boto3
import os
import urllib

print('Loading function')

sagemaker = boto3.client('sagemaker')
ses = boto3.client('ses')

def get_nb_signed_url(nb_name):
    response = sagemaker.create_presigned_notebook_instance_url(NotebookInstanceName=nb_name)
    return response['AuthorizedUrl']

def send_email(email_address, nb_name, presigned_url):
    # construct the email destinations, body and message
    email_dest = { 'ToAddresses': [ email_address ] }
    email_body = ('Hi,<br/><br/>'
                 'Your notebook instance named "' + nb_name + '" is now running.<br/><br/>'
                 'To access your notebook instance click <a href="' + presigned_url + '">here</a>.')
    email_msg = { 
        'Subject': { 
            'Data': 'SageMaker Notebook: ' + nb_name + ' is ready', 
            'Charset': 'UTF-8' 
        },
        'Body': { 
                'Html': {
                    'Data': email_body,
                    'Charset': 'UTF-8'   
                }    
        }
    }
    # send the message using Simple Email Service
    print("Sending email with body")
    print(email_body)
    response = ses.send_email(Destination=email_dest, Message=email_msg, ReplyToAddresses=[email_address], Source=email_address)
    print(response)

def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    print("Get email address & activity arn from input event")
    nb_name = event['NotebookName']
    print(f'Notebook name is {nb_name}')    
    email_address = event['EmailAddress']
    print(f'Email address is {email_address}')
    # get the presigned url
    presigned_url = get_nb_signed_url(nb_name)
    # send the email notification
    send_email(email_address, nb_name, presigned_url)
    result = {}
    result['result'] = 'Success'
    return result