# CodePipelineCCTray [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DamianFox14_CodePipelineCCTray&metric=alert_status)](https://sonarcloud.io/dashboard?id=DamianFox14_CodePipelineCCTray)
This is an application that hosts a cc.xml file in the [CCTray](https://cctray.org/v1) format created from AWS SDK calls to 
[CodePipeline](https://aws.amazon.com/codepipeline/)

My use case for this this application was so that we could use [Nevergreen](https://github.com/build-canaries/nevergreen)
as a build monitor with an AWS code pipeline backend.

This application acts as a middle man between the two application calling out using the sdk to create a cc.xml file that
nevergreen can process and use.

In order to use this application you need to install the AWS CLI on the machine that you are using and configure that
to use the account that the pipelines reside in. Once that is configured start my application.

## Installation
### AWS
Install the AWS CLI as described [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)

Make sure that the user you are CLI'ing as has the following CodePipeline [permissions](https://docs.aws.amazon.com/codepipeline/latest/userguide/permissions-reference.html):
* codepipeline:ListPipelines
* codepipeline:ListPipelineExecutions
* codepipeline:GetPipelineState

### This App
Check out the code and execute the following commands:
* npm install
* npm run start
(You need to ensure this is ran on restart)
Also you need to set the AWS_REGION environment variable to the region you are connecting to.


Once this is completed on http://localhost:8080/cc.xml a file will be hosted which you can use for nevergreen or other tools.

test


