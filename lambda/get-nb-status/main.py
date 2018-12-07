import json
import boto3
import sys
import os
from botocore.exceptions import ClientError

print('Loading function')

sagemaker = boto3.client('sagemaker')

def get_notebook_status(name):
    print(f'Calling sagemaker describe notbook instance with name: {name}')
    try:
        response = sagemaker.describe_notebook_instance(NotebookInstanceName=name)
        return response['NotebookInstanceStatus']
    except ClientError as e:
        if e.response['Error']['Message'] == 'RecordNotFound':
            return "NotFound"
        else:
            raise e
        
def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    print("Get notebook name from input event")
    nb_name = event['NotebookName']
    status = get_notebook_status(nb_name)
    print(f'Notebook status is {status}')
    response = {}
    response['status'] = status
    return status