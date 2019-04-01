const builder = require('xmlbuilder');
const AWS = require('aws-sdk');
AWS.config.update({region:'eu-west-1'});

const config = require('../config');
const codepipeline = new AWS.CodePipeline();

const INTERVAL = 30000;
let count = 0;

let projectList = [];
let cloudwatchInstances = [];
initialiseCloudWatch();
setProjectList();

async function setProjectList(){
  let newProjectList = [];
  if(config.showStages !== 'false') {
    const pipelineList = await codepipeline.listPipelines({}).promise();
    for (let i = 0; i < pipelineList.pipelines.length; i++) {
      const data = await codepipeline.getPipelineState({'name': pipelineList.pipelines[i].name}).promise();
      const name = data.pipelineName;
      const stages = data.stageStates;
      const execData = await codepipeline.listPipelineExecutions({pipelineName: name}).promise();
      for (let j = 0; j < stages.length; j++) {
        newProjectList.push(createProject(stages[j].latestExecution.status, name + '-' + stages[j].stageName,
          execData.pipelineExecutionSummaries[0].lastUpdateTime));
      }
    }
  }

  if(config.showAlarms !== 'false') {
    await cloudwatchInstances.forEach(async function(entry) {
      let alarms = await entry.instance.describeAlarms().promise();
      for (let i = 0; i < alarms.MetricAlarms.length; i++) {
        let alarmName = alarms.MetricAlarms[i].AlarmName;
        let alarmState = alarms.MetricAlarms[i].StateValue;
        let alarmDate = alarms.MetricAlarms[i].StateUpdatedTimestamp;
        if(entry.alarmName=== '*' || entry.alarmName===alarmName) {
          if (alarmState === 'ALARM') {
            newProjectList.push(createProject('Failed', alarmName, alarmDate));
          } else if (alarmState === 'INSUFFICIENT_DATA') {
            newProjectList.push(createProject('InProgress', alarmName, alarmDate));
          } else {
            newProjectList.push(createProject('Succeeded', alarmName, alarmDate));
          }
        }
      }
    });
  }



  projectList = newProjectList;
  return Promise.resolve('ok');
}


setInterval(async function() {
  console.log("start "+new Date())
  try {
    count++;
    if((count*INTERVAL) > 3600000) {
      initialiseCloudWatch();
    }

    return setProjectList();
  } catch(err) {
    console.log(err);
  }

}, INTERVAL);

/**
 * A restify function that will return the xml file created from the current AWS CodePipeline state.
 *
 * @param {Object} req - the request incoming from restify.
 * @param {Object} res - the response to send to the client.
 * @param {Object} next - pass on to the next part of the chain.
 * @return {Promise<void>}
 */
exports.getCCxml = async function(req, res, next) {
  try {
    const ccFile = {
      Projects: {
        Project: await createCCProjectList(),
      },
    };
    const xml = builder.create(ccFile);
    res.sendRaw(200, xml.end(), {'Content-Type': 'application/xml'});
  } catch(err) {
    console.log(err)
  }
  res.end();
  next();
};


/**
 * create a project to the current project list.
 *
 * @param {string} state - AWS state to transform into ccTray state.
 * @param {string} name - Name of the project.
 * @param {date} lastBuildTime - The time of the last build from the build history.
 * @return {{"@name": *, "@webUrl": string, "@activity": string, "@lastBuildTime": string, "@lastBuildStatus": string}}
 */
function createProject(state, name, lastBuildTime) {
  let activity = 'Sleeping';
  let currentState = 'Success';

  switch (state) {
    case 'Succeeded':
      activity = 'Sleeping';
      currentState = 'Success';
      break;
    case 'InProgress':
      activity = 'Building';
      currentState = 'Success';
      break;
    case 'Failed':
      activity = 'Sleeping';
      currentState = 'Failure';
      break;
  }

  const project = {
    '@activity': activity,
    '@lastBuildStatus': currentState,
    '@webUrl': '',
    '@name': name,
    '@lastBuildTime': lastBuildTime.toISOString(),
  };
  return project;
}


/**
 * Creates the list of projects in ccTray format.
 *
 * @return {Promise<Array>} list of projects
 */
async function createCCProjectList() {

  return projectList;
}

/**
 * Initialise STS the list of projects in ccTray format.
 *
 * @return {Promise<Array>} list of projects
 */
async function initialiseCloudWatch() {
  let newCloudwatchInstances = [];
  await config.alarmsAccounts.forEach(async function(entry) {
    alarmName = entry.alarmName? entry.alarmName : '*';
    if (entry.accountArn) {
      const sts = new AWS.STS();
      let result = await sts.assumeRole({
        RoleArn: entry.accountArn,
        DurationSeconds: 900,
        RoleSessionName: 'testRunner'
      }).promise();

      const credentials = {
        accessKeyId: result.Credentials.AccessKeyId,
        secretAccessKey: result.Credentials.SecretAccessKey,
        sessionToken: result.Credentials.SessionToken
      };

      newCloudwatchInstances.push(
        {
          "instance": new AWS.CloudWatch({
            region: 'eu-west-1', apiVersion: '2015-03-31',
            credentials: credentials
          }),
          "alarmName": alarmName
        });

    } else {
      newCloudwatchInstances.push(
        {
          "instance": new AWS.CloudWatch({
            region: 'eu-west-1', apiVersion: '2015-03-31'
          }),
          "alarmName": alarmName
        });
    }
  });
  cloudwatchInstances = newCloudwatchInstances;
}
