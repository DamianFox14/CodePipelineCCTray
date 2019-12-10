const builder = require('xmlbuilder');
const AWS = require('aws-sdk');
const config = require('../config');

if (config.credentials.secretAccessKey && config.credentials.accessKey) {
  AWS.config.update({region: 'eu-west-1',
    accessKeyId: config.credentials.accessKey,
    secretAccessKey: config.credentials.secretAccessKey});
} else {
  AWS.config.update({region: 'eu-west-1'});
}

const codepipeline = new AWS.CodePipeline();

const INTERVAL = 30000;
let count = 0;

let projectList = [];
let cloudwatchInstances = [];
initialiseCloudWatch();
setProjectList();

/**
 * gets all the relevant information for the cc.xml
 * @return {Promise<string>}
 */
async function setProjectList() {
  const newProjectList = [];
  if (config.showStages) {
    const pipelineList = await codepipeline.listPipelines({}).promise();
    for (let i = 0; i < pipelineList.pipelines.length; i++) {
      try {
        const data = await codepipeline.getPipelineState({'name': pipelineList.pipelines[i].name}).promise();
        const name = data.pipelineName;
        const stages = data.stageStates;
        const execData = await codepipeline.listPipelineExecutions({pipelineName: name}).promise();
        for (let j = 0; j < stages.length; j++) {
          try {
            let status = 'Failed';
            if (stages[j].latestExecution !== undefined && stages[j].latestExecution.status !== undefined) {
              status = stages[j].latestExecution.status;
            }
            newProjectList.push(createProject(status, name + '-' + stages[j].stageName,
                execData.pipelineExecutionSummaries[0].lastUpdateTime));
          } catch (err) {
            console.log('Error adding stage '+name+' status: '+JSON.stringify(err));
            newProjectList.push(createProject('Failed', name + '-' + stages[j].stageName,
                execData.pipelineExecutionSummaries[0].lastUpdateTime));
          }
        }
      } catch (err) {
        console.log('Error adding stage '+name+' status: '+JSON.stringify(err));
      }
    }
  }

  if (config.showAlarms) {
    await cloudwatchInstances.forEach(async function(entry) {
      const alarms = await entry.instance.describeAlarms().promise();
      for (let i = 0; i < alarms.MetricAlarms.length; i++) {
        const alarmName = alarms.MetricAlarms[i].AlarmName;
        const alarmState = alarms.MetricAlarms[i].StateValue;
        const alarmDate = alarms.MetricAlarms[i].StateUpdatedTimestamp;
        if (entry.alarmName=== '*' || entry.alarmName===alarmName) {
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
  try {
    count++;
    if ((count*INTERVAL) > 3600000) {
      initialiseCloudWatch();
    }

    return setProjectList();
  } catch (err) {
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
  } catch (err) {
    console.log(err);
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
  const newCloudwatchInstances = [];
  await config.alarmsAccounts.forEach(async function(entry) {
    const alarmName = entry.alarmName? entry.alarmName : '*';
    if (entry.accountArn) {
      const sts = new AWS.STS();
      const result = await sts.assumeRole({
        RoleArn: entry.accountArn,
        DurationSeconds: 900,
        RoleSessionName: 'testRunner',
      }).promise();

      const credentials = {
        accessKeyId: result.Credentials.AccessKeyId,
        secretAccessKey: result.Credentials.SecretAccessKey,
        sessionToken: result.Credentials.SessionToken,
      };

      newCloudwatchInstances.push(
          {
            'instance': new AWS.CloudWatch({
              region: 'eu-west-1', apiVersion: '2015-03-31',
              credentials: credentials,
            }),
            'alarmName': alarmName,
          });
    } else {
      newCloudwatchInstances.push(
          {
            'instance': new AWS.CloudWatch({
              region: 'eu-west-1', apiVersion: '2015-03-31',
            }),
            'alarmName': alarmName,
          });
    }
  });
  cloudwatchInstances = newCloudwatchInstances;
}
